# Trip planner API contract

Proposed contract for review. None of these integrations has been deployed.

## Phase 1: GitHub persistence

The personal version calls GitHub directly. These are real GitHub endpoints; later sections describe proposed application endpoints for the connected version.

### GitHub HTTP requests

Base URL: `https://api.github.com`. Angle-bracket values below are placeholders. Response examples show only the fields the app uses.

### Connection check

```http
GET /repos/{owner}/{repo}
Accept: application/vnd.github+json
Authorization: Bearer <user-supplied-token>
X-GitHub-Api-Version: 2026-03-10
```

No request body. A successful response supplies repository identity and its default branch:

```json
{
  "full_name": "example-owner/trip-planner",
  "private": false,
  "default_branch": "main"
}
```

A read succeeds independently of write permission. The UI must not claim write access is verified until a save succeeds. [Repository API](https://docs.github.com/en/rest/repos/repos#get-a-repository)

### Read and save trip data

| Operation | Request | Result |
|---|---|---|
| Read | `GET /repos/{owner}/{repo}/contents/data/trip-planner.json?ref={branch}` | `200`: file metadata, Base64 content, file SHA |
| First save | `PUT /repos/{owner}/{repo}/contents/data/trip-planner.json` | `201`: created file and commit |
| Update | Same `PUT`, including current file SHA | `200`: updated file and commit |
| Remove an activity or trip | Update the JSON, then use the same `PUT` | One document replacement |
| Backup | Same read/write contract in the private repo at `backups/trip-planner.json` | Independent backup file SHA |

File read response:

```json
{
  "type": "file",
  "encoding": "base64",
  "content": "<base64-encoded-UTF-8-JSON>",
  "sha": "<current-file-sha>"
}
```

Save body, with the connection headers plus `Content-Type: application/json`:

```json
{
  "message": "Save trip changes",
  "content": "<base64-encoded-UTF-8-JSON>",
  "sha": "<current-file-sha>",
  "branch": "<configured-branch>"
}
```

Omit `sha` when creating the file. Encode UTF-8 bytes correctly so Korean, Japanese, and emoji round-trip intact. Store the returned file SHA for the next save; it is distinct from the commit SHA.

```json
{
  "content": { "sha": "<new-file-sha>" },
  "commit": { "sha": "<new-commit-sha>" }
}
```

The file contract and write permission come from [GitHub's Contents API](https://docs.github.com/en/rest/repos/contents). Cross-origin browser requests are supported by [GitHub's CORS policy](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests). Pin the API version and review it during upgrades. [API versioning](https://docs.github.com/en/rest/about-the-rest-api/api-versions)

### Browser service contract — not additional HTTP endpoints

| Method | Responsibility |
|---|---|
| `loadLibrary()` | Read and validate the remote document and preserve its revision metadata |
| `createTrip(input)` / `updateTrip(id, changes)` | Validate and update a local draft |
| `upsertItem(tripId, input)` / `removeItem(tripId, itemId)` | Maintain linked itinerary and booking data |
| `saveLibrary(draft, baseSha)` | Commit the complete draft and return confirmed revision information |
| `backupLibrary()` | Copy the last confirmed remote data to the configured private backup |
| `importLibrary(file)` | Validate and preview a replacement as a local draft |

Proposed app-normalized save result:

```json
{
  "ok": true,
  "data": {
    "revisionId": "example-revision",
    "fileSha": "<new-file-sha>",
    "savedAt": "2027-04-01T09:00:00Z"
  }
}
```

Proposed normalized failure, distinct from GitHub's raw body:

```json
{
  "ok": false,
  "error": {
    "code": "REMOTE_CHANGED",
    "message": "A newer version is available. Your draft is preserved.",
    "retryable": false
  }
}
```

Raw HTTP failures are translated into app states:

| Condition | App behavior |
|---|---|
| `401` | Reconnect; retain the draft |
| `403` or `429` | Distinguish missing permission from rate limiting using response details and headers; retry rate-limited work after the required delay |
| `404` | Verify repository/branch/access; never interpret every missing response as permission to create empty replacement data |
| `409` | Reload remote data and open conflict review |
| `422` | Inspect validation details; do not blindly retry or assume every case is a conflict |
| Network timeout or `5xx` | Keep the draft; check whether a save actually landed before retrying |

Handle rate limits and retry timing according to [GitHub's REST best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api) and [troubleshooting guide](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api).


## Phase 1: weather and geographic context

Use destination-local dates and a location's coordinates. Fetch weather independently of trip saves, cache its timestamp, and do not send booking details to the weather service. Future dates outside the provider horizon return an app-level unavailable state.

Example provider request:

```http
GET https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=7
```

GET has no body. Read the provider's `current`, `daily`, and unit fields; normalize them into the app model below. Values are illustrative, not a current forecast:

```json
{
  "cityId": "seoul",
  "timeZone": "Asia/Seoul",
  "forecastForDate": "2026-09-26",
  "fetchedAt": "2026-09-26T09:00:00Z",
  "status": "fresh",
  "current": { "temperatureC": 23, "isDay": true, "weatherCode": 2 },
  "daily": { "maxC": 24, "minC": 17, "rainProbabilityPercent": 20 }
}
```

Use `unavailable`, `stale`, or `offline` states when appropriate; never fill missing forecasts with random values. [Provider schema](https://open-meteo.com/en/docs)

Local/home clocks use `Intl.DateTimeFormat` with IANA time-zone identifiers. They need no time-service HTTP request. Map tiles return images; geolocation is a browser-permission API, not a custom backend route. External directions links are distinct from verified routing data.

## Phase 2: proposed application backend

These are **planned app endpoints**, not existing GitHub endpoints. Suggested deployment: a Supabase Edge Function named `travel-api`, with a router mounted under the function URL and the versioned paths below. Secrets, provider tokens, AI requests, and import processing execute server-side.

### Common contract

Authenticated requests use:

```http
Authorization: Bearer <signed-in-user-access-token>
Content-Type: application/json
Idempotency-Key: <stable-operation-id>
```

`Idempotency-Key` is required on mutations, not reads. Scope it to the authenticated user and operation; retries of the same payload return the stored result, while reuse with a different payload is rejected. Versioned updates and deletes also use `If-Match: "<entity-version>"`. Validate membership on every trip-scoped operation.

Successful reads/updates return `200`, creates return `201`, asynchronous jobs return `202`, and successful deletes return `204` with no body. List endpoints use an opaque cursor and bounded page size. Standard success envelope:

```json
{
  "data": { "id": "example-item", "version": 12 },
  "meta": { "requestId": "example-request", "nextCursor": null }
}
```

Standard failure envelope:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "This item changed elsewhere. Review the newer version.",
    "retryable": false,
    "details": { "expectedVersion": 11, "actualVersion": 12 }
  }
}
```

Status mapping: `400` malformed input; `401` expired/missing identity; `403` insufficient role; `404` missing/inaccessible resource; `409` stale version or idempotency mismatch; `413` upload too large; `415` unsupported type; `422` invalid business fields; `429` rate/cost limit; `503` unavailable provider. Rate-limited responses include retry timing. Do not return secrets or raw provider payloads in user-facing errors.

### Core endpoints

The response type names below refer to the versioned model in the implementation plan. All JSON examples are illustrative.

| Method and path | Request body or query | Success data |
|---|---|---|
| `GET /v1/profile` | None | Profile and preferences |
| `PATCH /v1/profile` | Changed display name, home zone, units, currency | Updated Profile |
| `GET /v1/trips` | `cursor`, `status` | Authorized Trip summaries |
| `POST /v1/trips` | Trip input below | Created Trip |
| `GET /v1/trips/{tripId}` | None | Trip, version, city/day summaries |
| `PATCH /v1/trips/{tripId}` | Name, dates, destinations, archive state | Updated Trip; out-of-range item warnings |
| `DELETE /v1/trips/{tripId}` | None; explicit UI confirmation | `204`; controlled deletion/retention workflow |
| `GET /v1/trips/{tripId}/days` | Optional `from`, `to` dates | Days with trip/city labels |
| `POST /v1/trips/{tripId}/days` | Date, title, cityId, notes | Created Day; duplicate trip/date rejected |
| `GET /v1/days/{dayId}` | None | Day and linked items |
| `PATCH /v1/days/{dayId}` | Title, cityId, notes, date | Updated Day; moving items is explicit |
| `DELETE /v1/days/{dayId}?items=unschedule` | None | `204`; items retained with no day assignment |
| `GET /v1/trips/{tripId}/items` | Category, status, query, cursor | Item summaries |
| `POST /v1/trips/{tripId}/items` | Type-specific Item input | Created Item |
| `GET /v1/items/{itemId}` | None | Complete Item and booking/place references |
| `PATCH /v1/items/{itemId}` | Changed fields | Updated Item |
| `DELETE /v1/items/{itemId}` | None | `204`; tombstone supports sync/undo |
| `POST /v1/items/{itemId}/restore` | None | Restored Item, if retention allows |
| `GET /v1/trips/{tripId}/places` | CityId, neighborhoodId | Saved places with coordinates/source |
| `POST /v1/trips/{tripId}/places` | Name, address, coordinates, cityId, neighborhoodId | Created Place |
| `PATCH /v1/places/{placeId}` | Changed place fields | Updated Place |
| `GET /v1/weather` | CityId, date | WeatherSnapshot or explicit unavailable status |

Trip creation body:

```json
{
  "name": "Korea & Japan",
  "startDate": "2027-05-10",
  "endDate": "2027-05-23",
  "destinations": [
    { "cityId": "seoul", "name": "Seoul", "timeZone": "Asia/Seoul" },
    { "cityId": "tokyo", "name": "Tokyo", "timeZone": "Asia/Tokyo" }
  ]
}
```

Restaurant Item input:

```json
{
  "type": "restaurant",
  "title": "Dinner reservation",
  "dayId": "example-day",
  "cityId": "seoul",
  "neighborhoodId": "ikseon-dong",
  "placeId": "example-place",
  "schedule": { "localDate": "2027-05-12", "startTime": "19:00", "timeZone": "Asia/Seoul" },
  "booking": { "status": "booked", "reference": "DEMO", "provider": "Example restaurant" },
  "websiteUrl": "https://example.com/",
  "notes": "Window table requested."
}
```

The server verifies that every referenced day/place belongs to the same trip. Flight and transport variants use departure and arrival endpoint objects; accommodation uses check-in/checkout; dayless places/notes allow a null day reference. Do not accept mutually conflicting copies of a schedule.

### Booking imports and attachments

| Method and path | Request | Success data |
|---|---|---|
| `POST /v1/attachments/uploads` | TripId, filename, MIME type, byte size | Expiring upload URL, attachmentId |
| `POST /v1/attachments/{id}/complete` | Uploaded checksum | Validated Attachment or processing job |
| `GET /v1/attachments/{id}/download` | None | Short-lived authorized URL |
| `DELETE /v1/attachments/{id}` | None | `204`; remove object/access |
| `POST /v1/booking-imports` | TripId plus pasted text or attachmentId | `202`: import job ID |
| `GET /v1/booking-imports/{id}` | None | Processing state and extracted candidates |
| `POST /v1/booking-imports/{id}/accept` | Reviewed field corrections and target day | Linked Item/Booking IDs |
| `POST /v1/booking-imports/{id}/dismiss` | Optional reason | Dismissed state |
| `POST /v1/integrations/gmail/start` | Allowed redirect location | Authorization URL/state handle |
| `GET /v1/integrations/gmail/callback` | Provider code and verified state | Session-safe redirect, no tokens in URL |
| `POST /v1/integrations/gmail/sync` | Optional incremental cursor | Sync job ID |
| `DELETE /v1/integrations/gmail` | Retention preference | `204`; revoke/stop watch/delete secrets |
| `POST /v1/webhooks/gmail` | Authenticated provider notification | `204` acknowledgment; enqueue job |

Upload defaults: PDF, JPEG, PNG, or EML, proposed maximum 10 MB per file, with server type/size checks. A provided MIME string alone is not proof of type. A returned upload URL is a temporary credential and must not enter the repository or logs.

Import request:

```json
{
  "tripId": "example-trip",
  "source": { "kind": "text", "text": "Example hotel confirmation text." }
}
```

Completed import result:

```json
{
  "data": {
    "id": "example-import",
    "status": "needs-review",
    "candidates": [
      {
        "type": "accommodation",
        "title": "Example Tokyo stay",
        "checkInDate": "2027-05-13",
        "checkOutDate": "2027-05-16",
        "timeZone": "Asia/Tokyo",
        "reference": "DEMO-HOTEL",
        "uncertainFields": ["checkInTime"],
        "duplicateOf": null,
        "sourceId": "example-source"
      }
    ]
  }
}
```

No automatic acceptance of uncertain dates or times. Enforce uniqueness by provider/message ID and reservation identity; a new email concerning an existing reservation proposes an update. Preserve manually added notes.

### AI suggestions

| Method and path | Request | Success data |
|---|---|---|
| `POST /v1/trips/{tripId}/suggestions` | Day, intent, constraints, expected trip version | `202`: suggestion job ID |
| `GET /v1/suggestions/{id}` | None | State and validated proposal |
| `POST /v1/suggestions/{id}/apply` | Accepted change IDs and expected version | Updated items, new revision |
| `DELETE /v1/suggestions/{id}` | None | `204`; discard |

Example generation input:

```json
{
  "dayId": "example-day",
  "intent": "reduce-walking",
  "expectedTripVersion": 12,
  "constraints": { "keepBookedItems": true, "pace": "relaxed" },
  "weatherSnapshotId": "example-weather"
}
```

Example proposal body:

```json
{
  "data": {
    "id": "example-suggestion",
    "status": "ready",
    "baseTripVersion": 12,
    "changes": [
      {
        "id": "change-1",
        "itemId": "example-walk",
        "before": { "startTime": "09:00" },
        "after": { "startTime": "10:00" },
        "reason": "Leaves a slower start while preserving the booked afternoon visit."
      }
    ],
    "sourceIds": ["example-day", "example-weather"],
    "warnings": ["Walking duration has not been verified by a routing provider."]
  }
}
```

Validate model output against the schema and real trip entities. Applying changes is a separate transaction that checks versions and locked bookings; it is never triggered merely by receiving generated text.

### Group expenses and realtime

| Method and path | Request | Success data |
|---|---|---|
| `GET /v1/trips/{tripId}/members` | None | Authorized members/roles |
| `POST /v1/trips/{tripId}/invites` | Invitee and role | Expiring invitation; owner role required |
| `PATCH /v1/trips/{tripId}/members/{id}` | Role change | Updated membership |
| `DELETE /v1/trips/{tripId}/members/{id}` | None | `204`; revoke access |
| `GET /v1/trips/{tripId}/expenses` | Cursor | Expense ledger |
| `POST /v1/trips/{tripId}/expenses` | Expense and exact shares | Created Expense |
| `PATCH /v1/expenses/{id}` | Revised amount/payer/shares | Updated Expense and version |
| `DELETE /v1/expenses/{id}` | None | `204`; preserve audit event |
| `GET /v1/trips/{tripId}/balances` | Optional reporting currency | Balances by currency and suggested settlements |
| `POST /v1/trips/{tripId}/settlements` | From, to, currency, amount, paidAt | Recorded external Settlement |

Example expense input (KRW has no decimal minor unit):

```json
{
  "title": "Dinner",
  "currency": "KRW",
  "amountMinor": 24000,
  "paidByMemberId": "alex",
  "localDate": "2027-05-12",
  "splitType": "equal",
  "shares": [
    { "memberId": "alex", "amountMinor": 12000 },
    { "memberId": "sam", "amountMinor": 12000 }
  ],
  "receiptAttachmentId": null
}
```

A transaction validates integer units, positive totals, participants, and exact share totals, writes the ledger, and produces a revision event. Balances are derived from the ledger and settlements, not independently editable totals. Keep currencies separate unless a reviewed conversion rate is supplied.

The client subscribes to an authenticated trip-scoped Supabase realtime channel after sign-in. Events carry entity type, ID, version, and operation ID. The client re-fetches authoritative data; it does not trust an event as proof of authorization. Reconnect catches up through the changes endpoint. [Realtime service](https://supabase.com/docs/guides/realtime)

### Offline synchronization and migration

| Method and path | Request | Success data |
|---|---|---|
| `GET /v1/trips/{tripId}/changes` | `after` cursor | Ordered changes, tombstones, next cursor |
| `POST /v1/trips/{tripId}/sync` | Device ID and queued operations | Per-operation accepted/conflict results |
| `POST /v1/migrations/github/preview` | Validated exported library and source revision | Counts, mappings, warnings; no mutation |
| `POST /v1/migrations/github/commit` | Preview ID and confirmation token | Imported trip IDs and checkpoint |
| `GET /v1/trips/{tripId}/export` | Format/version | Authorized portable export |

A sync operation contains a stable operation ID, entity type/ID, base version, action, and changed fields. Accept independent operations transactionally; explicitly report conflicts. The response distinguishes accepted, duplicate, rejected, and needs-review entries. Never clear the local queue before confirmed acceptance.

After migration, select the cloud adapter for those trips and stop automatic GitHub writes. Keep an immutable pre-migration export for recovery. Importing old data must not create new email/AI/group connections automatically.

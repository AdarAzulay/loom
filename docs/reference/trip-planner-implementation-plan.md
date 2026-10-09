# Loom — trip guide implementation plan

**Version 2 · Ready for review · Implementation is not approved yet**

This plan replaces the earlier playful design and includes the newly requested booking inbox, AI itinerary suggestions, shared expenses, clocks, weather, and city/neighborhood maps. The accompanying interactive preview is a design prototype using sample data. It does not connect to email, GitHub, an AI service, or live financial accounts.

## 1. Product direction

A personal travel guide that keeps the whole trip together: where to go, what happens next, what is already booked, local time, weather, documents, and shared costs. It starts empty, supports multiple trips, and is not hardcoded to South Korea or Japan.

The preferred visual direction is **professional glass**, based on the supplied third, fourth, and fifth images: warm neutral surfaces, frosted layers, fine highlights, generous spacing, clear type, and a floating glass tab bar. Retain the useful trip-card and map concepts from the other references without their cartoon styling. The linked Muzli page could not be retrieved; the supplied images provided the visual reference.

Navigation remains **Home · Days · Add · Items · Profile**. There is no social feed, follower system, or public travel community in the starting product.

## 2. Scope and delivery order

All requested capabilities belong to this plan. They are implemented in stages so the personal guide becomes usable before the connected services are introduced.

| Capability | Phase 1: personal guide | Phase 2: connected guide |
|---|---|---|
| Glass mobile interface | Complete interface, responsive desktop layout, accessibility | Same interface |
| Trips, days, items | Full create/edit/move/remove flows | Shared trip access |
| Maps | City view, saved places, neighborhood selection, external directions | Provider-backed nearby recommendations |
| Time and weather | Local/home clocks, available forecasts, freshness and offline states | Inputs for itinerary suggestions |
| Bookings | Manual entry, references, confirmation/website links, unified timeline | Automatic extraction from uploads and an authorized inbox |
| Recommendations | Relevant saved places, filtered by city/category and unscheduled status | AI suggestions with explanations and cited source data |
| Offline | Cached app and selected trips; durable local drafts | Operation queue and conflict-aware cloud reconciliation |
| Saving | Owner-authorized GitHub API; private recovery copy | Private database becomes authoritative for connected trips |
| AI itinerary | Interface and replaceable service boundary | Generate/replan, review differences, then apply |
| Group expenses | Data model and interface preview | Live shared ledger, splits, balances, manual settlements |

**Approval starts Phase 1.** Phase 2 follows once its provider access and spending limits are available. No assumption is made that AI, mail processing, storage, or shared hosting will remain free. Approval does not purchase services or connect accounts on the user's behalf.

## 3. Screens and behavior

### Home

- Greet the profile owner: **“Hello, <name>.”**
- Show a prominent search field for trips, saved places, and booking items. No search results are invented.
- Show **“Your trips”** followed by square cards in a horizontal, touch-friendly carousel. Cards contain trip name, dates, and a restrained visual cover. Tap to select a trip; all trip-scoped views follow that selection.
- Show **“Plan your next trip here.”** and a Create trip action when no trips exist. Hide irrelevant weather, balances, and itinerary panels in this state.
- Provide immediate access to the active itinerary, upcoming booking, booking inbox, and expenses.
- Show the destination's current clock and weather context. Personalized recommendations initially come from saved places and the owner's preferences; AI results are introduced in Phase 2.
- Distinguish future, active, completed, and archived trips. Weather for a future trip must not be presented as a known forecast months in advance.

### Days

- Always identify **trip, date, and city**. If a day contains travel between cities, show departure and arrival context separately.
- Provide calendar/date selection and a clear ordered timeline. Timed activities sort chronologically; untimed activities can be reordered.
- Present a real map centered on the day's city and its saved stops. Selecting a neighborhood focuses the map and corresponding items. Use actual geographic data, not invented outlines.
- Show neighborhood names when verified by the map source or chosen by the user. City, administrative district, and neighborhood are distinct levels; do not label a district as a neighborhood.
- Place weather and local time near the day's map. Show a compact day summary: booked events, flexible activities, and free periods.
- Open an item to see its details, notes, link, booking reference, and Edit/Remove actions.
- Add an item inside a day with trip/date prefilled. Move items between days. Removing an item supports undo; removing a day offers to retain its items unscheduled and never silently deletes bookings.

### Add

1. Choose the destination trip, including when opening Add from the bottom bar.
2. Choose **Day, Flight, Stay, Transport, Restaurant, Museum, Show, Theme park, Place, Note**, or **Expense** when enabled.
3. Open a form specific to that type.
4. Validate, save locally, and show whether the change has synced.

A Day has a date, title, city, and notes, with items inside it. Adding an already-existing trip/date opens that day rather than duplicating it. Extending a trip's dates previews what changes.

Flights require departure/arrival locations and their own local dates, times, and time zones. Stays use check-in/checkout. Places and notes may remain unscheduled. Booking price and currency are optional; entering them does not automatically create a shared expense.

### Items

Browse the selected trip's flights, accommodation, restaurants, activities, transport, places, notes, and bookings. Filter by category, booking status, completion, or saved status. Search titles, providers, and addresses.

A detail screen contains the item type, trip, day, city/neighborhood, time, location, notes, booking status/reference, provider, website/confirmation link, and attachments when supported. Links open deliberately; unsafe URL schemes and imported executable markup are rejected. Edit and Remove are explicit actions.

The booking timeline and itinerary refer to the same items. A confirmed reservation is never duplicated just to appear in another screen.

### Profile

Editable name, home time zone, units, default currency, accessibility preferences, trip archives, connection status, downloaded data, and backup/restore. Phase 2 adds group membership and mail connection management. The display name is independent of the authentication account.

## 4. Supporting features

### Time, weather, and visual day context

Store IANA time zones, not fixed offsets. Use destination-local dates for calendars and each airport's zone for flights. Show home time as a secondary comparison and handle daylight-saving transitions.

Use Open-Meteo as the proposed initial weather provider. Show current conditions and forecasts only for supported dates, with provider, fetched time, and stale/offline labels. Outside the forecast horizon show “Forecast available closer to your trip.” Historical averages, if added later, must be labeled separately. The documented forecast horizon is up to 16 days, depending on model. [Weather documentation](https://open-meteo.com/en/docs)

Weather colors and day/night treatments are subtle. Text remains legible and the product works without transparency, animation, location permission, or network access.

### Smart Booking Inbox — Phase 2

Start with pasted confirmation text and uploaded PDF/image/email files; then connect a read-only mail provider. **Gmail is the proposed first adapter; Outlook can use the same interface later.** This provider choice can be changed during plan review.

The service identifies flight, hotel, and rental-car confirmations, extracts structured fields, suggests a trip/day, and displays the source and uncertain fields. The user reviews new imports before adding them. Re-importing the same message is idempotent. Updated or cancelled reservations appear as proposed changes, preserving user notes and the original reference.

Automatic synchronization uses a server-side OAuth connection, incremental history, a renewable mailbox watch, authenticated notifications, and reconciliation after missed messages. Gmail notifications are change signals; the backend retrieves the actual content. Google's watch mechanism uses Cloud Pub/Sub and requires renewal. [Gmail push documentation](https://developers.google.com/workspace/gmail/api/guides/push)

Read-only mail access can cover the mailbox even when the app filters for travel messages. Gmail scope classification and verification obligations must be checked during provider setup. Tokens stay on the backend. The user can disconnect and remove retained imported data. Raw emails are processed transiently; retain normalized bookings and selected attachments, not a public archive of the mailbox. [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes)

### AI-driven dynamic itinerary — Phase 2

Use trip dates, saved places, interests, travel pace, fixed bookings, reliable travel estimates, and available weather as inputs. Return a proposed itinerary with reasons, warnings, sources, and unresolved assumptions.

Booked events are locked unless the owner deliberately unlocks them. Do not invent opening hours, availability, confirmed reservations, route times, or weather. On a weather change or delay, offer alternatives and show a before/after comparison. Apply only reviewed changes against the current itinerary version. The app must remain fully usable when the AI service is unavailable.

AI provider and model remain a server configuration choice, with a per-request cost limit, user quota, and provider timeout. Provider secrets never enter the static app. The service contract is defined in the API document; no specific model capability or free allowance is assumed.

### Real-time group expenses — Phase 2

Trip-scoped participants can record expense amount, currency, payer, date, category, receipt, and equal, exact-amount, or percentage shares. Amounts use integer minor units according to the currency. Allocate rounding remainders deterministically so shares exactly equal the total.

Show paid totals, shares, balances, and suggested settlements. Keep currencies separate until the user supplies or accepts a dated conversion rate. Editing or deleting an expense recomputes balances from the ledger. A settlement records a payment made elsewhere; the app does not move money.

Authorized group members see committed changes through the backend's realtime channel. Offline entries say “Pending sync” and do not appear as confirmed payments to other members until accepted. Duplicate submissions must not double-count. Owner/editor/viewer permissions are enforced by the backend.

## 5. Architecture and hosting

**Phase 1 preserves the agreed GitHub workflow:** public repository, static GitHub Pages app, direct authenticated GitHub file saves, and private recovery copy. GitHub Pages cannot execute a custom server. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

Use React, TypeScript, Vite, semantic components, and CSS glass effects with opaque fallbacks. Use IndexedDB for local state and a service worker for the app shell and explicitly downloaded trip data. Keep data persistence behind a service adapter so screens do not depend on GitHub-specific request formats.

**Phase 2 adds a separate backend while Pages keeps hosting the interface.** The proposed platform is Supabase: authentication, Postgres, private object storage, Edge Functions, and realtime channels. Per-trip authorization is enforced in server operations and database row-level policies. Administrative keys are never sent to the browser. [Functions](https://supabase.com/docs/guides/functions) · [Row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security) · [Realtime](https://supabase.com/docs/guides/realtime)

Connected trips migrate to the private database after an export, validation, comparison, and explicit switch of the active adapter. Do not maintain two independently writable authoritative copies. GitHub becomes an optional sanitized export/private backup target for those trips. Email contents, provider tokens, imported documents, and other group members' details are not written automatically to the public repository.

Free Pages hosting does not imply free connected services. Provider quotas, pause policies, email infrastructure, AI usage, and storage are reviewed before activation; no paid upgrade is enabled implicitly. [Backend pricing reference](https://supabase.com/pricing)

## 6. Data model and persistence

The versioned model comprises Profile, Trip, Destination/City, Neighborhood reference, Day, Place, Item, Booking, Attachment, WeatherSnapshot, ImportCandidate, Suggestion, TripMember, Expense, ExpenseShare, and Settlement.

Every entity has a stable ID; mutable cloud entities have an integer version and UTC update time. Relationships are explicit: Trip → Day → Items, with place and booking references. Multi-day stays and flights are single records projected into the relevant dates, not copied per screen.

Phase 1 stores a small versioned JSON collection at `data/trip-planner.json`. Keep it below the proposed application limit of 500 KB; store no binary uploads there. For every GitHub save, retain the base document and file SHA, serialize writes, and preserve drafts after errors. If the remote file changed, review differences instead of silently overwriting it. A successful write response confirms the save; a local draft alone does not.

Offline mode stores a last-confirmed snapshot and a separate durable operation queue. Retry with stable operation IDs. Cloud writes use expected versions and idempotency keys. Re-fetch after uncertain responses and reconcile conflicts before applying stale updates. A device that is offline cannot promise live group synchronization.

Schema migrations preserve original snapshots and reject writes from incompatible older clients. App upgrades must not reset user data or inject demonstration trips.

Full endpoint tables, request/response bodies, error behavior, and backend contracts are in **trip-planner-api-contract.md**.

## 7. Maps, documents, and recovery

Use Leaflet with a replaceable tile/geocoding provider. Start with city lookup/manual coordinates, saved pins, neighborhood references, and external directions. The map must remain useful when location permission is declined. Display accurate attribution. [Leaflet](https://leafletjs.com/examples/quick-start/)

Standard OpenStreetMap tiles can support modest personal online usage under their policy. They do not permit building an offline tile downloader; use a provider/license designed for offline packs if that feature is added. Offline-first initially means saved itinerary, booking details, addresses, notes, and chosen documents, with map fallbacks. [Tile policy](https://operations.osmfoundation.org/policies/tiles/)

The design preview's Seoul map uses OpenStreetMap street/park/water geometry retrieved through Overpass, with real coordinates for Bukchon, Gyeongbokgung, and Ikseon-dong. It is a layout preview, not a routing service. Other city maps load through the production provider in implementation.

Phase 1 supports confirmation links and text. Phase 2 adds private attachments with upload limits, type validation, expiring download URLs, and explicit offline availability. Device storage can be cleared or evicted, so it is not the only copy. Sign-out offers to remove cached private data.

Keep code and data backups distinct. The private recovery repository stores approved source releases and confirmed data snapshots. Backup failure must not undo a live save. Restore validates a snapshot, previews changes, exports the current state, and then writes a new reviewed version. Private-copy changes do not automatically publish to the live site.

## 8. Implementation milestones after approval

| Step | Deliverable | Acceptance check |
|---|---|---|
| 1 | Glass design system, navigation, Home/search/trip carousel, empty state, Profile | Narrow phone and desktop layouts work in both appearances and without transparency |
| 2 | Trip/day/item model, trip-first Add, tailored forms, editing and undo | Create a trip → day → items; changes appear consistently in all views |
| 3 | Local persistence and GitHub adapter | Save/reopen; Unicode round-trips; conflicts and failed writes preserve data |
| 4 | City/neighborhood maps, time zones, weather, saved-place recommendations | Correct trip/city/date context; distant future dates never show fake forecasts |
| 5 | Offline app, export/import, backup/restore, Pages deployment | Previously downloaded trip works in airplane mode; a restore round-trip succeeds |
| 6 | Private backend, authentication, membership policies, migration | One active data authority; unauthorized users cannot read another trip |
| 7 | Booking upload/extraction, review, deduplication; then authorized mail sync | Flight, hotel and rental-car examples import once; reconnect/cancellation flows work |
| 8 | AI proposal generation and reviewed application | Booked events stay fixed; stale suggestions cannot overwrite newer edits |
| 9 | Group ledger and realtime synchronization | Shares sum exactly; two users see updates; offline retries never double-count |
| 10 | Device QA, recovery drill, documentation, release | Complete end-to-end travel workflow on a real iPhone or report that test as pending |

Each milestone should be demonstrated before the next is expanded. Real provider connections are configured only when their access and spending settings are available. The design prototype is not evidence that those integrations work.

## 9. Verification and completion criteria

Automated checks cover dates and time zones (including cross-midnight flights and DST), shared record references, Unicode, validation, schema migrations, conflicting saves, retry/idempotency behavior, import deduplication, locked AI constraints, and expense arithmetic.

Integration tests use deterministic fake providers first, then controlled smoke checks against configured services. Check revoked tokens, rate limits, expired mail watches, missed realtime events, unavailable weather, missing geographic data, unsupported files, and stale offline edits.

Review iPhone touch targets, accessible labels, keyboard navigation, long trip names, empty/loading/error states, reduced motion/transparency, color contrast, and maps at narrow widths. Glass must not reduce legibility. Browser simulation does not replace a real-device check.

The personal release is ready when a user creates an empty trip, adds a city and day, adds/edits/removes items, views its real map and booking timeline, understands local time/weather availability, saves, reopens on another device, uses the downloaded trip offline, and restores a backup.

The connected release is ready when authorized mail imports, reviewed AI changes, and a two-person expense workflow additionally pass their failure and recovery scenarios.

## 10. Approval summary

Proposed defaults: professional glass design; Home/Days/Add/Items/Profile; trip-first creation; real city and neighborhood views; GitHub-backed personal release first; Supabase-backed connected features second; Gmail as the first mail adapter; AI always proposes before changing a plan; group expenses record and split costs without handling payments.

The user can approve the plan, approve Phase 1 only, or request changes. No functional application implementation or external deployment has started.

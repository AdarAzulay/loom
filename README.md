# Loom

A personal travel planner built with React, TypeScript, Vite, and ordinary CSS. This is the approved **Step 1 foundation plus item details and local photo storage**. It starts empty.

Loom is your personal space to arrange and reshape a trip. The app was renamed from Roam; the project remains at `/Users/adaraz/Documents/Codex/roam`. The legacy IndexedDB name `roam-library` is intentionally unchanged so existing plans remain available. The export filename is now `loom-draft.json`; its data format is unchanged.

## Run it

Use Node 24 LTS (`.nvmrc`) and npm 12. The lockfile pins the dependency tree.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To check the production build:

```sh
npm run check            # lint, unit/integration tests, strict typecheck, build
npm run preview         # http://127.0.0.1:4173
npx playwright install chromium webkit
npm run test:e2e         # desktop Chromium + simulated iPhone WebKit
```

`npm run typecheck`, `npm run lint`, and `npm test` also run independently. Browser checks require the production build (`npm run build`) and downloaded browsers. These tests use isolated browser contexts; they do not seed the user’s library.

## What works

- Five mobile tabs: Home, Days, Add, Items, Profile; light/dark/device appearance; opaque and reduced-transparency fallbacks.
- Create, select, and edit trips with date ranges; square horizontally scrolling trip cards and real search across saved trips/items/bookings.
- Create/select calendar days with a city and optional title/notes. Duplicate trip/date opens the existing day. Date-only values remain `YYYY-MM-DD`.
- Edit a selected day from the Days screen; the date, city, title, and notes are prefilled. The day ID and linked items stay intact, while duplicate or out-of-range dates are rejected.
- Delete a trip from its edit dialog after explicit confirmation. The confirmation names the trip and counts affected days/items; deletion cascades atomically, preserves other trips/profile, and clears stale undo entries.
- Trip-first Add, or day-prefilled Add; Flight, Stay, Transport, Restaurant, Museum, Show, Theme park, Place, and Note forms.
- Shared item records in Days and Items; details, editing, moving to another day or unscheduling, manual booking references, safe web links, removal and undo.
- Item notes, Instagram links, website/booking links, coordinate-based place details, and locally stored photo thumbnails/details. Photos are resized to about 1200px in browsers that support image decoding before they are saved outside the library JSON.
- Profile display name and appearance saved locally. No automatic sample data.
- IndexedDB schema v3 persistence with non-destructive v1/v2 migrations, hydration gating, serialized writes, schema validation, atomic revision checking, explicit failures/retry, and separate photo records. WebKit’s Blob storage limitation uses a binary fallback and reconstructs the same Blob API on load.

## Data and hosting

Data stays in **this browser, on this origin**, in IndexedDB `roam-library`. It is not synced to GitHub or another device. Version 1 and version 2 snapshots are retained in `library-v1` and `library-v2` while the verified v3 record is written. Photo binaries live in a separate `photos` object store and are referenced by item IDs. Backups now include the library, photos, and avatar; restore validates the full file before replacement. Browser storage can still be cleared or evicted, so keep a backup and retry failed saves before reloading. A conflicting tab cannot silently overwrite a newer revision.

Vite uses relative asset URLs and navigation uses URL hashes (`#days`, `#items`, etc.), so a repository prefix such as `/roam/` does not require server rewrites. Build output is `dist/`. No repository, deployment, remote connection, or automatic publishing workflow has been created.

## Project map

```text
src/app/                App composition, hash navigation, library store
src/components/         Shared controls, dialogs, item cards
src/features/           Screen modules, forms, item detail
src/models/             Typed schemas, calendar dates, mutations, item labels
src/services/storage/   Repository contract + IndexedDB adapter
src/styles/             Design tokens and responsive CSS
src/test/               Test setup and test-only data
tests/                  Production-browser user journeys
docs/                   Architecture, verification, original reference plans
```

Read [architecture](docs/architecture.md) for boundaries and tradeoffs, [verification](docs/verification.md) for the actual checks, and the [original plan](docs/reference/trip-planner-implementation-plan.md) / [API proposal](docs/reference/trip-planner-api-contract.md) for future scope. The reference documents preserve the proposed scope, with updated Loom branding; their older “not approved yet” wording is superseded by the explicit Step 1 implementation approval.

## Next steps

Review this local foundation before adding maps/neighborhoods, full flight date/time-zone schedules, several-city day metadata, backup/restore, clocks/weather, service-worker offline installation, or further polish. Email imports, AI proposals, private backend/accounts, groups, and expenses are later separate work. Safari/Home Screen installation and real-iPhone testing have not been completed.

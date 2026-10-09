# Loom

A personal travel planner built with React, TypeScript, Vite, and ordinary CSS. This is the approved **Step 1 foundation plus a working local trip → day → item slice**. It starts empty.

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
- Profile display name and appearance saved locally. No automatic sample data.
- IndexedDB persistence with hydration gating, serialized writes, schema validation, atomic revision checking, explicit failures/retry, and a JSON draft download for recovery.

## Data and hosting

Data stays in **this browser, on this origin**, in IndexedDB `roam-library`. It is not synced to GitHub or another device. Browser storage can be cleared or evicted; a draft download is useful for manual recovery. In-app restore is deferred. Do not close a tab with a failed save before retrying or downloading its draft. A conflicting tab cannot silently overwrite a newer revision.

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

Review this local foundation before adding maps/neighborhoods, full flight date/time-zone schedules, clocks/weather, service-worker offline installation, GitHub saves, import/restore, backups, or deployment. Email imports, AI proposals, private backend/accounts, groups, and expenses are later separate work. Safari/Home Screen installation and real-iPhone testing have not been completed.

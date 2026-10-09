# Step 1 verification

Reverified after the Loom rename on 27 September 2026 with Node **24.19.0** and project-local npm **12.1.0** on macOS.

| Check | Result |
|---|---|
| Locked clean install (`npm ci`) | Passed; 203 packages installed; audit reported 0 vulnerabilities |
| ESLint (`npm run lint`) | Passed with zero warnings |
| Strict TypeScript (`npm run typecheck`) | Passed |
| Unit/integration (`npm test`) | **37 passed** across 3 files |
| Production build (`npm run build`) | Passed; relative assets generated in `dist/` |
| Playwright (`npm run test:e2e`) | **8 passed** across desktop Chromium and simulated iPhone WebKit |
| Local preview | HTTP 200 at `http://127.0.0.1:4173/` at handoff |

The rename regression confirms that the default adapter still loads existing data from the unchanged `roam-library` database. Browser checks also verify the Loom page title, accessible brand label, and new L favicon.

The unit/integration suite covers leap years and arbitrary calendar years, date-only formatting, trip ranges, duplicate days, stable IDs, cross-trip references, type boundaries, unsafe links, stay dates, day edits, trip deletion cascades, Unicode storage round-trip, future/corrupt envelope rejection, stale-tab writes, hydration gating, failed load/retry, serialized pending writes, failed save/retry, and the trip → day → item → edit → reload → remove → undo journey.

The browser suite drives real forms against the production build and real IndexedDB: create/edit a trip, create/edit a leap-day itinerary, add/edit a booked restaurant with Unicode text, reject an unsafe link, reload, verify the same item in Days/Items, remove/undo/reload, search by booking reference, confirm trip-first Add, update profile, change appearance, check trip isolation, cancel trip deletion, delete one of two trips, delete the last trip, and reload the empty state. Both engines also serve/reload the build under `/roam/#profile` with no server rewrite. All five screens pass horizontal-overflow checks at 320px; WebKit also runs at 390 × 844. A selected-trip control must meet a 44px minimum height.

Screenshots of light/dark empty Home, long trip names at 320px, and the populated Days screen were inspected. Review caught a too-short native WebKit select and insufficient navigation opacity; both were fixed and the browser suite rerun successfully. The light empty-state screenshot contains no sample records. Populated test screenshots show test-only data.

## Environment notes

The machine’s original npm 10 resolver failed during optional peer resolution. A temporary npm 12 installation under ignored `work/tooling` resolved it; `.npmrc` uses HTTPS and bounded fetch timeouts. The global runtime/configuration was not changed. Reproducible setup is Node 24 + npm 12 + `npm ci`.

Test browsers were installed in ignored `work/browsers`. To reuse that cache here:

```sh
PLAYWRIGHT_BROWSERS_PATH="$PWD/work/browsers" npm run test:e2e
```

Browser launching required permission for macOS helper processes outside the restricted sandbox. The completed runs used Chromium 153 and WebKit 26.6. npm reported an optional `fsevents` install script blocked by its default script policy; install, tests, build, and preview all passed without enabling it. The pinned ESLint 9 package prints an upstream support deprecation during installation; lint itself passes. No global upgrades were made.

## Not verified or implemented

No physical iPhone, actual Safari/Home Screen installation, VoiceOver audit, full contrast audit, or old-browser matrix was tested. Reduced-transparency/opaque fallbacks are implemented but not separately tested through OS preferences. Multi-device sync, deployment, maps, weather, offline app caching, GitHub saves, import/restore, full flight time-zone scheduling, backend accounts, email, AI, and expenses are outside this milestone. Local data can be removed by browser clearing/eviction; failed drafts stay in memory until recovered. Undo history does not survive reload.

The standalone Git repository is initialized at `/Users/adaraz/Documents/Codex/roam`, with no commits or remotes. Nothing has been pushed or published.

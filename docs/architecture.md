# Step 1 architecture

The product name is **Loom**. The rename changes visible branding, icon, package metadata, and documentation only. The project directory remains `/Users/adaraz/Documents/Codex/roam`, and IndexedDB retains the legacy `roam-library` name and the same version-1 envelope. No storage migration or reset is needed. A regression test verifies the default adapter still opens data saved under that legacy name.

The foundation deliberately contains one client, one library, and one active persistence adapter. React handles rendering; ordinary CSS supplies the glass surfaces and responsive layouts. There is no backend, network provider, service worker, router framework, or speculative service tree.

## State and data flow

`main.tsx` creates one `LibraryStore` and one `IndexedDbRepository`, then starts hydration. `useSyncExternalStore` subscribes React to a stable snapshot. Mutations only become available after successful hydration; a load error never becomes an empty write. Forms commit validated drafts synchronously into the store, so both itinerary screens see the same record immediately. Dialog/form values are local until submitted.

The store serializes writes and coalesces edits made while a write is pending. It only clears dirty state after the latest snapshot is committed. Failures keep the current draft in memory and expose retry/download actions; the UI never reports a failed draft as saved. A before-unload handler warns while dirty. Undo keeps removed items in an in-memory stack until dismissed or reloaded, restores the original stable ID, and uses the same save path.

The repository contract is `load()` / `save(data, expectedRevision)`. IndexedDB stores one atomic envelope: `{ schemaVersion: 1, revision, data }`. A read/write transaction checks the stored revision and writes the next snapshot atomically. Stale tabs receive a visible conflict without overwriting newer data; users can download their draft and reload to review the stored version. Automatic merging is deferred. Reloading or closing before a failed save is recovered can lose that in-memory draft.

Version 1 has no historical migration to run. Unknown versions and invalid stored data stop hydration and leave the original database untouched. A future migration must preserve the original snapshot, validate its replacement, and add migration tests. A future GitHub adapter must own SHA/revision translation and conflict review. No fake HTTP endpoint has been created, and a simple adapter swap alone is not a complete sync implementation.

## Model boundaries

Zod schemas provide runtime validation and inferred TypeScript entities, avoiding duplicate type declarations. Trip, Day, and Item IDs are stable UUIDs. A library validator enforces uniqueness, date ranges, trip/day relationships, and stay ranges. Days use date strings rather than timestamps; display formatting explicitly uses UTC calendar components. Trip range reductions that exclude existing days/stays are rejected rather than moving or deleting records.

Items are a discriminated union: journeys have origin/destination, flights add a number, stays have check-in/check-out/address, venue categories have address, and notes have common text. Common title, day, local time, link, and optional manual booking fields share form primitives. Every type is in one label/icon configuration. Fields are modest by design: flight arrival dates/times/zones and stay projection onto every occupied date are deferred. Local times are displayed exactly as entered, without conversions or chronological cross-zone claims. A stay appears once in Items and on its assigned itinerary day.

Web links must use HTTP(S) and cannot embed credentials. React renders user text without HTML injection. External links open deliberately with `noopener noreferrer`. Booking status is entered manually and is never provider-verified.

## Navigation and layout

The five tabs are hash routes so GitHub Pages can reload every tab under a repository subpath. Relative assets use Vite’s `base: './'`. Trip selection is persisted; selected day and open dialogs are session UI state. Bottom Add always starts at trip choice, while contextual Add can prefill trip/day. Native dialogs supply modal focus containment and Escape handling. Controls have visible focus, labels, and comfortable targets; safe-area padding supports mobile browser chrome. Glass falls back to opaque surfaces without backdrop-filter or when reduced transparency is requested.

No images, fonts, or live services load from third parties. Test fixtures are imported only by tests. Browser automation is not proof of real-device Safari/Home Screen behavior.

## References

Hosting conventions follow [Vite static deployment guidance](https://vite.dev/guide/static-deploy.html). Transaction completion and version changes follow [MDN’s IndexedDB guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB). Original product/API proposals are in `docs/reference`; they describe later work and do not imply existing integrations.

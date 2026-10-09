# Step 1 architecture

The product name is **Loom**. The project directory remains `/Users/adaraz/Documents/Codex/roam`, and IndexedDB retains the legacy `roam-library` name. The library envelope is now schema version 3. Opening a version-1 or version-2 record validates a complete replacement first, writes it to a pending key, reads that replacement back, then commits the verified v3 record while preserving the original under `library-v1` or `library-v2`. If migration aborts, the source current record remains untouched. A realistic migration test covers a Korean/Japanese trip with a booked restaurant.

The foundation deliberately contains one client, one library, and one active persistence adapter. React handles rendering; ordinary CSS supplies the glass surfaces and responsive layouts. There is no backend, network provider, service worker, router framework, or speculative service tree.

## State and data flow

`main.tsx` creates one `LibraryStore` and one `IndexedDbRepository`, then starts hydration. `useSyncExternalStore` subscribes React to a stable snapshot. Mutations only become available after successful hydration; a load error never becomes an empty write. Forms commit validated drafts synchronously into the store, so both itinerary screens see the same record immediately. Dialog/form values are local until submitted.

The store serializes writes and coalesces edits made while a write is pending. It only clears dirty state after the latest snapshot is committed. Failures keep the current draft in memory and expose retry/download actions; the UI never reports a failed draft as saved. A before-unload handler warns while dirty. Undo keeps removed items in an in-memory stack until dismissed or reloaded, restores the original stable ID, and uses the same save path.

The repository contract is `load()` / `save(data, expectedRevision, photos?)` plus photo loading and full-photo export. IndexedDB stores one atomic library envelope `{ schemaVersion: 3, revision, data }`, a `photos` object store, and preserved `library-v1` / `library-v2` snapshots when migration occurs. A read/write transaction checks the stored revision and writes the next snapshot atomically with new photo records. Chromium stores photo Blobs directly. WebKit automation currently rejects Blob values in object stores, so Loom retries that transaction with an ArrayBuffer representation and reconstructs a Blob on load; this keeps binary data outside the library JSON. Backups package the validated library and binary photos as base64 JSON; restore validates everything before replacing local data. Stale tabs receive a visible conflict without overwriting newer data. Automatic merging is deferred. Reloading or closing before a failed save is recovered can lose that in-memory draft.

Unknown versions and invalid stored data stop hydration and leave the original database untouched. The v1-to-v3 and v2-to-v3 migrations preserve the original snapshots and have fixture tests. A future GitHub adapter must own SHA/revision translation and conflict review. No fake HTTP endpoint has been created, and a simple adapter swap alone is not a complete sync implementation.

## Model boundaries

Zod schemas provide runtime validation and inferred TypeScript entities, avoiding duplicate type declarations. Trip, Day, and Item IDs are stable UUIDs. A library validator enforces uniqueness, date ranges, trip/day relationships, and stay ranges. Days use date strings rather than timestamps; display formatting explicitly uses UTC calendar components. Trip range reductions that exclude existing days/stays are rejected rather than moving or deleting records.

Items are a discriminated union: flights, hotels/stays, transport, trains, car/taxi, food, activities, shopping, tickets/passes, documents, places, and notes each have tailored fields. Every item also has status, optional price, notes, safe website/Instagram links, an optional coordinate place, and photo IDs. Days hold city, country, IANA time zone, and an optional KRW/JPY label. Common title, day, local time, links, place fields, and optional manual booking fields share form primitives. Photo records carry metadata and binary content in IndexedDB rather than in the JSON library envelope. Every type is in one label/icon configuration. Local times are displayed exactly as entered; no false cross-zone conversion is claimed. A stay is one record in Items and is projected onto each occupied day with check-in, middle-stay, and check-out labels.

Web links must use HTTP(S) and cannot embed credentials. React renders user text without HTML injection. External links open deliberately with `noopener noreferrer`. Booking status is entered manually and is never provider-verified.

## Navigation and layout

The five tabs are hash routes so GitHub Pages can reload every tab under a repository subpath. Relative assets use Vite’s `base: './'`. Trip selection is persisted; selected day and open dialogs are session UI state. Bottom Add always starts at trip choice, while contextual Add can prefill trip/day. Native dialogs supply modal focus containment and Escape handling. Controls have visible focus, labels, and comfortable targets; safe-area padding supports mobile browser chrome. Glass falls back to opaque surfaces without backdrop-filter or when reduced transparency is requested.

No images, fonts, or live services load from third parties. Test fixtures are imported only by tests. Browser automation is not proof of real-device Safari/Home Screen behavior.

## References

Hosting conventions follow [Vite static deployment guidance](https://vite.dev/guide/static-deploy.html). Transaction completion and version changes follow [MDN’s IndexedDB guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB). Original product/API proposals are in `docs/reference`; they describe later work and do not imply existing integrations.

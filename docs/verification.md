# Loom verification

Reverified for the full local-first roadmap pass on 9 October 2026 with Node **23.10.0** and npm **12.1.0** on macOS.

| Check | Result |
|---|---|
| ESLint (`npm run lint`) | Passed with zero warnings |
| Strict TypeScript (`npm run typecheck`) | Passed |
| Unit/integration (`npm test`) | Passed across 4 files, including 42 assertions |
| Production build (`npm run build`) | Passed; relative assets generated in `dist/` |
| Playwright (`npm run test:e2e`) | Passed on desktop Chromium and simulated iPhone WebKit |

The model is now schema v3. v1 and v2 migrations validate the replacement, write and read a pending record, then commit only the verified v3 record while retaining the original in `library-v1` or `library-v2`. Tests cover a realistic v1 sample, a v2 sample, duplicate-ID creation regression, trip/day relationships, stay date validation, stale writes, failed saves, and Unicode.

The app now supports flights, hotels/stays, transport, trains, car/taxi, restaurants, cafes, museums, shows, theme parks, shopping, tours, tickets/passes, documents, places, and notes. Every record has a unique creation ID, status, optional price, notes, links, map place, and photos. Days carry city, country, IANA time zone, and KRW/JPY labels. Multi-day stays project onto every occupied day, and the timeline separates time chips from cards. Drag reorder, duplicate, move, delete, and undo use the same local save path.

Profile supports display name, avatar upload/removal (resized to about 512px), appearance, glass level, and Sky/Blush/Sand palettes. Backups include the validated library, avatar, and item photos; restore validates the complete file and asks before replacing local data. The 20-photo fixture is 20 × 64 KiB = **1,310,720 bytes (1.25 MiB)** raw. Base64 packaging makes that payload about **1.67 MiB**, plus JSON metadata; actual backups vary with image compression and metadata.

The design pass replaces the green system with palette tokens, translucent Clear/Soft/Solid glass, safe-area bottom padding, compact grouped Add tiles, a compact trip hero, timeline layout, inline illustrations, flight/hotel detail cards, map previews and external Maps links, status-dot storage explanation, and standalone PWA metadata under `/loom/`.

The Playwright suite verifies the production build and repository-subpath reloads on Chromium and WebKit, including the existing trip/day/item/edit/remove/undo journeys. It does not prove physical iPhone behavior. A real-device pass is still needed for Home Screen installation, Safari/WebKit storage clearing, persistent-storage prompts, camera/photo selection, VoiceOver, actual contrast settings, and safe-area behavior.

## iPhone storage research

WebKit documents `navigator.storage.estimate()`, `persisted()`, and `persist()` as supported in Safari 17 and WebKit apps on iOS 17+. Persistent mode is granted by browser heuristics, with Home Screen use being one signal. A Home Screen web app has separate cookies and storage from Safari, and WebKit says its data is isolated from Safari’s tracking-prevention cleanup. Clearing Safari history is therefore not a backup or a reliable way to remove/restore Loom’s Home Screen data. Persistent mode reduces automatic eviction risk, but quota limits, storage pressure, deleting the Home Screen app, or clearing its website data can still remove it. Loom exposes a “Protect local storage” action and still recommends backups.

Sources: [WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/), [WebKit tracking prevention](https://webkit.org/tracking-prevention/), and Apple’s [Home Screen web app guidance](https://developer.apple.com/videos/play/wwdc2023/10120/).

## Not included by the public static release

There is no backend, login, email import, AI, expenses, live weather, live geocoding, or cloud sync. The map preview is intentionally local and lightweight; external Maps links are available from saved coordinates. A physical iPhone/Home Screen experiment and a full OS contrast/VoiceOver audit remain manual checks.

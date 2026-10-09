# Loom design plan

Loom should feel like a calm personal notebook for a booked Korea and Japan trip. The design keeps the existing serif Loom wordmark and large trip titles, then builds a quieter system around them: airy backgrounds, compact glass surfaces, clear hierarchy, and touch-first actions.

## Visual system

Sky is the default palette: blue-white background, blurred blue/lavender/peach shapes, navy ink, slate secondary text, and blue actions. Blush and Sand provide alternate light and dark themes. No green or lime accents are used. Each palette defines both light and dark values and keeps body text at a minimum 4.5:1 contrast.

Glass is a translucent surface over the active background. Clear uses the lowest fill opacity, Soft adds more fill for reading comfort, and Solid removes transparency. Every glass surface has a thin highlight, a restrained shadow, and an opaque fallback for reduced-transparency settings or browsers without backdrop blur. Long lists use one surface layer rather than nested blur.

Typography uses the system font for controls and labels, with the serif reserved for the Loom wordmark and large trip headings. Dates, times, airport codes, and counts use tabular numerals. Touch targets stay at least 44px, with visible focus and safe-area padding.

## Screen structure

- Home opens with the user greeting, avatar, compact trip hero, countdown or current day, cities, and summary stats.
- Days uses a horizontal date strip and a left-time/right-card timeline. Flights and hotels get richer cards while other items remain compact.
- Add uses grouped, tinted icon tiles so the full item catalog is scannable on a phone.
- Items supports filtering, search, manual ordering, and quick actions.
- Profile owns the avatar, appearance, glass level, palette, storage status, and backup reminder.

## Rich cards

Flights use large airport codes, local times, route duration, a thin progress line, and a bottom strip for seat, terminal, gate, and booking reference. Hotels use a photo or illustration header, lodging chips, amenities, address, confirmation, and map/booking actions. Photos always take precedence over generated illustrations; illustrations remain quiet inline SVGs with rounded 1.5px strokes.

## Interaction and motion

Details open in bottom sheets with a grabber and accessible close action. Cards expose edit, duplicate, move, and delete actions through explicit buttons and touch-friendly menus. Reordering has a drag handle plus up/down buttons. View Transitions and 150–250ms CSS transitions are progressive enhancements; reduced-motion users get immediate state changes.

## Validation

Each phase adds model tests, migration tests where storage changes, desktop Chromium and simulated iPhone WebKit journeys, light/dark screenshots, and overflow checks. A final manual pass on a real iPhone verifies Home Screen installation, safe-area behavior, persistent storage prompts, photo selection, keyboard focus, and VoiceOver labels.

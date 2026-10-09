# Loom — design and development review

**Status: ready for your review. Functional implementation has not started.**

The updated prototype uses the professional glass direction: frosted panels, quieter typography, square trip cards, and a floating tab bar. The illustration-heavy direction is no longer the default.

## What to review

1. **Home:** “Hello, <name>,” search, scrollable trip cards, clocks/weather, and “Plan your next trip here” when empty.
2. **Days:** the selected trip and date stay visible; the city map opens neighborhood views; activities form the daily timeline.
3. **Add:** choose a trip, choose a day/item type, then fill in the appropriate form.
4. **Items:** booking details, links, notes, editing, removal, and undo.
5. **Profile:** personal preferences, connections, groups, offline data, and backups.

The preview includes Seoul geography, a sample booking inbox, an illustrative AI itinerary change, and a sample shared-expense ledger. It has no connected email, AI, GitHub, weather, or payment service. The displayed local clock is calculated on the device; weather and booking data are examples.

Trip creation currently previews a name against sample content; it does not create a fully empty trip. The production create-trip and calendar flows are specified in the plan. Interaction checks passed for navigation, forms, editing/removal, map selection, sample imports, and expense calculations. The preview has not been verified on a real iPhone.

Use the preview's design controls to switch between **With trips** and **Empty** Home states, or compare warm and cool glass tones.

## Development documents

- [Complete implementation plan](trip-planner-implementation-plan.md): all features, screens, architecture, milestones, dependencies, acceptance checks, and approval scope.
- [API contract](trip-planner-api-contract.md): GitHub requests, weather integration, proposed backend endpoints, request/response bodies, imports, AI, expenses, offline sync, and errors.

## Proposed delivery

**Phase 1 — personal guide:** the working glass app, editable itineraries, city/neighborhood maps, clocks/weather, bookings, offline drafts, GitHub saves, and backup/restore.

**Phase 2 — connected guide:** a separate private backend for automatic booking imports, reviewed AI changes, and live group expenses. GitHub Pages continues to host the interface. These features require provider configuration and may incur costs; they are not promised as a static-only or entirely free system.

## Your decision

You can approve the full staged plan, approve Phase 1 only, or request changes. Approval starts implementation step by step; it does not purchase services or authorize payments.

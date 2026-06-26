## 1. Helpers and shared utilities

- [x] 1.1 Add a stable hash helper (e.g. djb2 or cyrb53) inside `<script setup>` for deterministic featured-crop and offset selection
- [x] 1.2 Add a `toRoman(n)` helper that converts 1–12 to uppercase Roman numerals and returns the input unchanged for other values
- [x] 1.3 Add a `pickSkeleton(count)` pure function that maps image count to skeleton key (`A | B | C | D`) per the spec thresholds
- [x] 1.4 Add an `isFeatured(skeleton, image, indexInMonth)` function that returns `true` when the stable hash falls within ~8% (excluding Skeleton C, capped at one per month)

## 2. Cinematic month header

- [x] 2.1 Replace the existing `game-month-title` text with the cinematic format `─── ACT <ROMAN> ── [ MM / YYYY ] ────────────►`
- [x] 2.2 Handle the `unknown` month key (no parseable `createdAt`) without breaking the layout

## 3. Skeleton A — Cinemascope Hero

- [x] 3.1 Render the single image at `max-width: 90vw`, centered, with `aspect-ratio: 16 / 10` (or `21 / 9` when featured)
- [x] 3.2 Add the 4px top and bottom letterbox bars via `box-shadow: inset 0 4px 0 #000, inset 0 -4px 0 #000`
- [x] 3.3 Implement the letterbox hover micro-action (bars shrink to 0 over 200ms)

## 4. Skeleton B — Anamorphic Duplet

- [x] 4.1 For 2 images: render in a flex container with `flex: 6` and `flex: 4`, both `aspect-ratio: 16 / 10`
- [x] 4.2 For 3 images: render a top row of two `flex: 1` tiles + a bottom full-width tile
- [x] 4.3 Implement the paired-shift hover micro-action (`-4px` / `+4px` on the wrapper hover)

## 5. Skeleton D — Magazine Mosaic

- [x] 5.1 Build a precomputed `rows` array per month: each row = list of `{ widthPct, offset }` tuples with widths drawn from `[100%, 80%, 60%, 40%]`
- [x] 5.2 Render rows using CSS grid with fractional column widths; apply `margin-left: auto` / `margin-right: auto` / `margin: 0 auto` for the three offset modes
- [x] 5.3 Wrap each tile image in a `magazine-tile` frame with `overflow: hidden`
- [x] 5.4 Implement the inner-zoom hover micro-action (`img` scales to 1.05 inside the frame)

## 6. Skeleton C — Filmstrip Timeline

- [x] 6.1 Render the strip as a horizontal flex container with `overflow-x: auto`, `scroll-snap-type: x mandatory`, and per-tile `min-width: 320px / max-width: 420px`
- [x] 6.2 Add per-tile `MM-DD` date labels below each image
- [x] 6.3 Add a `wheel` event listener that translates `event.deltaY` into horizontal `scrollLeft` change (skip when shift is held to preserve native vertical scroll)
- [x] 6.4 Add left/right arrow `<button>` overlays for keyboard and click navigation
- [x] 6.5 Implement the focus-lift hover micro-action (`translateY(-6px)` on the hovered tile, `opacity: 0.6` on siblings)

## 7. Unified hover base

- [x] 7.1 Apply `transform: scale(1.03)` and `box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18)` to every `game-tile` on hover with a 200ms transition
- [x] 7.2 Add the corner date label inside every tile with `opacity: 0 → 1` on hover

## 8. Skeleton dispatcher

- [x] 8.1 Replace the existing single `<div class="game-grid">` with a switch over `pickSkeleton(group.items.length)` rendering Skeleton A/B/C/D conditionally

## 9. Mobile fallback (≤768px)

- [x] 9.1 Add a `@media (max-width: 768px)` block that forces `grid-template-columns: 1fr` / `flex-direction: column` across all skeletons
- [x] 9.2 Remove Skeleton C's `overflow-x: auto` and `scroll-snap-type` on mobile
- [x] 9.3 Remove Skeleton D's left/right offsets on mobile
- [x] 9.4 Remove Skeleton B's 60/40 split on mobile (stack vertically)
- [x] 9.5 Remove Skeleton A's 4px letterbox bars on mobile

## 10. Cross-month fade

- [x] 10.1 Replace the existing `<div v-for>` with `<TransitionGroup name="month-fade">`
- [x] 10.2 Add `.month-fade-enter-active / .month-fade-leave-active { transition: opacity 0.25s ease }` plus the `enter-from` / `leave-to` opacity:0 states

## 11. Accessibility and theme

- [x] 11.1 Add a `@media (prefers-reduced-motion: reduce)` block that disables all transitions on `.game-tile` and skeleton-specific selectors
- [x] 11.2 Verify dark theme by ensuring no new color tokens are introduced (or, if added, paired with `:global(.dark-theme)` overrides)

## 12. Verification

- [ ] 12.1 Manually verify Skeleton A by adding a month with exactly 1 image
- [ ] 12.2 Manually verify Skeleton B with 2 and 3 images
- [ ] 12.3 Manually verify Skeleton D with 4–9 images and confirm offset variety
- [ ] 12.4 Manually verify Skeleton C with 10+ images including drag, wheel, and arrow navigation
- [ ] 12.5 Manually verify the cinematic header format for January, May, and December
- [ ] 12.6 Manually verify mobile fallback at 375px and 768px viewports
- [ ] 12.7 Toggle `prefers-reduced-motion` and confirm micro-actions and fades are disabled
- [ ] 12.8 Toggle dark theme and confirm no visual regressions
- [ ] 12.9 Click a tile in each skeleton at desktop and mobile widths and confirm the fullscreen modal opens via the existing `image-click` contract
- [ ] 12.10 Confirm `AdminGallery` type and `GalleryEditModal.vue` are unchanged (read-only diff check)
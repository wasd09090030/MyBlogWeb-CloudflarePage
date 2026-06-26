## Context

`GameGallerySection.vue` is the presentational component that renders the "game screenshot" tab on the gallery page (`/gallery`). Today it sorts `images` by `createdAt`, groups them by month, and renders each group inside a `display: grid` with `repeat(auto-fill, minmax(350px, 1fr))` and `gap: 1rem`. Each cell is a `<button>` containing an `<img>` with `object-fit: cover` and the cell's `aspectRatio` is set from `image.imageWidth / image.imageHeight`. Hover applies `transform: translateY(-4px)` and `box-shadow`. Clicking emits `image-click` to the parent, which opens the existing fullscreen modal in `GalleryContent.vue`.

The component is mounted conditionally inside `GalleryContent.vue` only when `activeTag === 'game'` and receives `images` (the filtered `gameGalleries`) plus an `image-click` listener. No state mutation, no fetch, no persistence — it is a pure renderer.

Constraints inherited from the proposal:
- No data model changes (use only `imageUrl`, `thumbnailUrl`, `imageWidth`, `imageHeight`, `createdAt`).
- No new dependencies.
- Dark-theme + `prefers-reduced-motion` must keep working.
- `<button>` semantics preserved (fullscreen modal must still open on click).

Stakeholders: blog author (visual preferences), readers on desktop and mobile.

## Goals / Non-Goals

**Goals:**
- Introduce four layout skeletons (A/B/C/D) auto-selected per month by image count.
- Standardize image aspect to 16:10 with a ~8% featured crop to 21:9 (stable hash).
- Restyle month headers in cinematic format with Roman numeral month.
- Ship a unified hover base plus one micro-action per skeleton.
- Collapse everything to a single-column vertical waterfall at `≤768px`.
- Preserve the existing `image-click` contract.

**Non-Goals:**
- Adding metadata (game name, scene, character) — out of scope per proposal.
- Changing admin UI, backend, or `AdminGallery` type.
- Modifying the artwork-side components or the fullscreen modal.
- Adding pagination or infinite scroll.
- Re-implementing the `image-click` → fullscreen pipeline.

## Decisions

### 1. Component shape: single SFC, in-place refactor

Keep everything inside `GameGallerySection.vue`. No new files. The `<template>` becomes a switch over `skeletonKey`, computed from `group.items.length`. Each skeleton is a `<div>` rendered conditionally. This keeps the change scoped (one component, one PR review) and matches the proposal's "scope: GameGallerySection.vue only" rule.

Alternatives considered:
- Split into `<SkeletonA/>`, `<SkeletonB/>`, etc. — rejected: 4 small components with no internal state, props identical, would inflate the component tree for no benefit.
- Extract to a composable `useGameGalleryLayout` — rejected: layout decisions are static per count, not stateful; a pure helper function is enough.

### 2. Skeleton selection: pure function of image count

```ts
function pickSkeleton(count) {
  if (count === 1) return 'A'
  if (count <= 3) return 'B'
  if (count <= 9) return 'D'
  return 'C'
}
```

Applied per month-group inside the existing `v-for`. No external state, no reactivity surprises. Stable for any given month.

### 3. Featured crop: deterministic hash, scoped per skeleton

```ts
function isFeatured(image, indexInMonth, skeletonKey) {
  // 8% probability, stable across renders, capped at 1 per skeleton
  const seed = `${skeletonKey}:${image.id ?? image.imageUrl}:${indexInMonth}`
  return hash(seed) % 100 < 8
}
```

The `skeletonKey` is part of the seed so that switching skeletons (which won't happen in practice, but defensively) doesn't double-count. Image inside a skeleton that hits the hash uses `aspect-ratio: 21 / 9` instead of `16 / 10`. Implementation note: a small `hash` helper (e.g. djb2 or cyrb53) is added in the `<script setup>` block; no external dependency.

### 4. Cinematic month header: derived string + decorative line

```ts
const toRoman = (n) => /* I, II, III ... XII */
const monthHeader = (date) => `─── ACT ${toRoman(month)} ── [ ${month} / ${year} ] ────────────►`
```

The trailing decorative line uses an em-dash + solid arrow character (`►`) — both already in the existing font stack. No icon font needed. The header is rendered as a `<div class="game-month-title">` whose `::after` pseudo-element could host the line, OR the line is just text — going with text for simplicity and i18n safety.

### 5. Skeleton A (Cinemascope Hero)

Layout: one centered image at `max-width: 90vw` with `aspect-ratio: 16 / 10` (or `21 / 9` if featured). Outer wrapper has 4px top/bottom black letterbox bars implemented via `box-shadow: inset 0 4px 0 #000, inset 0 -4px 0 #000` so the bars overlay the image edges.

Hover micro-action: on `:hover`, the bars shrink — change `box-shadow` to `inset 0 0 0 #000, inset 0 0 0 #000`. Transition 200ms ease.

### 6. Skeleton B (Anamorphic Duplet)

For 2 images: a flex container with `flex: 6 4 0` and `flex: 4 4 0` (or a CSS grid `grid-template-columns: 6fr 4fr`). Each tile `aspect-ratio: 16 / 10`. Hover on the wrapper translates left tile `-4px` and right tile `+4px` via `:hover` selectors scoped to the wrapper.

For 3 images: top row is `grid-template-columns: 1fr 1fr` (two 50% tiles), bottom row is one full-width tile. Same 16:10 aspect.

Featured crop rule still applies: if a tile is featured, it gets `aspect-ratio: 21 / 9` and stays the same column span.

### 7. Skeleton D (Magazine Mosaic)

A vertical stack of rows; each row contains 1–3 tiles in widths drawn from `[100%, 80%, 60%, 40%]`. Offsets: left-lean (`margin-right: auto`), right-lean (`margin-left: auto`), center (`margin: 0 auto`). Assignment is deterministic by hashing `(monthKey, imageIndex) % offsets.length`.

Row composition algorithm:
1. Pull widths from a fixed sequence per month (precomputed list, length = `items.length`).
2. Each row sums to `100%` (with `gap: 12px` factored in as fixed px not %, so use CSS grid `grid-template-columns` with named fractional widths).
3. Simplest implementation: precompute a `rows` array (each row = list of `{ widthPct, offset }` tuples), then render rows in a `<div v-for>`.

Featured crop: at most one image in the whole month becomes 21:9; the rest are 16:10.

Hover micro-action: each tile's inner `<img>` scales to 1.05; the tile frame stays still. Implemented by wrapping the image in a `<div class="magazine-tile">` with `overflow: hidden` and animating the `<img>` inside.

### 8. Skeleton C (Filmstrip Timeline)

Layout: `display: flex` with `overflow-x: auto`, `scroll-snap-type: x mandatory`. Each tile is a fixed-width column (e.g. `min-width: 320px; max-width: 420px`) with `aspect-ratio: 16 / 10`. Below each tile a small date label (`MM-DD`).

Navigation:
- Drag (touch + mouse) — handled natively by `overflow-x: auto` plus a small JS delta for inertia (optional, can defer).
- Mouse wheel horizontal — `wheel` listener that translates `event.deltaY` into `scrollLeft` change.
- Arrow buttons — left/right chevrons in absolute-positioned `<button>`s overlaying the strip.
- Keyboard — native scroll on focus; not strictly required for v1.

Date labels: render the date for each tile (or, to reduce visual noise, only show a label every N tiles, e.g. one per week). Going with **per-tile small label** to keep the design aligned with the proposal's "individual date labels" wording.

Hover micro-action: hovered tile translates `-6px` on Y; siblings get `opacity: 0.6` (achieved via `:hover ~ *` won't work cross-axis — use `group/filmstrip` parent class and `:hover .sibling { opacity: 0.6 }`).

### 9. Unified hover base

Every `<button class="game-tile">` shares:
```css
.game-tile {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  overflow: hidden;
  border-radius: 14px;
}
.game-tile:hover {
  transform: scale(1.03);
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
}
.game-tile:hover .game-tile-date {
  opacity: 1;
}
.game-tile-date {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 0.75rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  padding: 2px 8px;
  border-radius: 999px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
```

Each skeleton adds its own selector to layer the micro-action on top (e.g. `.skeleton-a:hover { box-shadow: inset 0 0 0 #000, inset 0 0 0 #000 }`).

### 10. Mobile fallback (≤768px)

A single `@media (max-width: 768px)` block overrides:
- All skeletons render as a single-column vertical stack (`grid-template-columns: 1fr` or `flex-direction: column`).
- Skeleton C's `overflow-x: auto` is removed; tiles stack vertically.
- Skeleton D's offsets collapse to `margin: 0`.
- Skeleton B's 60/40 split becomes 100% stacked.
- Skeleton A's 90vw becomes 100vw with no letterbox bars (cinema treatment reserved for desktop).
- Hover micro-actions remain harmless but `:hover` is unreliable on touch; visual feedback on tap is delegated to the existing `:active` state if needed.

### 11. Cross-month transition

Wrap each `v-for="group in groupedImages"` item in `<Transition name="month-fade">`:
```css
.month-fade-enter-active,
.month-fade-leave-active { transition: opacity 0.25s ease; }
.month-fade-enter-from,
.month-fade-leave-to { opacity: 0; }
```

This requires `<TransitionGroup>` instead of `Transition` because we have a list. Keep it simple — only opacity, no transform.

### 12. `prefers-reduced-motion` guard

```css
@media (prefers-reduced-motion: reduce) {
  .game-tile,
  .game-tile *,
  .skeleton-a,
  .skeleton-b,
  .skeleton-c,
  .skeleton-d {
    transition: none !important;
  }
}
```

Disables scale, letterbox shrink, paired shift, lift, inner zoom. The date label still fades in via opacity (acceptable).

## Risks / Trade-offs

- **[Risk]** Hash function mismatch between server and client could cause SSR/CSR hydration warnings if featured-crop classes differ → **Mitigation**: compute the hash only inside `<script setup>` (runs only on client because it's behind a v-if on the gallery being loaded) and gate the entire component render behind `ClientOnly` if needed — same pattern the repo already uses for animated backgrounds.
- **[Risk]** Skeleton C's horizontal scroll could conflict with vertical page scroll on trackpads → **Mitigation**: only translate horizontal delta when `event.shiftKey === false` OR deltaX is dominant; if deltaY is the only signal, allow native vertical scroll.
- **[Risk]** The Magazine mosaic's precomputed row layout could feel chaotic if the offset sequence repeats obviously → **Mitigation**: derive offsets from a per-month hash that varies with the month key (so two adjacent months rarely share an identical offset pattern).
- **[Risk]** 16:10 aspect ratio crops the bottom of 16:9 source images subtly → **Mitigation**: this is intentional and consistent with the proposal's "16:10 default" decision; the `object-fit: cover` behavior already exists.
- **[Risk]** Featured-crop 21:9 may over-crop screenshots that have UI at the top/bottom → **Mitigation**: limit featured crop to skeleton A or D only (where it lands as a single hero); exclude from skeleton B and C where it would interrupt the row rhythm.
- **[Trade-off]** More CSS rules means a slightly larger stylesheet → acceptable; component is loaded only when the game tab is selected.

## Migration Plan

No data migration. No backend changes. Deployment:
1. Land the change to `GameGallerySection.vue`.
2. Verify locally by switching to the game tab with sample images of 1, 3, 5, 12, 30 per month.
3. Verify mobile breakpoint at 375px and 768px.
4. Verify `prefers-reduced-motion` by toggling the OS setting.
5. Verify dark theme by toggling the `.dark-theme` class on `<body>`.
6. Rollback: revert the single file — no data, no API surface.

## Open Questions

- Whether to expose the skeleton dispatch thresholds (`1 / 3 / 9`) as props for tuning without a code change. Default: hard-code for v1, refactor later if needed.
- Whether the Filmstrip should remember scroll position across tab switches. Default: reset on tab switch (simpler).
- Whether the date label inside the Filmstrip should show full date or `MM-DD`. Default: `MM-DD` to stay compact.
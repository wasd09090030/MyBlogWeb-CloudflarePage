## Why

The Game Screenshot section of the gallery page (`GameGallerySection.vue`) currently renders every month as a uniform CSS grid. Because all game screenshots are widescreen (16:10 native, occasionally 21:9), the grid produces visually repetitive rows where every tile has the same shape, the same height, and the same hover behavior. The artwork side of the same page already provides four distinct visualizations (FadeSlideshow, AccordionGallery, CoverflowGallery, MasonryWaterfall), so users perceive the gallery as a whole as having visual rhythm — until they switch to the game tab, where the rhythm collapses.

This change brings the game section to the same level of visual variety by introducing four layout skeletons that auto-adapt to the number of images in each month, while preserving the existing data model and fullscreen interaction.

## What Changes

- Replace the single-grid layout in `GameGallerySection.vue` with a **skeleton dispatcher** that selects one of four layouts per month based on image count:
  - **Skeleton A · Cinemascope Hero** — 1 image per month
  - **Skeleton B · Anamorphic Duplet** — 2–3 images per month
  - **Skeleton D · Magazine Mosaic** — 4–9 images per month
  - **Skeleton C · Filmstrip Timeline** — 10+ images per month
- Default image aspect ratio changes from `image.width / image.height` to a fixed **16:10**; a stable hash (~8% hit rate) elevates one image per month to **21:9** for focal variety.
- Month headers are restyled to a cinematic format: `─── ACT V ── [ 05 / 2026 ] ────────────►` (Roman numeral for month).
- Hover behavior gains a unified base (scale + shadow + date label fade-in) plus one skeleton-specific micro-action (letterbox reveal / paired shift / focus lift / inner zoom).
- On viewports `≤768px` all four skeletons collapse to a **single-column vertical waterfall** (16:10 each, full width).
- Cross-month transitions use a simple 200–300ms fade; no morph animation between skeletons.

## Capabilities

### New Capabilities

- `game-screenshot-gallery`: Defines the layout skeletons, dispatch rules, hover behavior, and mobile fallback for the Game Screenshot section of the gallery page.

### Modified Capabilities

_None._ This change is scoped to a single presentational component and does not alter any existing spec-level behavior. Admin UI, data model, and fullscreen interaction are unchanged.

## Impact

- **Code touched**: `nuxt/app/features/gallery-public/components/GameGallerySection.vue` only.
- **Files unchanged**: `GalleryContent.vue`, `GalleryPageContainer.vue`, `useGalleryFeature.ts`, `AdminGallery` type, `GalleryEditModal.vue`, backend, admin routes.
- **New dependencies**: none.
- **Browser support**: no new APIs beyond what the current component already uses (`aspect-ratio`, CSS transitions, `IntersectionObserver` not required). `prefers-reduced-motion` must disable the micro-action animations.
- **Accessibility**: hover-only effects remain supplements to click — every tile stays a `<button>` that opens the existing fullscreen modal on activation.
- **Theme**: light/dark theme behavior is preserved (no color tokens are introduced; only layout/transform/opacity rules).
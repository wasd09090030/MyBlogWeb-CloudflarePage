## Context

`nuxt-public` is the static public frontend. The gallery page is rendered by `GalleryPageContainer.vue`, which fetches gallery data during SSG through `gallery.repository.ts`, then passes filtered `artworkGalleries` and `gameGalleries` into `GalleryContent.vue`.

Current public gallery structure:

- `GalleryContent.vue` controls tab switching and fullscreen modal wiring.
- `GalleryHeroSection.vue` renders several artwork hero experiments.
- `GalleryMasonryList.vue` already handles responsive masonry, lazy image loading, placeholders, infinite loading, and `image-click` emission.
- `GameGallerySection.vue` already groups screenshots by month and contains the previous four skeletons, including the weak Magazine Mosaic implementation.
- `masonryLayout.ts` already provides stable image keys, dimension/aspect helpers, stable shuffle, column count, and masonry distribution.

The new work must stay inside `nuxt-public`. It must not add data fields, change the API, or rely on runtime server behavior.

## Goals / Non-Goals

**Goals:**

- Add a month-level timeline to the public gallery, using months as the primary navigation unit.
- Keep the right-side image area visually rich while preserving the existing fullscreen interaction.
- Reuse the existing image loading and masonry helpers instead of rebuilding them.
- Replace the loose Magazine Mosaic with a deterministic editorial grid that looks designed at 4-6, 7-9, and 10+ image counts.
- Provide a mobile layout where the timeline becomes a top horizontal month rail and images remain easy to scan.
- Handle missing or invalid timestamps without breaking layout.

**Non-Goals:**

- No backend, admin UI, database, or API changes.
- No new dependencies.
- No change to the `nuxt/` SSR frontend.
- No new metadata such as game name, location, camera, or album type.
- No full page routing changes; `/gallery` remains the public gallery route.
- No complex scroll-linked animation system for v1.

## Decisions

### 1. Timeline lives at the gallery content composition layer

Implement the timeline layout around the existing image sections, most likely in `GalleryContent.vue` or a small feature component under `nuxt-public/app/features/gallery-public/components/`.

Rationale:

- `GalleryContent.vue` already owns the artwork/game branch and fullscreen modal contract.
- `GalleryPageContainer.vue` should remain data/state orchestration and not absorb presentation layout.
- Keeping the layout in the gallery feature avoids leaking gallery-specific month behavior into unrelated shared UI.

Alternative considered: place the whole timeline in `GalleryPageContainer.vue`. Rejected because it would mix page data orchestration with detailed visual composition.

### 2. Month grouping is a pure utility

Add a pure helper for grouping gallery items by month, using existing fields only:

- Primary timestamp fields: `createdAt`, then existing known variants such as `created_at` or `created`.
- Sort order: newest month first.
- Fallback group: `unknown` / `未归档` for missing or invalid dates.

Rationale:

- Artwork and game images can share the same grouping logic.
- Pure helpers are easy to verify and do not depend on browser APIs.
- This keeps SSR/SSG output deterministic.

Alternative considered: duplicate grouping logic in each component. Rejected because `GameGallerySection.vue` already has local month logic, and duplicating it again would make future fixes inconsistent.

### 3. Timeline behavior stays simple and robust

Desktop:

- Use a two-column layout: left sticky timeline, right image area.
- Timeline items are anchor-like buttons or links pointing to month section IDs.
- Active month highlighting can be implemented with `IntersectionObserver`, but the first implementation should still work without it.

Mobile:

- Collapse the sticky sidebar into a top horizontal month rail.
- Keep month labels compact (`YYYY.MM` or `MM / YYYY`) to avoid wrapping.
- Image sections stack below the rail.

Rationale:

- CSS sticky plus anchors is stable for SSG and low-maintenance.
- Avoiding mandatory scroll-linked animation reduces performance risk.
- The layout remains usable even if JavaScript observers fail.

Alternative considered: a fully synchronized scroll spy with animated timeline progress. Rejected for v1 because it adds complexity without solving the core visual problem.

### 4. Right-side image area reuses masonry first

For general artwork browsing, reuse or extend `GalleryMasonryList.vue` rather than replacing it.

The timeline month sections should render month-scoped image groups. Each group can use a masonry/grid variant that preserves:

- existing `ImageLoadingPlaceholder`;
- thumbnail first with full image fallback;
- aspect-ratio stability from `masonryLayout.ts`;
- `image-click` emission.

Rationale:

- The existing masonry component already solves lazy loading, load-more, measurement, and stable layout.
- The requested change is information architecture and mosaic quality, not a new loader.

Alternative considered: write a brand-new image grid component for all images. Rejected because it would duplicate working loading and layout code.

### 5. Magazine Mosaic becomes an editorial grid template

Replace the current Magazine Mosaic algorithm based on loose `100/80/60/40%` widths and left/right/center offsets with a deterministic 12-column editorial grid.

Template behavior:

- 4-6 images: one large feature tile plus 3-5 supporting tiles.
- 7-9 images: two-row spread with one feature tile, one tall tile, and supporting tiles.
- 10+ images: repeat editorial blocks for the first 9-12 images, then route the remainder through the existing masonry flow or a compact repeated block.
- Fewer than 4 images: do not force Magazine Mosaic; use the existing small-count layouts or a simple grid fallback.

Tile sizing uses named spans instead of random width percentages:

- feature: spans 6-8 columns and 2 rows;
- tall: spans 3-4 columns and 2 rows;
- medium: spans 4 columns and 1 row;
- small: spans 3 columns and 1 row.

Rationale:

- A 12-column grid gives the mosaic an intentional magazine spread structure.
- Deterministic templates prevent the same dataset from shifting unpredictably across builds.
- The fallback keeps sparse months from looking broken.

Alternative considered: keep the current offset rows and tune spacing. Rejected because the underlying structure is the problem; rows with arbitrary widths still read as accidental when image counts vary.

### 6. Keep the fullscreen contract unchanged

Every visible image tile must continue to emit `image-click` with the original image object. `GalleryContent.vue` should keep opening the existing fullscreen modal.

Rationale:

- The modal already supports zoom, drag, close, and image fallback.
- This change is presentational and should not alter behavior users already rely on.

### 7. Shared UI extraction is limited

Only extract a shared timeline component to `nuxt-public/app/shared/ui` if it is genuinely generic and reusable. Otherwise, keep it under `features/gallery-public/components`.

Rationale:

- Project rules prefer custom non-Naive UI pieces in `shared/ui`, but gallery-specific month grouping and image anchors are not necessarily reusable.
- Premature extraction would create an abstraction with one consumer.

## Risks / Trade-offs

- **[Risk]** Month grouping could reorder images unexpectedly if some records lack `createdAt` -> **Mitigation**: sort dated groups newest first and put invalid dates into a clearly labeled `未归档` group at the end.
- **[Risk]** Sticky timeline can consume too much space on medium screens -> **Mitigation**: switch to the horizontal month rail before the layout becomes cramped, not only at phone width.
- **[Risk]** Per-month masonry may render more component instances than the current single masonry list -> **Mitigation**: keep month sections lightweight and preserve lazy image loading; if many tiny months exist, batch small groups or reuse a single masonry list with month anchors.
- **[Risk]** Editorial mosaic templates may crop important screenshot UI -> **Mitigation**: use `object-fit: cover` only in mosaic tiles and keep fullscreen click available; fallback to masonry for image counts or aspect ratios that do not fit the template.
- **[Risk]** Active timeline highlighting can cause hydration mismatch if initialized differently server/client -> **Mitigation**: render a deterministic default active month from data, then update active state only after `onMounted`.

## Migration Plan

1. Implement pure month grouping and section ID helpers in `nuxt-public/app/features/gallery-public/utils/`.
2. Add timeline layout composition around gallery image sections.
3. Reuse or extend `GalleryMasonryList.vue` for month-scoped right-side image rendering.
4. Replace the Magazine Mosaic implementation with deterministic 12-column templates.
5. Validate desktop layout, mobile rail, unknown-date fallback, fullscreen click behavior, and dark theme.
6. Rollback by reverting the `nuxt-public` files touched by this change; no data migration is involved.

## Open Questions

- Whether the timeline should include both artwork and game images under the active tab only, or show a global month index across both categories. Default: active tab only, because it matches current tab behavior.
- Whether the first desktop viewport should still include the existing hero experiments above the timeline. Default: integrate the timeline into the main content and avoid an extra hero layer competing with it.
- Whether active month highlighting is required in the first implementation. Default: anchors are required; scroll-spy highlighting is a quality enhancement if it remains simple.

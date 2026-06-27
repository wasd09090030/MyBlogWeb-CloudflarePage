## Why

The current public gallery still reads as a set of disconnected visual experiments: the page lacks a clear month-level navigation structure, and the Magazine Mosaic treatment from `gallery-screenshot-redesign` is the weakest layout because its offset rows feel loose rather than intentionally editorial.

This change gives `/gallery` a stronger information architecture: a month timeline on the left and a cohesive image area on the right, while replacing the loose mosaic with a deterministic magazine-style grid that can hold varied image counts without looking random.

## What Changes

- Add a desktop gallery layout with a sticky left timeline grouped by month and a right-side image area.
- Use month as the primary navigation unit for public gallery browsing; timeline items jump to the corresponding month section.
- On mobile, collapse the left timeline into a horizontal month rail above the image area.
- Group gallery images by `createdAt` month, with a graceful fallback for missing or invalid timestamps.
- Preserve the existing fullscreen interaction: every tile still emits the existing `image-click` flow.
- Rework the Magazine Mosaic layout from loose width/offset rows into a deterministic editorial grid:
  - 4-6 images: compact feature-led mosaic.
  - 7-9 images: balanced magazine spread.
  - 10+ images: repeated editorial blocks before falling back to the existing masonry flow.
- Reuse existing thumbnail loading, placeholders, gallery key helpers, and masonry behavior where possible.
- Do not change backend APIs, admin gallery data, `nuxt/`, `backend-dotnet/`, or `cloudflare-worker/`.

## Capabilities

### New Capabilities

- `gallery-timeline-layout`: Defines the public gallery's month timeline, right-side image area, responsive behavior, month grouping fallback, and redesigned magazine mosaic requirements.

### Modified Capabilities

_None._ No existing baseline spec exists under `openspec/specs/`, and the previous `gallery-screenshot-redesign` change is a completed change artifact rather than an active baseline capability.

## Impact

- **Code touched**: `nuxt-public/app/features/gallery-public/components/*`, `nuxt-public/app/features/gallery-public/utils/*`, and only if needed `nuxt-public/app/shared/ui/*`.
- **Likely integration points**: `GalleryContent.vue`, `GalleryMasonryList.vue`, `GameGallerySection.vue`, and `masonryLayout.ts`.
- **Code not touched**: `nuxt/`, `backend-dotnet/`, `cloudflare-worker/`, admin UI, gallery API contracts, database schema.
- **Dependencies**: no new runtime dependencies.
- **Rendering model**: compatible with the current Nuxt 3 SSG payload flow in `gallery.repository.ts`.
- **Accessibility**: timeline navigation must be keyboard reachable; image tiles must keep button/link semantics that open the existing fullscreen modal.

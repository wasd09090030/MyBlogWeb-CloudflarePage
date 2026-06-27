## 1. Month Grouping Utilities

- [x] 1.1 Add a pure month grouping helper under `nuxt-public/app/features/gallery-public/utils/` that groups images by calendar month using existing timestamp fields.
- [x] 1.2 Add stable month section ID and readable month label helpers, including a fallback label for missing or invalid timestamps.
- [x] 1.3 Reuse existing gallery key/aspect helpers from `masonryLayout.ts` where possible instead of duplicating key or dimension logic.

## 2. Timeline Layout Composition

- [x] 2.1 Add a gallery timeline layout component in `nuxt-public/app/features/gallery-public/components/` or a narrowly scoped shared UI component if reuse is justified.
- [x] 2.2 Render a desktop two-column layout with a sticky left timeline and right-side month sections.
- [x] 2.3 Render a mobile horizontal month rail above the image area at the narrow breakpoint.
- [x] 2.4 Wire timeline items to stable month section targets and preserve keyboard activation.
- [x] 2.5 Optionally add client-only active month highlighting with `IntersectionObserver`, keeping anchor navigation functional without it.

## 3. Right-Side Image Area

- [x] 3.1 Integrate the timeline layout into `GalleryContent.vue` without moving data fetching out of `GalleryPageContainer.vue`.
- [x] 3.2 Render month-scoped image groups for the active tab only.
- [x] 3.3 Preserve existing thumbnail-first image rendering, loading placeholders, lazy loading, and full-image fallback behavior.
- [x] 3.4 Preserve the existing `image-click` emission path so the fullscreen modal still opens from every tile.

## 4. Magazine Mosaic Redesign

- [x] 4.1 Replace the current loose width/offset Magazine Mosaic algorithm with deterministic 12-column editorial grid templates.
- [x] 4.2 Implement a 4-6 image compact mosaic template with one feature tile and supporting tiles.
- [x] 4.3 Implement a 7-9 image balanced spread template with feature, tall, medium, and small tile roles.
- [ ] 4.4 Implement 10+ image handling with repeated editorial blocks and a compact repeated block or existing masonry fallback for overflow images.
- [x] 4.5 Add graceful fallback for fewer than 4 images and for missing image dimensions.
- [x] 4.6 Keep the mosaic deterministic for the same input image set across reloads and static builds.

## 5. Styling and Responsiveness

- [x] 5.1 Add desktop timeline, image section, and editorial mosaic styles with stable dimensions and no text overlap.
- [x] 5.2 Add mobile styles that collapse the sidebar into a horizontal month rail and stack image sections cleanly.
- [x] 5.3 Add dark-theme compatible colors or reuse existing theme variables.
- [x] 5.4 Add `prefers-reduced-motion` handling so the layout remains usable without motion effects.

## 6. Verification

- [x] 6.1 Verify desktop `/gallery` shows the left month timeline and right image area for artwork.
- [x] 6.2 Verify switching to game screenshots updates the timeline to game months only.
- [x] 6.3 Verify clicking timeline items navigates to the correct month sections on desktop and mobile.
- [ ] 6.4 Verify images with missing or invalid timestamps render in the fallback group.
- [ ] 6.5 Verify Magazine Mosaic layouts for 4-6, 7-9, and 10+ image groups.
- [x] 6.6 Verify every tile still opens the existing fullscreen modal.
- [ ] 6.7 Verify no files outside `nuxt-public` and this OpenSpec change were modified.
- [x] 6.8 Run an appropriate local static check or targeted Nuxt validation command for `nuxt-public`.

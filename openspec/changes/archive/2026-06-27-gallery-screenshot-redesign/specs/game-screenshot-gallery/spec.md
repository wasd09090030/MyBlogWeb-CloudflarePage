## ADDED Requirements

### Requirement: Skeleton selection by month image count

The system SHALL select exactly one of four layout skeletons per month group based on the number of images in that month, using the following mapping:

- 1 image → **Cinemascope Hero (Skeleton A)**
- 2 or 3 images → **Anamorphic Duplet (Skeleton B)**
- 4 to 9 images → **Magazine Mosaic (Skeleton D)**
- 10 or more images → **Filmstrip Timeline (Skeleton C)**

The selection SHALL be deterministic for any given count and SHALL NOT depend on viewport size.

#### Scenario: Month with single image uses Cinemascope Hero
- **WHEN** a month group contains exactly 1 image
- **THEN** the system renders that month using Skeleton A

#### Scenario: Month with two images uses Anamorphic Duplet
- **WHEN** a month group contains 2 images
- **THEN** the system renders that month using Skeleton B

#### Scenario: Month at the lower boundary of Magazine Mosaic
- **WHEN** a month group contains exactly 4 images
- **THEN** the system renders that month using Skeleton D

#### Scenario: Month at the upper boundary of Magazine Mosaic
- **WHEN** a month group contains exactly 9 images
- **THEN** the system renders that month using Skeleton D

#### Scenario: Month at the boundary switches to Filmstrip Timeline
- **WHEN** a month group contains 10 or more images
- **THEN** the system renders that month using Skeleton C

### Requirement: Standard image aspect ratio with featured crop

The system SHALL render each game screenshot at an aspect ratio of **16:10** by default.

The system SHALL apply an aspect ratio of **21:9** to a single image per month at an approximate hit rate of **8%**, chosen by a stable hash of `(skeleton, imageId, imageIndexInMonth)`. The featured crop MUST NOT apply to Skeleton C or to more than one image per month.

#### Scenario: Default image aspect is 16:10
- **WHEN** an image is rendered and is not the featured image of its month
- **THEN** its rendered aspect ratio is 16:10

#### Scenario: Featured crop elevates one image to 21:9
- **WHEN** an image's stable hash falls within the 8% threshold for its month
- **THEN** the system renders that image at 21:9 instead of 16:10

#### Scenario: Featured crop never applies inside Filmstrip Timeline
- **WHEN** a month uses Skeleton C (10+ images)
- **THEN** no image in that month receives the 21:9 aspect ratio

### Requirement: Cinematic month header

The system SHALL render each month group header in the format:

```
─── ACT <ROMAN_MONTH> ── [ <ARABIC_MONTH> / <YEAR> ] ────────────►
```

Where `<ROMAN_MONTH>` is the month number expressed as a Roman numeral (I–XII), `<ARABIC_MONTH>` is the two-digit month number, and `<YEAR>` is the four-digit year.

#### Scenario: May 2026 renders the cinematic header
- **WHEN** the system renders a month group for May 2026
- **THEN** the header text reads `─── ACT V ── [ 05 / 2026 ] ────────────►`

#### Scenario: December renders as ACT XII
- **WHEN** the system renders a month group for December 2026
- **THEN** the Roman numeral portion of the header is `XII`

#### Scenario: Months without a valid timestamp fall back gracefully
- **WHEN** the source image lacks a parseable `createdAt`
- **THEN** the system groups it under a `unknown` key and renders the same cinematic header with the unknown indicator

### Requirement: Unified hover base

The system SHALL apply a common hover base to every game tile across all four skeletons:

- `transform: scale(1.03)`
- `box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18)`
- A date corner label that transitions from `opacity: 0` to `opacity: 1` over 200ms

#### Scenario: Hovering any tile triggers the unified base
- **WHEN** the user hovers any game tile
- **THEN** the tile scales to 1.03, gains the shadow, and the date label fades in

#### Scenario: Leaving the tile reverts the unified base
- **WHEN** the user moves the pointer away from a hovered tile
- **THEN** the tile returns to its default scale and shadow and the date label fades out

### Requirement: Skeleton-specific hover micro-action

The system SHALL layer exactly one micro-action per skeleton on top of the unified hover base:

- **Skeleton A** — top and bottom 4px black letterbox bars shrink to 0px on hover
- **Skeleton B** — paired tiles shift apart by ±4px on hover of the wrapper
- **Skeleton C** — hovered tile translates up by 6px and adjacent tiles dim to `opacity: 0.6`
- **Skeleton D** — the inner image scales to 1.05 while the frame itself stays still

#### Scenario: Cinemascope letterbox reveal on hover
- **WHEN** the user hovers a Skeleton A tile
- **THEN** the top and bottom letterbox bars shrink to zero height

#### Scenario: Anamorphic paired shift on hover
- **WHEN** the user hovers a Skeleton B wrapper
- **THEN** the left tile translates -4px on X and the right tile translates +4px on X

#### Scenario: Filmstrip focus on hover
- **WHEN** the user hovers a Skeleton C tile
- **THEN** the hovered tile translates -6px on Y and all sibling tiles dim to opacity 0.6

#### Scenario: Magazine inner zoom on hover
- **WHEN** the user hovers a Skeleton D tile
- **THEN** the inner image scales to 1.05 while the tile frame's outer size stays unchanged

### Requirement: Mobile single-column fallback

The system SHALL collapse all four skeletons to a single-column vertical waterfall when the viewport width is `≤768px`. The fallback MUST:

- Render every tile at full container width with `aspect-ratio: 16 / 10`
- Remove horizontal scroll from Skeleton C
- Remove offset/mosaic positioning from Skeleton D
- Stack Skeleton B tiles vertically instead of side-by-side
- Remove the 4px letterbox bars from Skeleton A

#### Scenario: Tablet width renders the desktop layout
- **WHEN** the viewport width is 769px or wider
- **THEN** the system renders the skeleton that matches the month image count

#### Scenario: Mobile width collapses to single column
- **WHEN** the viewport width is 768px or narrower
- **THEN** every tile renders at full container width in a single vertical stack regardless of skeleton

#### Scenario: Filmstrip becomes vertical on mobile
- **WHEN** a month uses Skeleton C and the viewport is ≤768px
- **THEN** the tiles render as a vertical stack rather than a horizontal scroll

### Requirement: Cross-month fade transition

The system SHALL fade each month group in and out over 200–300ms when the list of months changes. The transition MUST animate `opacity` only and MUST NOT morph between skeletons.

#### Scenario: Adding a month fades it in
- **WHEN** a new month group appears in the rendered list
- **THEN** the new group transitions from `opacity: 0` to `opacity: 1` over 200–300ms

#### Scenario: Removing a month fades it out
- **WHEN** a month group is removed from the rendered list
- **THEN** that group transitions from `opacity: 1` to `opacity: 0` over 200–300ms

### Requirement: Reduced motion accessibility

The system SHALL disable all hover micro-actions and the cross-month fade when `prefers-reduced-motion: reduce` is set. The unified hover base (scale + shadow) SHALL also be disabled.

#### Scenario: Reduced motion disables micro-actions
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** none of the skeleton-specific micro-actions (letterbox shrink, paired shift, filmstrip focus, magazine inner zoom) animate

#### Scenario: Reduced motion disables cross-month fade
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** month groups appear and disappear instantly without the opacity transition

### Requirement: Preserve fullscreen interaction

The system MUST continue to emit `image-click` from every tile regardless of skeleton, so that the existing fullscreen modal in `GalleryContent.vue` opens as it does today. Click activation MUST work on every skeleton at every viewport size.

#### Scenario: Clicking any tile opens fullscreen
- **WHEN** the user clicks (or taps on touch) any game tile
- **THEN** the component emits `image-click` with the corresponding image object

#### Scenario: Click works on mobile fallback
- **WHEN** the viewport is ≤768px and the user taps a tile in the single-column fallback
- **THEN** the component emits `image-click` and the fullscreen modal opens

### Requirement: Preserve data model

The system SHALL NOT add new fields to the gallery data model and SHALL NOT modify the `AdminGallery` type, the admin modal, or any backend code. All visual decisions MUST derive from the existing fields: `imageUrl`, `thumbnailUrl`, `imageWidth`, `imageHeight`, `createdAt`.

#### Scenario: No new data fields required
- **WHEN** the system renders the game screenshot section
- **THEN** it requires only the existing `imageUrl`, `thumbnailUrl`, `imageWidth`, `imageHeight`, and `createdAt` fields

#### Scenario: AdminGallery type unchanged
- **WHEN** the change is complete
- **THEN** the `AdminGallery` type definition in `nuxt/app/types/api.ts` is unchanged
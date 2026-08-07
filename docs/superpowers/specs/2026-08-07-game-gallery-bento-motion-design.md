# Game Gallery Bento And Motion Design

## Goal

Replace the desktop game-screenshot layouts that switch between several unrelated
display modes with one aspect-ratio-aware Bento presentation. Add a restrained,
game-inspired motion language to category switching, month-grid entry, and
fullscreen viewing.

## Scope

- Change only the game screenshot path in `nuxt-public/app/features/gallery-public/`.
- Keep the current mobile single-column layout unchanged.
- Preserve existing image loading, fullscreen zoom/drag, grouping by month, and
  all artwork-gallery behavior.

## Desktop Bento

### Visual rules

- Every game screenshot tile is square-cornered (`border-radius: 0`) and has no
  box shadow in resting, hover, or transition states.
- Tiles use only horizontal roles. The visual hierarchy comes from width, never
  from a tall portrait or a poster-like feature tile.
- The first image in each month is the feature image. It is wider than the other
  tiles but retains its source aspect ratio.
- A month with more images continues the same grid rhythm in subsequent blocks;
  it must not change to a horizontal filmstrip. Each block may use one of the
  approved Bento variants, but all variants retain the same hard-edged,
  shadow-free, horizontal-image language.
- A short final row may remain short. The implementation must not stretch a tile
  or change modes solely to fill the row.

### Variant selection and compact months

- Provide exactly three desktop Bento variants: `A` (feature image with a side
  column), `B` (compact three-column contact sheet), and `C` (wide primary area
  with a secondary contact sheet).
- Variant `C` must not use a full-width feature image. Cap the complete block at
  `1080px`; use a seven-column feature image and a five-column companion image,
  followed by four three-column secondary tiles. This keeps low-resolution game
  screenshots below an oversized poster-like display scale.
- Select the first variant by a stable hash of the month key. A given month must
  retain its variant across visits while different months naturally vary.
- For months requiring multiple six-image blocks, use the selected variant as
  the first block and progress through the remaining `A -> B -> C` order. This
  prevents a long month from repeating one block while remaining stable.
- A month with one image renders the image centered with a maximum desktop width
  of `640px`. A two-image month uses a compact two-column layout capped at
  `820px`; a three-image month uses equal columns capped at `980px`.
- The compact one-, two-, and three-image presentations are scale constraints
  within the same game-gallery language, not additional image viewer modes.

### Aspect handling

- Images identified as `16:9` and `16:10` receive predefined, compatible grid
  spans. The image and tile aspect ratios match, so `object-fit: cover` does not
  impose meaningful crop on these supported ratios.
- Images without usable dimensions use `16:10` as the existing fallback.
- The layout may use a small finite set of patterns for placement, but each
  pattern must use the same tile styles, gaps, and width-based hierarchy. Count
  changes may add rows, not introduce a different presentation model.

### Hover behavior

- Hover may use a short image-scale or translation effect.
- Hover must not add a card shadow, round the tile, or cause layout reflow.

## Motion Language

The visual direction is "portfolio-style camera push": concise opacity and
position transitions, with a feature image acting as the visual origin. It must
not use scanlines, flashing, elastic bounce, or persistent glow.

| Interaction | Behavior | Target duration |
| --- | --- | --- |
| Artwork/Game category | Old content exits quickly; the new category enters with a small upward camera push and opacity transition. | 280-360ms |
| Month Bento entry | Tiles animate once when their grid first enters the viewport. The feature tile leads and remaining tiles follow with a 35-55ms stagger. | 260-380ms per tile |
| Open fullscreen | Capture the clicked tile's bounds and use a temporary transition layer to grow from that location to the centered fullscreen image. | 300-360ms |
| Close fullscreen | Reverse the opening direction to the source tile when it remains available; otherwise use a brief opacity exit. | 220-280ms |

## Accessibility And Interaction Constraints

- Under `prefers-reduced-motion: reduce`, do not animate category changes,
  Bento entry, or fullscreen transitions. State changes remain immediate and
  functional.
- The existing tile buttons and fullscreen controls retain their current
  keyboard and pointer behavior.
- The entry animation runs only once per month grid in a page lifetime. It must
  not replay when users scroll back to a previously viewed month.
- The fullscreen transition layer is decorative only and must not intercept
  pointer events or delay opening the actual dialog-like viewer.

## Implementation Boundaries

- Refactor `GameGallerySection.vue` to remove skeleton A/B/C/D presentation
  branches and replace them with one desktop Bento renderer plus the existing
  mobile single-column rules.
- Add a small pure layout utility for normalized aspect roles and repeatable
  pattern assignment if keeping it in the component would obscure rendering.
- Extend the event emitted from a game tile only as needed to pass source bounds
  to the existing fullscreen state. Do not rewrite the zoom-and-drag subsystem.
- Keep desktop/mobile style files physically separated according to repository
  conventions; do not add a mixed responsive stylesheet.

## Verification

- Inspect desktop months with 1, 2-3, 4-9, and 10+ screenshots. Confirm every
  case uses the same Bento visual language, has no tile radius or shadows, and
  remains free of unintended crop for `16:9` and `16:10` sources.
- Inspect the existing mobile breakpoint and confirm the current single-column
  game gallery is unchanged.
- Verify category switching, one-time month entry, fullscreen open, and
  fullscreen close in a browser, including keyboard activation of a tile.
- Verify reduced-motion mode produces immediate functional changes.

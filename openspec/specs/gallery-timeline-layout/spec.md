## Purpose

The public gallery at `/gallery` SHALL render an editorial timeline (magazine "table of contents") alongside the image area so users can navigate large image collections by year and month without losing context of the current position. The timeline SHALL be visual-first: image counts are conveyed by proportional fill bars and ornaments instead of numeric labels, the layout SHALL avoid scrollbars in favor of page flow and wrap, and the vertical main rail and active-month indicators SHALL keep the user's position clearly anchored across desktop and mobile viewports.
## Requirements
### Requirement: Desktop month timeline layout
The public gallery SHALL render a two-column layout on desktop-class viewports with a month timeline on the left and the image area on the right.

The timeline SHALL be grouped by month and SHALL use the currently active gallery category data rather than mixing hidden tab content into the visible index.

The left rail SHALL contain no internal scrollbar on desktop-class viewports; its height follows the page flow while remaining sticky so the active month is always visible.

#### Scenario: Desktop gallery shows timeline and image area
- **WHEN** the user opens `/gallery` on a desktop-class viewport and gallery images are available
- **THEN** the system renders a left month timeline and a right image area

#### Scenario: Timeline follows active tab
- **WHEN** the user switches between artwork and game screenshot tabs
- **THEN** the timeline updates to reflect the months available in the active tab

#### Scenario: Rail has no internal scrollbar on desktop
- **WHEN** the user opens `/gallery` on a desktop-class viewport
- **THEN** the left rail contains no internal scrollbar
- **AND** its height follows the page flow and remains sticky so the active month is visible

### Requirement: Timeline month navigation
The timeline SHALL provide one reachable navigation item per month group. Activating a timeline item SHALL move the user to the corresponding month section in the right-side image area.

Each month section SHALL have a stable section identifier derived from the month key.

#### Scenario: Selecting a month jumps to its section
- **WHEN** the user activates a timeline item for a month
- **THEN** the right-side image area scrolls or jumps to that month section

#### Scenario: Month section IDs are stable
- **WHEN** the same gallery data is rendered across builds
- **THEN** each month section receives the same stable identifier

### Requirement: Mobile timeline rail
The public gallery SHALL collapse the left timeline into a horizontal month rail on mobile and narrow tablet viewports where a sidebar would crowd the image area.

The mobile rail MUST remain above the image area and MUST preserve month navigation behavior.

The mobile rail MUST wrap months to multiple rows and MUST NOT introduce a horizontal scrollbar.

#### Scenario: Mobile renders top month rail
- **WHEN** the viewport is narrow enough that a sidebar would crowd the gallery
- **THEN** the timeline renders as a horizontal month rail above the image area

#### Scenario: Mobile rail navigates to month section
- **WHEN** the user taps a month in the mobile rail
- **THEN** the page moves to the corresponding month section

#### Scenario: Mobile rail wraps without horizontal scrollbar
- **WHEN** the viewport is narrow
- **THEN** the rail wraps months to multiple rows without showing a horizontal scrollbar
- **AND** the vertical main rail converts to a horizontal 1px gradient hairline below the rail container

### Requirement: Month grouping fallback
The system SHALL group gallery images by calendar month using existing timestamp fields only.

Images with missing or invalid timestamps SHALL render in a fallback group labeled as unarchived or unknown, and this fallback group SHALL NOT prevent dated groups from rendering.

#### Scenario: Valid timestamp creates month group
- **WHEN** an image has a valid `createdAt` timestamp
- **THEN** the system groups it under the matching calendar month

#### Scenario: Invalid timestamp uses fallback group
- **WHEN** an image has no parseable timestamp
- **THEN** the system renders it in the fallback unarchived month group

#### Scenario: Dated groups remain ordered
- **WHEN** dated and undated images are present together
- **THEN** dated month groups render newest first and the fallback group renders separately

### Requirement: Right-side image area preserves existing image behavior
The right-side image area SHALL preserve the existing gallery image behavior: thumbnail-first rendering, full-image fallback on thumbnail failure, loading placeholders, lazy image loading, and `image-click` emission for fullscreen viewing.

The right-side image area SHALL NOT render any image count number alongside its month title; density is communicated by the left rail fill-bar only.

#### Scenario: Clicking image opens fullscreen
- **WHEN** the user clicks or taps any image tile in the right-side image area
- **THEN** the system emits the existing `image-click` flow and opens the fullscreen modal

#### Scenario: Thumbnail failure falls back
- **WHEN** a tile thumbnail fails to load and a full image URL exists
- **THEN** the system attempts to render the full image URL

#### Scenario: Month section title does not display image count
- **WHEN** the gallery renders a month section
- **THEN** the month title renders without an adjacent "X 张" or numeric count

### Requirement: Redesigned Magazine Mosaic editorial grid
The Magazine Mosaic layout SHALL use a deterministic editorial grid instead of loose random-width offset rows.

The grid SHALL be based on a 12-column structure with named tile roles such as feature, tall, medium, and small. Layout selection SHALL be deterministic for the same input images.

#### Scenario: Four to six images use compact editorial mosaic
- **WHEN** a month or mosaic group contains 4 to 6 images
- **THEN** the system renders a compact editorial mosaic with one feature tile and supporting tiles

#### Scenario: Seven to nine images use balanced spread
- **WHEN** a month or mosaic group contains 7 to 9 images
- **THEN** the system renders a balanced magazine spread with feature, tall, medium, and small tile roles

#### Scenario: Ten or more images do not become loose rows
- **WHEN** a month or mosaic group contains 10 or more images
- **THEN** the system renders deterministic editorial blocks and uses a compact repeated block or existing masonry fallback for overflow images

#### Scenario: Same input produces same mosaic
- **WHEN** the same image set is rendered across reloads or static builds
- **THEN** the Magazine Mosaic tile roles and ordering remain stable

### Requirement: Magazine Mosaic graceful fallback
The Magazine Mosaic layout SHALL avoid forcing sparse or unsuitable image sets into a broken mosaic.

When there are fewer than 4 images, the system SHALL use an existing small-count layout or a simple grid fallback. When image metadata is incomplete, the system SHALL still render stable tile boxes without layout collapse.

#### Scenario: Fewer than four images avoid mosaic
- **WHEN** a mosaic candidate group contains fewer than 4 images
- **THEN** the system renders a small-count layout or simple grid instead of Magazine Mosaic

#### Scenario: Missing image dimensions do not collapse layout
- **WHEN** image width or height metadata is missing
- **THEN** the system renders a stable fallback aspect ratio for the tile

### Requirement: Scope limited to nuxt-public
The implementation SHALL only modify files under `nuxt-public` and the OpenSpec change artifacts.

The implementation MUST NOT modify `cloudflare-worker/`, gallery API contracts, database schema, or admin gallery forms.

#### Scenario: Scope respected
- **WHEN** the implementation is complete
- **THEN** modified files are limited to `nuxt-public/` and the OpenSpec change artifacts

#### Scenario: Backend unchanged
- **WHEN** the implementation is complete
- **THEN** no backend API, database, or model changes are required

### Requirement: Accessible timeline controls
Timeline controls SHALL be keyboard reachable and expose readable month labels.

The layout SHALL remain usable when motion preferences request reduced motion.

#### Scenario: Keyboard can use timeline
- **WHEN** the user navigates with the keyboard
- **THEN** timeline items can receive focus and be activated
#### Scenario: Reduced motion remains usable

- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** timeline navigation and image viewing remain functional without relying on motion effects

### Requirement: Rail month label uses serif display family

The left rail month labels SHALL use the same Playfair Display serif display family as the year headers, in italic style. The month label size SHALL be approximately `clamp(0.95rem, 1.1vw, 1.1rem)`, slightly smaller than the year label so the visual hierarchy remains year > month.

#### Scenario: Month label renders in Playfair Display

- **WHEN** a user opens the gallery and views the left rail
- **THEN** every month label renders in Playfair Display italic
- **AND** the visual style is consistent with the year label above

#### Scenario: Month label falls back to serif when web font is unavailable

- **WHEN** the Playfair Display web font fails to load
- **THEN** the month label still renders in the system serif fallback chain without breaking the layout

#### Scenario: Month label works in dark theme

- **WHEN** the dark theme is active
- **THEN** the month label color respects the existing dark theme color tokens and remains readable at WCAG AA contrast

### Requirement: Month fill bar visualizes image count
The left rail SHALL render a thin vertical or horizontal fill bar on each month row. The fill bar width SHALL be proportional to that month's image count divided by the peak count across all months in the current gallery view. The fill bar SHALL use the accent color when the month is active and a muted token color otherwise.

The fill bar is the **only** visual channel for image-count density; no image count number is rendered anywhere in the left rail or the right-side month section header.

#### Scenario: Fill bar width reflects relative month size
- **WHEN** the gallery has months with image counts 12, 7, 4, 1
- **THEN** the largest month's fill bar is at 100% width
- **AND** the others are at 58%, 33%, 8% respectively (proportional to 12)

#### Scenario: Active month fill bar uses accent color
- **WHEN** a month section is the currently active IntersectionObserver target
- **THEN** its fill bar renders with the accent color and a subtle glow
- **AND** non-active months use a muted low-contrast color

#### Scenario: Fill bar is decorative only
- **WHEN** a screen reader user navigates the rail
- **THEN** the fill bar carries `aria-hidden="true"` and is not announced
- **AND** no image count number is rendered as text in the rail
- **AND** density is communicated only through the fill-bar and the active month's English sublabel

### Requirement: Year/month micro-ornament divider
The left rail SHALL render a small 4×4 SVG diamond ornament between the year header and the first month row of each year group. The ornament SHALL use the existing muted accent token and SHALL be `aria-hidden`.

The vertical main rail SHALL be rendered 2px solid with a soft 1px box-shadow halo on desktop, and 1px horizontal gradient on mobile (when the rail collapses to a horizontal row). On desktop the rail remains visible and clearly anchors active month positioning; on mobile it converts to a horizontal hairline below the rail container.

#### Scenario: Diamond appears under each year header
- **WHEN** the gallery renders at least one year group with one or more months
- **THEN** a 4×4 SVG diamond is centered horizontally under each year label and above the first month row
- **AND** the diamond color matches the existing ornament style in the right-side month headers
- **AND** the vertical main rail is rendered 2px solid with a soft 1px box-shadow halo on desktop
- **AND** the rail converts to a 1px horizontal gradient hairline below the rail container on mobile

### Requirement: Month secondary label shows English abbreviation on active

When a month is the currently active section, the left rail SHALL render a small English month abbreviation (e.g. "Jan", "Feb") under the Chinese month label. Non-active months SHALL NOT render the abbreviation to reduce visual noise.

#### Scenario: Active month shows English abbreviation

- **WHEN** a month becomes the active section
- **THEN** an 8px sans-serif English abbreviation appears directly below the month label
- **AND** the abbreviation uses the same muted color as inactive year count badges

#### Scenario: Non-active months omit abbreviation

- **WHEN** a month is not the active section
- **THEN** the abbreviation is not rendered for that month

### Requirement: Active month visual escalation
When a month is the currently active section, the left rail SHALL apply a clear visual escalation to that row beyond the existing dot glow. The escalation MUST include a 2px left border in the accent color, a slight horizontal nudge (4-6px), and the month label rendered in bolder weight.

The left rail SHALL also render a short horizontal indicator from the main vertical rail to the active month row (a 2px wide, ~0.4rem long accent bar extending from the rail to the row's left edge) to reinforce the user's current position.

#### Scenario: Active month shows left border and nudge
- **WHEN** a month is the active section
- **THEN** the month button has a 2px left border in the accent color
- **AND** the button is nudged 4-6px to the right compared to non-active months

#### Scenario: Active month label is bolder
- **WHEN** a month is the active section
- **THEN** the month label font-weight is 800
- **AND** non-active months use font-weight 700

#### Scenario: Active month shows rail indicator
- **WHEN** a month is the active section
- **THEN** a short 2px accent indicator extends from the vertical main rail to the active month's left edge
- **AND** the indicator does not change layout height of the row

#### Scenario: Active escalation respects reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** the active escalation appears instantly with no transition


## Requirements

### Requirement: Desktop month timeline layout
The public gallery SHALL render a two-column layout on desktop-class viewports with a month timeline on the left and the image area on the right.

The timeline SHALL be grouped by month and SHALL use the currently active gallery category data rather than mixing hidden tab content into the visible index.

#### Scenario: Desktop gallery shows timeline and image area
- **WHEN** the user opens `/gallery` on a desktop-class viewport and gallery images are available
- **THEN** the system renders a left month timeline and a right image area

#### Scenario: Timeline follows active tab
- **WHEN** the user switches between artwork and game screenshot tabs
- **THEN** the timeline updates to reflect the months available in the active tab

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

#### Scenario: Mobile renders top month rail
- **WHEN** the viewport is narrow enough that a sidebar would crowd the gallery
- **THEN** the timeline renders as a horizontal month rail above the image area

#### Scenario: Mobile rail navigates to month section
- **WHEN** the user taps a month in the mobile rail
- **THEN** the page moves to the corresponding month section

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

#### Scenario: Clicking image opens fullscreen
- **WHEN** the user clicks or taps any image tile in the right-side image area
- **THEN** the system emits the existing `image-click` flow and opens the fullscreen modal

#### Scenario: Thumbnail failure falls back
- **WHEN** a tile thumbnail fails to load and a full image URL exists
- **THEN** the system attempts to render the full image URL

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

The implementation MUST NOT modify `nuxt/`, `backend-dotnet/`, `cloudflare-worker/`, gallery API contracts, database schema, or admin gallery forms.

#### Scenario: SSR frontend unchanged
- **WHEN** the implementation is complete
- **THEN** no files under `nuxt/` are modified for this change

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

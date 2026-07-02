## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Hover preview chip on desktop
The left rail SHALL render a small chip on hover of a month row on desktop pointer devices. The chip SHALL display the image count of that month as a confirmation. Touch devices and keyboard navigation SHALL NOT trigger the chip.

#### Scenario: Desktop hover shows chip
- **WHEN** the user hovers a month row on a desktop with a pointer device
- **THEN** a small chip appears near the row showing the month image count

#### Scenario: Touch devices omit chip
- **WHEN** the user uses a touch device or keyboard to navigate
- **THEN** the chip does not appear

#### Scenario: Chip respects reduced motion
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** the chip appears instantly on hover without fade animation

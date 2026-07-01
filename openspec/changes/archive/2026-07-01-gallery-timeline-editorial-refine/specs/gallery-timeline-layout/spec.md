## ADDED Requirements

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
- **AND** the image count is still readable as the trailing number in the month label

### Requirement: Year/month micro-ornament divider

The left rail SHALL render a small 4×4 SVG diamond ornament between the year header and the first month row of each year group. The ornament SHALL use the existing muted accent token and SHALL be `aria-hidden`.

#### Scenario: Diamond appears under each year header

- **WHEN** the gallery renders at least one year group with one or more months
- **THEN** a 4×4 SVG diamond is centered horizontally under each year label and above the first month row
- **AND** the diamond color matches the existing ornament style in the right-side month headers

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

#### Scenario: Active month shows left border and nudge

- **WHEN** a month is the active section
- **THEN** the month button has a 2px left border in the accent color
- **AND** the button is nudged 4-6px to the right compared to non-active months

#### Scenario: Active month label is bolder

- **WHEN** a month is the active section
- **THEN** the month label font-weight is 800
- **AND** non-active months use font-weight 700

#### Scenario: Active escalation respects reduced motion

- **WHEN** the user has `prefers-reduced-motion: reduce` enabled
- **THEN** the active escalation appears instantly with no transition

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

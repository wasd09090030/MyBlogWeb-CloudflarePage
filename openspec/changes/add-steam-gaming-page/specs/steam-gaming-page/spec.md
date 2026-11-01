## ADDED Requirements

### Requirement: Static shell with client-side snapshot loading
The `/games` route SHALL be prerendered as a static shell and SHALL load the snapshot from the public read endpoint on the client; the build MUST NOT require Steam credentials or a D1 binding.

#### Scenario: Direct visit and refresh
- **WHEN** a visitor opens `/games` directly or reloads the page
- **THEN** the static shell SHALL render immediately, request the snapshot once, and hydrate the sections without a full page reload

#### Scenario: Navigation entry
- **WHEN** the public navigation renders
- **THEN** a "游戏" entry SHALL link to `/games` and the active state SHALL be reflected for the current route

### Requirement: Showcase-driven sections
The page SHALL render the profile header first, then every showcase in the order and grid width supplied by the snapshot contract, and MUST NOT hardcode a fixed section order.

#### Scenario: Configured order
- **WHEN** the snapshot lists showcases in a given order
- **THEN** the page SHALL render them in that order and apply each element's `span` to the 12-column grid

#### Scenario: Overview figures
- **WHEN** a valid snapshot is available
- **THEN** the profile SHALL show game count, total playtime, recent two-week playtime, and unlocked achievement totals with minutes converted to hours

#### Scenario: Empty showcase
- **WHEN** a showcase element carries `empty: true`
- **THEN** the page SHALL skip it without leaving a visual gap

#### Scenario: Unknown showcase type
- **WHEN** the snapshot contains a showcase type the frontend does not implement
- **THEN** the page SHALL skip that element and continue rendering the remaining showcases

### Requirement: Showcase module rendering
Every showcase module SHALL render a consistent frame with icon, title, optional meta text, and a body that fills the module so half-width neighbours align.

#### Scenario: Half-width alignment
- **WHEN** two half-width showcases share a row with different content lengths
- **THEN** both SHALL stretch to equal height and keep their bottom content aligned

#### Scenario: Bounded lists
- **WHEN** a list showcase is configured with a limit
- **THEN** it SHALL render at most that many items and MUST NOT paginate on the client

### Requirement: Freshness and provenance disclosure
The page SHALL state when the snapshot was taken and that data originates from Steam, and SHALL visually distinguish stale data from current data.

#### Scenario: Old snapshot
- **WHEN** the snapshot is older than the freshness window
- **THEN** the header SHALL show a stale indicator with the last successful sync time while keeping the data visible

#### Scenario: Privacy-blocked or unconfigured snapshot
- **WHEN** the endpoint reports `privacy_blocked` or `unconfigured`
- **THEN** the page SHALL explain the cause, link to the Steam privacy settings page, and MUST NOT show zeroed statistics as if they were real

### Requirement: Loading, error, and empty states
The page SHALL reserve space for pending sections, expose a retry action on failure, and SHALL NOT shift layout when data arrives.

#### Scenario: Slow response
- **WHEN** the snapshot request is pending
- **THEN** skeleton placeholders SHALL occupy the final layout height and the page SHALL remain scrollable

#### Scenario: Request failure
- **WHEN** the snapshot request fails or returns a non-2xx status
- **THEN** the page SHALL show an inline error with a retry button and SHALL keep any previously fetched snapshot visible

### Requirement: Responsive presentation
The page SHALL follow the project's split-style convention with desktop and mobile stylesheets and the 576px, 768px, and 992px breakpoints.

#### Scenario: Narrow viewport
- **WHEN** the viewport is 320px wide
- **THEN** content SHALL remain within the viewport without horizontal scrolling and ranking labels SHALL stay legible

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** reveal and hover transitions SHALL be disabled

### Requirement: Accessible semantics and keyboard support
The page SHALL use one `h1`, section headings, and list semantics for rankings, and every interactive element SHALL be reachable and visible under keyboard focus.

#### Scenario: Keyboard traversal
- **WHEN** a user tabs through game cards and links
- **THEN** focus SHALL be visible on each element and activation SHALL open the same destination as a pointer click

#### Scenario: Asynchronous update announcement
- **WHEN** the snapshot finishes loading after the initial paint
- **THEN** the freshness region SHALL announce the update through a polite live region

### Requirement: Metadata and sharing
The route SHALL declare a title, description, and social preview metadata consistent with the rest of the public site.

#### Scenario: Link preview
- **WHEN** the page URL is shared
- **THEN** the rendered metadata SHALL provide a title and description without requiring client-side data

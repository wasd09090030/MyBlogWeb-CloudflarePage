# Spec: Responsive Styles Splitting (nuxt-public)

## ADDED Requirements

### Requirement: Desktop and mobile styles live in separate paired files
The `nuxt-public` static blog SHALL organize each component's responsive CSS as a pair of physically distinct files: `<Name>.desktop.css` and `<Name>.mobile.css`. The legacy `<Name>.styles.css` mixed-file pattern SHALL NOT be used for new code or as the steady state of migrated code.

#### Scenario: A migrated component has two paired files
- **WHEN** a developer inspects the `nuxt-public/app/assets/css/components/` directory for a migrated component
- **THEN** the directory contains exactly one `<Name>.desktop.css` and one `<Name>.mobile.css`, and no `<Name>.styles.css` with non-empty content

#### Scenario: A new component follows the pairing convention
- **WHEN** a developer adds a new component's styles
- **THEN** the new styles are placed in `<Name>.desktop.css` and/or `<Name>.mobile.css`, never in `<Name>.styles.css`

### Requirement: Desktop file contains only desktop rules
The `<Name>.desktop.css` file SHALL contain CSS rules that apply to desktop-class viewports. It MUST NOT contain rules wrapped in `@media (max-width: ...)`. Desktop rules may either be unwrapped (acting as the desktop baseline) or be explicitly wrapped in `@media (min-width: ...)` blocks for clarity.

#### Scenario: Desktop file is free of mobile media queries
- **WHEN** a verification script scans `<Name>.desktop.css`
- **THEN** the script finds zero `@media (max-width: ...)` blocks

#### Scenario: Desktop baseline rules apply on desktop viewports
- **WHEN** a user opens a page on a 1280px-wide desktop viewport
- **THEN** the rules from `<Name>.desktop.css` apply to the rendered component

### Requirement: Mobile file contains only mobile rules
The `<Name>.mobile.css` file SHALL contain CSS rules that apply to mobile-class viewports. Every rule in this file MUST be wrapped inside an `@media (max-width: <breakpoint>)` block using one of the project-standard breakpoints (576px, 768px, 992px).

#### Scenario: Mobile file rules are all wrapped in media queries
- **WHEN** a verification script scans `<Name>.mobile.css`
- **THEN** the script finds no top-level CSS rules outside `@media (max-width: ...)` blocks

#### Scenario: Mobile rules apply on mobile viewports
- **WHEN** a user opens a page on a 375px-wide mobile viewport
- **THEN** the rules from `<Name>.mobile.css` apply to the rendered component

### Requirement: Loading order ensures mobile can override desktop
Both `<Name>.desktop.css` and `<Name>.mobile.css` MUST be loaded into the rendered page. The desktop file SHALL be loaded before the mobile file in the cascade order so that mobile overrides apply correctly.

#### Scenario: Desktop file precedes mobile file in cascade
- **WHEN** the build emits the final stylesheet bundle
- **THEN** the desktop rules appear before the mobile rules in the cascade order

#### Scenario: Component renders identically before and after migration
- **WHEN** a developer visually compares the migrated page against the pre-migration page at desktop (1280px), tablet (768px), and mobile (375px) breakpoints
- **THEN** the rendered output is visually equivalent to the pre-migration page

### Requirement: Project-standard breakpoints are preserved
The desktop/mobile split SHALL use the project-standard breakpoints: 576px (small mobile), 768px (mobile/tablet boundary), 992px (tablet/desktop boundary). New code MUST use these values; custom breakpoints are not allowed.

#### Scenario: Mobile file uses standard breakpoint values
- **WHEN** a verification script inspects all `@media` queries in `<Name>.mobile.css` files
- **THEN** every `max-width` value is one of 576px, 768px, or 992px

#### Scenario: Custom breakpoint is rejected
- **WHEN** a developer adds an `@media (max-width: 700px)` block to a mobile file
- **THEN** the verification script reports this as a violation

### Requirement: Vue components import both paired files
Every Vue component that previously imported `<Name>.styles.css` SHALL import `<Name>.desktop.css` and `<Name>.mobile.css` as a pair, in that order. Global styles loaded through `nuxt.config.ts` SHALL likewise list the desktop file before the mobile file.

#### Scenario: Component import is the desktop/mobile pair
- **WHEN** a developer inspects the `@import` directives in a migrated component
- **THEN** the imports include both the desktop and mobile files, in that order

#### Scenario: Global CSS list contains the desktop/mobile pair
- **WHEN** a developer inspects the `css: []` array in `nuxt-public/nuxt.config.ts`
- **THEN** each previously listed `.styles.css` entry has been replaced by its desktop/mobile pair, in that order

### Requirement: A verification script enforces the convention
A Node script at `nuxt-public/scripts/check-responsive-split.mjs` SHALL exist and be invokable through `npm run lint:responsive`. The script SHALL fail the build if any of the structural rules above are violated.

#### Scenario: Script catches a mixed styles.css file
- **WHEN** a `<Name>.styles.css` file still contains `@media` blocks after migration
- **THEN** the script exits with a non-zero status and a message identifying the file

#### Scenario: Script catches rules in the wrong file
- **WHEN** a `<Name>.desktop.css` file contains `@media (max-width: ...)` blocks, or a `<Name>.mobile.css` file contains unwrapped rules
- **THEN** the script exits with a non-zero status and a message identifying the file and the offending rule

#### Scenario: Script runs in CI
- **WHEN** `npm run lint:responsive` is executed locally or in CI
- **THEN** the script completes and reports either success or the list of violations

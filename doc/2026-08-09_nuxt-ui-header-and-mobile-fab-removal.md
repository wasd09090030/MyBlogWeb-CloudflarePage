# Task Record: Nuxt UI Header and Mobile FAB Removal

## Date

- Local date: 2026-08-09

## Goal

- Replace the custom public-site navigation bar with Nuxt UI navigation while preserving the site logo.
- Separate the ArticleList and Sidebar at desktop sizes.
- Remove the homepage's mobile-only right-side floating navigation button.

## Agreed Design

- Use Nuxt UI `UHeader`, `UNavigationMenu`, `UColorModeButton`, and `UButton` rather than maintain a second custom header and drawer implementation.
- Keep the logo in the `UHeader` title slot and retain article search on desktop only.
- Treat `WelcomeSection`'s `mobile-fab-container` as the requested mobile-only right-side control. Keep global `FloatingQuickActions` unchanged because it is available on all viewport sizes.
- Add spacing only between the desktop content and sidebar columns.

## Stages

### Stage 1: Source and Documentation Review

- Confirmed the mobile-only right-side control originated from `WelcomeSection`, not `FloatingQuickActions`.
- Checked Nuxt UI v4 documentation for `UHeader`, `UNavigationMenu`, `UDrawer`, `UButton`, and automatic route-close behavior.

### Stage 2: Header and Layout Adjustment

- Replaced the custom header and hand-built mobile drawer with `UHeader` and `UNavigationMenu`.
- Preserved `/icon/logo.webp`, desktop search, active navigation states, and color-mode control.
- Added a `1.5rem` desktop column gap to the ArticleList/Sidebar grid.
- Converted the legacy custom search trigger to a Nuxt UI `UButton` for correct contrast in the new header.

### Stage 3: Mobile FAB Removal

- Removed the mobile FAB template, reactive state, click handlers, and desktop/mobile CSS rules.

### Stage 4: Mobile Sidebar Entry Removal and Header Motion

- Removed the blue-purple mobile Sidebar toggle, its hidden panel markup, localStorage state, click-outside listener, and duplicate scrollbar rules.
- Restored the previous header motion treatment on the Nuxt UI header: transparent at rest, blurred after scrolling, and hidden while scrolling down.

## Files Changed

- `nuxt-public/app/layouts/default.vue`: Nuxt UI header, navigation items, and sidebar column gap.
- `nuxt-public/app/components/Effects/SearchBar.vue`: Nuxt UI search trigger.
- `nuxt-public/app/components/WelcomeSection.vue`: Removes mobile FAB markup and logic.
- `nuxt-public/app/assets/css/components/WelcomeSection.desktop.css`: Removes obsolete FAB styles.
- `nuxt-public/app/assets/css/components/WelcomeSection.mobile.css`: Removes mobile FAB layout rules.
- `nuxt-public/app/components/SideBar.vue`: Removes the mobile-only sidebar control and its state management.
- `nuxt-public/app/assets/css/components/SideBar.desktop.css`: Removes the mobile sidebar control and duplicate panel scrollbar styles.
- `nuxt-public/app/assets/css/components/SideBar.mobile.css`: Removes mobile sidebar-control rules.

## Sources Checked

- Context7:
  - `/llmstxt/ui_nuxt_llms-full_txt`: Nuxt UI v4 `UNavigationMenu`, `UHeader`, `UDrawer`, and `UButton` examples and behavior.

## Validation

- `git diff --check` passed.
- Source audit confirms no mobile FAB or legacy custom-header references remain.
- `npm.cmd run generate` passed: 3,901 modules transformed and 158 routes prerendered.
- Nuxt link checker reported 0 errors and 0 warnings.
- The Sidebar source and CSS contain 0 references to the removed mobile panel or toggle.

## Risks and Follow-Up

- No deployment was performed.
- Global `FloatingQuickActions` remains intentionally; it is not a mobile-only control.

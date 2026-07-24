# Admin Full Redesign Design

## Goal

Completely redesign every `/admin/*` frontend screen in `nuxt/app` into a coherent high-density Nuxt UI v4 admin console. The redesign changes layout, visual language, page composition, and shared admin UI structure, while preserving the current backend APIs, authentication flow, route paths, and business composables.

## Confirmed Decisions

- Visual direction: Editorial Studio.
- Layout model: Rail + Workbench.
- Density: Workbench Dense.
- Theme strategy: light mode by default, dark mode available through the existing color-mode switch.
- Scope: all admin screens, including login, dashboard, article list, article create/edit, comments, gallery, imagebed, and password.
- Component library: Nuxt UI v4. Existing Naive UI assumptions are obsolete for this admin scope.

## Current Problems

The admin UI is not merely under-polished. It lacks a unified product structure. Pages define their own headers, panels, spacing, empty states, actions, and color choices. Some feature components still contain old hard-coded gray/blue styling, which conflicts with the Nuxt UI token system and makes the admin feel assembled rather than designed.

Recent local changes and the existing `admin-console-polish` spec only address small visual tuning. That direction is insufficient for the user's requirement to abandon the current layout design. The new work must replace the admin layout system and normalize every admin page against shared primitives.

## Architecture

The redesign stays inside `nuxt/app` and introduces an admin-specific shared UI layer under:

```text
nuxt/app/shared/ui/admin/
```

This layer owns admin layout primitives, not business behavior. Pages and feature containers consume these primitives and keep using the existing composables:

- `useAuthStore`
- `useAdminArticlesFeature`
- `useAdminCommentsFeature`
- `useAdminGalleryFeature`
- `useAdminImagebedPage`

No backend API, endpoint, DTO, route, middleware, or authentication contract changes are in scope.

## Shared Admin Components

Create small, focused components:

- `AdminPageHeader.vue`: eyebrow, title, description, meta text, and action slot.
- `AdminPanel.vue`: standard panel surface with compact padding, optional header, and Nuxt UI token-based styling.
- `AdminToolbar.vue`: compact search/filter/action bar that wraps cleanly on small screens.
- `AdminMetricGrid.vue`: dense metric strips for dashboard and management pages.
- `AdminState.vue`: loading, empty, and error states with consistent icon, title, and action treatment.
- `AdminActionBar.vue`: compact form and modal action rows.

The existing `nuxt/app/layouts/admin.vue` remains the layout entry point but is redesigned as the shell: dark rail, warm studio sidebar, compact top workbar, responsive drawer behavior, and a constrained high-density content area.

## Visual System

Use a warm editorial workspace without becoming a decorative portfolio page.

- Background: light paper/workbench surfaces in light mode; neutral elevated work surfaces in dark mode.
- Primary color: a restrained green aligned with the current WyrmKk identity, used for primary actions, active navigation, and live status.
- Accent: a muted amber only for secondary studio details and warnings.
- Typography: compact hierarchy; no hero-scale headings inside admin pages.
- Radius: small and consistent, generally 6-8px.
- Motion: minimal hover/focus transitions only; no ornamental animation.
- Density: compact page gaps, compact panel padding, tight tables/lists, and fixed-size controls where layout shift is likely.

Nuxt UI v4 theming should be configured through `app.config.ts` and local `ui` props where needed. Avoid page-level hard-coded `gray-*`, `blue-*`, and one-off decorative gradients.

## Page Redesign

### Login

Replace the current decorative login page with a compact studio entry screen. The password field and submit button are the dominant path. Brand identity remains visible but restrained. The screen follows light mode by default and respects dark mode.

### Dashboard

Turn `/admin` into today's workbench. Structure:

1. Compact context header with primary actions.
2. Dense metric strip.
3. Recent articles and pending comments as the main work queue.
4. Operational side panel for deploy, media, and account status.

Avoid welcome-page copy and marketing composition.

### Articles

Turn `/admin/articles` into a content library. Use a unified page header, toolbar, dense table, pagination, and action icons. Preserve search, category filtering, page size, edit, preview, and delete behavior.

### Article Editor

Keep existing editor behavior but place it in a workbench layout. Use a fixed or sticky top action area and a metadata/settings side panel where practical. The page may use a two-column or editor-focused variant, but it must still share admin shell, header, panel, and action conventions.

### Comments

Turn comments into a review queue. Pending comments remain the default focus. Each item should expose author, status, source article, timestamp, content, and moderation actions in a compact, scannable layout.

### Gallery

Turn gallery management into a visual asset workbench. Move Cloudflare thumbnail settings into a compact settings panel or collapsible panel. Gallery filters, batch import, refresh dimensions, grid cards, and modals must use the admin token system.

### Imagebed

Turn imagebed into a media library. Directory navigation, search, view mode, selection, batch delete, preview, upload, and configuration should sit inside `AdminToolbar` and `AdminPanel` structures. Remove legacy hard-coded gray/blue component styling.

### Password

Turn password management into an account security page using the same header, panel, form spacing, action bar, and informational state treatment as the rest of admin.

## Error Handling And States

User-visible errors continue through Nuxt UI toasts and modals. Destructive actions use `UModal` confirmation. Loading, empty, and error states should render through `AdminState` unless a page has a domain-specific reason to use a richer state. Existing `console.error` calls may remain for diagnostics, but user-facing messages should become consistent and concise.

## Responsive Behavior

Desktop uses rail + sidebar + workbench. Tablet keeps the shell but allows navigation to collapse earlier. Mobile uses the Nuxt UI dashboard drawer behavior and single-column page content. Tables may remain tables when usable, but dense card-list fallbacks are acceptable for article and comment management if horizontal overflow would harm operation.

All fixed-format controls, toolbars, cards, and table action groups need stable dimensions so hover states, loading labels, and translated labels do not shift layout.

## Verification

Run from `nuxt/`:

```powershell
npm run typecheck
```

Then perform targeted browser verification for:

- `/admin/login`
- `/admin`
- `/admin/articles`
- `/admin/articles/create`
- `/admin/articles/[id]`
- `/admin/comments`
- `/admin/gallery`
- `/admin/imagebed`
- `/admin/password`

Check desktop and mobile widths. Confirm text does not overlap, toolbars wrap cleanly, modals open, destructive confirmations work, theme switching works, and main actions remain reachable by keyboard.

## Risks

- Article editor and imagebed have the highest layout complexity and should be refactored in small, verified steps.
- Existing local uncommitted polish work must not be blindly preserved if it conflicts with this full redesign.
- `.superpowers/` brainstorm files are local design artifacts and must not be included in implementation commits.

## Out Of Scope

- Backend API changes.
- Authentication contract changes.
- Route path changes.
- Replacing the markdown editor package.
- Adding global search, command palette, or a new batch-processing model.
- Rebuilding the public static site.

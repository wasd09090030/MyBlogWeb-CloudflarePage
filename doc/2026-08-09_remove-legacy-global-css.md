# Task Record: Remove Legacy Global CSS from Public Site

## Date

- Local date: 2026-08-09

## Goal

- Eliminate the public site's active Bootstrap-compatible global CSS so it cannot override Nuxt UI v4 or Tailwind v4 utilities.

## Agreed Design

- Retain the Nuxt UI and Tailwind CSS compilation entry point established by the pagination repair.
- Replace the legacy grid and display utilities used by the default layout with semantic layout classes and Tailwind responsive utilities.
- Remove global `.btn`, `.card`, `.bg-primary`, `.text-primary`, and `.form-control` overrides instead of adding more component-specific exceptions.
- Keep user-owned backend configuration changes and the existing public-site pagination repair intact.

## Stages

### Stage 1: Audit

- Scope: Identify the active CSS entry points, selector collisions, and template dependencies.
- Changes: Confirmed `layout.css` provided Bootstrap-style grid, display, and color utilities while `app.css` and `app.vue` provided duplicate global button and card rules.
- Review result: The legacy grid and display classes were only needed by `default.vue`, `SideBar.vue`, and one About-page typography line.

### Stage 2: Migrate Active Dependencies

- Scope: Remove Bootstrap utility dependencies from templates.
- Changes: Replaced `container-fluid` / `row` / `col-*` with a `site-layout` CSS Grid in `default.vue`; replaced `d-*`, `min-vh-100`, `fs-4`, and `fw-normal` with Tailwind utilities.
- Review result: The sidebar remains desktop-only at the existing `lg` breakpoint and the content remains fluid on mobile.

### Stage 3: Remove Global Collision Surface

- Scope: Stop loading legacy CSS and delete active generic overrides.
- Changes: Removed `layout.css` and `app.css` from `nuxt.config.ts`; deleted `app.css`; removed the `UButton` compatibility exception and unused generic classes from `app.vue`; removed a dead mobile `.alert.alert-info .btn` rule.
- Review result: Active source no longer defines exact global `.btn`, `.card`, `.bg-primary`, `.text-primary`, or `.form-control` selectors.

### Stage 4: Validate

- Scope: Verify source and generated output.
- Changes: Ran static checks and full static generation.
- Review result: Build completed successfully and generated CSS no longer contains exact `.btn{` or `.card{` selectors.

## Files Changed

- `nuxt-public/nuxt.config.ts`: Removes both legacy global CSS files from the public site's CSS pipeline.
- `nuxt-public/app/layouts/default.vue`: Replaces Bootstrap grid and display utilities with owned layout CSS and Tailwind utilities.
- `nuxt-public/app/components/SideBar.vue`: Replaces legacy display utilities.
- `nuxt-public/app/pages/about.vue`: Replaces legacy typography and display utilities.
- `nuxt-public/app/app.vue`: Removes global button, card, form-control, and unused generic state helper rules.
- `nuxt-public/app/assets/css/app.css`: Deleted as redundant legacy global CSS.
- `nuxt-public/app/assets/css/main.css`: Removes the now-unnecessary `UButton` collision workaround.
- `nuxt-public/app/assets/css/components/ArticleList.mobile.css`: Removes an unreachable Bootstrap alert/button rule.

## Sources Checked

- Context7:
  - `/llmstxt/ui_nuxt_llms-full_txt`: Nuxt UI v4 requires Tailwind CSS and `@nuxt/ui` in the same CSS entry point and supports semantic customization through `--ui-*` variables and `@theme`.
- Official documentation:
  - `https://ui.nuxt.com/docs/getting-started/theme/css-variables` returned HTTP 200 on 2026-08-09.
- The MCP router's Fetch tool was not available in the active tool registry. Sequential Thinking MCP was also unavailable; this was compensated for with the documented source audit, Context7 query, and generated-output checks.

## Validation

- `git diff --check` passed.
- `npm.cmd run generate` passed: 3,886 modules transformed, 158 routes prerendered, and `.output/public` generated.
- Generated CSS check: exact `.btn{` count is 0; exact `.card{` count is 0; legacy CSS entrypoint count is 0.
- Existing link-text and KaTeX warnings remain during prerender; they are unrelated to this migration.

## Risks and Follow-Up

- `layout.css` is no longer reachable from the build, but its invalid UTF-8 bytes prevented deletion through the required patch mechanism and a direct file deletion was rejected by the environment policy. It should be physically removed when the repository tooling can perform a binary-safe delete.
- No deployment was performed. Deploy the regenerated public-site output through the normal Cloudflare Pages workflow.

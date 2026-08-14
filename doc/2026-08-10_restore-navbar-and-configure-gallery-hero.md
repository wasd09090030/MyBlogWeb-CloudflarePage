# Task Record: Restore Navbar and Configure Artwork Hero

## Date

- Local date: 2026-08-10

## Goal

- Restore the public site's navigation to the visual structure and interactions used before commit `1188dc152954cc6e790df2af90f2f2b3b51ae591`.
- Allow the admin to manage image URLs and ordering for the artwork Hero independently of the masonry timeline.

## Agreed Design

- Restore only the header and mobile drawer, retaining the current page layout and Nuxt UI migration.
- Keep navigation styles in paired desktop/mobile CSS files, using the project 992px breakpoint.
- Store Hero images in a new D1 table rather than reusing `galleries`; this prevents Hero edits from changing masonry items.
- Expose a public read endpoint for SSG and an authenticated admin read/write endpoint.
- Preserve the historical artwork slicing behavior until a Hero configuration is first saved.

## Stages

### Stage 1: Navigation

- Scope: Public default layout and its responsive styles.
- Changes: Replaced `UHeader` with the prior centered navigation, desktop search, mobile drawer, and drawer theme toggle.
- Review result: Main content layout was intentionally not reverted. The responsive boundary was fixed to 992px so the navigation and drawer do not leave a 992-1023px gap.

### Stage 2: Independent Hero configuration

- Scope: D1 schema, API endpoints, admin UI, and public gallery SSG data flow.
- Changes: Added `gallery_hero_items`, four ordered Hero sections, protected admin save/load routes, public `/api/gallery/hero`, and the admin URL/order editor.
- Review result: Hero configuration is independent of `galleries`. Before configuration exists, the public page uses its former fixed artwork slices. After configuration exists, configured sections render independently and masonry still uses all artwork gallery items.

## Files Changed

- `nuxt-public/app/layouts/default.vue`: restored navigation markup and behavior.
- `nuxt-public/app/assets/css/components/LegacyNavbar.desktop.css`: desktop navigation styling.
- `nuxt-public/app/assets/css/components/LegacyNavbar.mobile.css`: mobile drawer styling.
- `nuxt-admin/migrations/0004_gallery_hero_items.sql`: persistent Hero configuration table and index.
- `nuxt-admin/server/domain/gallery-hero.ts`: Hero validation, persistence, and API mapping.
- `nuxt-admin/server/routes/api/gallery/hero.get.ts`: public Hero configuration endpoint.
- `nuxt-admin/server/routes/admin/api/[...path].ts`: authenticated Hero read/write routes.
- `nuxt-admin/app/pages/admin/gallery/index.vue`: Hero image URL and ordering controls.
- `nuxt-public/app/features/gallery-public/*`: SSG Hero loading and independent rendering.

## Sources Checked

- Context7: `/nuxt/ui`, queried Nuxt UI v4 table/form APIs on 2026-08-10.
- Fetch: Cloudflare D1 migrations documentation, https://developers.cloudflare.com/d1/reference/migrations/, checked 2026-08-10. It confirms sequential SQL migration files and migration tracking.
- Sequential Thinking MCP: not available in this execution environment; stage reviews were performed from the agreed plan, current diff, and build results.

## Validation

- `npm run typecheck` in `nuxt-admin`: passed.
- `npm run db:migrate:local`: passed; verified `gallery_hero_items` schema through local D1.
- `npm run generate` in `nuxt-public`: passed; final run generated 158 routes.
- `npm run build:api` in `nuxt-admin`: passed; the Worker output includes the Hero domain module and `/api/gallery/hero` route.
- `npx nuxt typecheck` in `nuxt-public`: still fails on pre-existing Markdown alias, js-md5, worker typing, and Nuxt config typing issues. It did not report files changed in this task.

## Risks and Follow-Up

- Production rollout must apply `npm run db:migrate:remote` before deploying the API Worker and rebuilding the static public site.
- The public site is SSG, so Hero configuration changes become visible only after its Pages rebuild completes.

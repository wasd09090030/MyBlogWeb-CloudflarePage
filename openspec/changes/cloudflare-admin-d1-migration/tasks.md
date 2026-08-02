## 1. Cloudflare Project Foundations

- [x] 1.1 Add `nuxt-admin` Wrangler configuration for the `cloudflare_module` build, Workers Paid limits, D1 binding, reused R2 binding, optional KV binding, and non-secret environment variables.
- [x] 1.2 Add Cloudflare runtime type declarations and a request-scoped binding adapter usable by Nuxt server routes in local Wrangler development and production.
- [x] 1.3 Add versioned D1 migrations for active blog tables, administrator users/sessions, indexes, foreign keys, and migration bookkeeping.
- [x] 1.4 Add a repeatable SQLite export/import/verification utility that preserves IDs, slugs, timestamps, JSON fields, image storage keys, and row-count checksums.
- [x] 1.5 Add `.dev.vars`/environment templates and document required D1/R2/secret inputs without committing credentials.

## 2. D1 Domain Services

- [x] 2.1 Implement prepared-statement helpers, bounded pagination utilities, row mappers, and batch transaction helpers for D1.
- [x] 2.2 Implement article repositories/services for public summaries/details/search/category/featured and authenticated create/update/delete behavior.
- [x] 2.3 Implement comment and like repositories/services for public submission/read/like and authenticated moderation behavior.
- [x] 2.4 Implement gallery and image-asset repositories/services for public/admin lists, CRUD, ordering, active-state changes, and metadata backfill behavior.
- [x] 2.5 Implement D1-backed configuration repositories for Cloudflare image settings and non-secret media metadata.
- [x] 2.6 Implement administrator password hashing, user bootstrap/reset, opaque session creation/validation/revocation, expiration cleanup, and session audit metadata.

## 3. Cloudflare API Routes

- [x] 3.1 Implement public article routes under `/api/articles/*` with the existing query semantics and response shapes.
- [x] 3.2 Implement public gallery and comment routes under `/api/gallery/*` and `/api/comments/*` with mutation validation and abuse controls.
- [x] 3.3 Replace `/admin/api/auth/*` handlers with D1 session login, logout, session verification, password change, and forced-reset behavior.
- [x] 3.4 Replace the allowlisted admin article/comment/gallery BFF routes with direct D1 domain-service calls and normalized errors.
- [x] 3.5 Implement authenticated R2 upload/list/delete/image-resolution routes and preserve stable `/images/*` responses and cache headers.
- [x] 3.6 Implement the AI summary route with a Worker secret and timeout/error normalization; implement the Pages deploy operation with a scoped Cloudflare secret.
- [x] 3.7 Retire unused Beatmap endpoints by returning an explicit unsupported response and preserving historical tables only for data retention.

## 4. Nuxt Admin Worker Migration

- [x] 4.1 Switch `nuxt-admin` Nitro configuration from `node-server` to `cloudflare_module` while preserving SSR, `/_ssr/` assets, and private admin cache headers.
- [x] 4.2 Remove server-side .NET URL/token forwarding from admin utilities and update route middleware/BFF helpers to use the D1 session service.
- [x] 4.3 Update imagebed/admin composables and handlers to use the R2-backed route contract without exposing provider credentials.
- [x] 4.4 Add edge-compatible local development support and verify the admin application typechecks and builds under the Worker preset.

## 5. Front Door, Public Build, and CI/CD

- [x] 5.1 Add the `blog-admin` Service Binding to the front-door Worker and route `/admin`, `/api`, `/images`, and `/_ssr` by path boundary rather than loose prefix matching.
- [x] 5.2 Remove the server-origin dependency and obsolete image resolver secret path from the front-door Worker after the new routes are verified.
- [x] 5.3 Update `nuxt-public` build/runtime API variables so browser requests use relative `/api` and SSG requests use the deployed Cloudflare API URL.
- [x] 5.4 Update GitHub Actions to apply D1 migrations, deploy `blog-admin`, deploy `blog-router`, and then build/deploy the public Pages artifact in the correct order.
- [x] 5.5 Update deployment, environment, smoke-test, and rollback documentation for Workers Paid, D1, R2, Service Binding, and password reset.

## 6. Data Cutover and Validation

- [ ] 6.1 Create/stage the production D1 database, import the current SQLite snapshot, validate counts/IDs/foreign keys, and verify representative R2 objects.
- [ ] 6.2 Execute the one-time administrator password reset and verify session creation, invalidation, logout, and password-change revocation.
- [ ] 6.3 Run focused public/admin API contract checks and SSR checks for login, deep links, article mutations, comments, gallery, media, AI, and Pages deployment trigger.
- [ ] 6.4 Perform the maintenance-window cutover, enable the Worker router binding, set the public API build variables, and run production smoke tests.
- [ ] 6.5 Retain the old .NET runtime as read-only during the observation window and record the final rollback/retirement decision without deleting legacy source in this change.

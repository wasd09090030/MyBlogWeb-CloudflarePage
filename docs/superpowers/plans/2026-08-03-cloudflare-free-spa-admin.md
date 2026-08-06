# Cloudflare Free SPA Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Replace the Workers Paid/Admin-SSR/R2-bound deployment with a Free-plan static Admin SPA, a D1-backed API Worker, and an independent image-host API integration while preserving public/Admin contracts.

**Architecture:** Keep `nuxt-admin` as the source package for the Admin SPA and Nitro API routes. Build the SPA for a separate Pages project and deploy the Nitro server output as `blog-api`; route `/admin/*` to Admin Pages and `/api/*`, `/admin/api/*`, and compatibility `/images/*` to `blog-api` through `blog-router`. D1 remains the relational source of truth, while image bytes and provider credentials stay in the independent image-host project.

**Tech Stack:** Nuxt 4, Nitro `cloudflare_module`, Nuxt UI v4, Cloudflare Pages, Cloudflare Workers Free, D1, TypeScript, Wrangler, Node `node:test` for focused router/contract checks.

---

### Task 1: Align OpenSpec Artifacts With The Approved Free-Plan Design

**Files:**
- Modify: `openspec/changes/cloudflare-admin-d1-migration/proposal.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/design.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/specs/cloudflare-admin-runtime/spec.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/specs/nuxt-admin-ssr-host/spec.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/specs/r2-media-storage/spec.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/specs/d1-blog-storage/spec.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/specs/admin-workspace/spec.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/specs/admin-bff-auth/spec.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/tasks.md`

- [ ] **Step 1: Replace the old deployment assumptions in the proposal and design.**

  Replace references to Workers Paid, Admin SSR, an Admin-owned R2 bucket, R2 object reads/writes, and required Beatmap archival tables with the approved architecture in `docs/superpowers/specs/2026-08-03-cloudflare-free-spa-admin-design.md`. Keep the old .NET service as read-only observation fallback.

- [ ] **Step 2: Update capability specs.**

  Change the host requirement from SSR to a static SPA Pages project plus API Worker; change media requirements to proxy the independent image API and redirect compatibility image URLs; change D1 requirements to omit Beatmap and `cf_image_configs` tables while retaining gallery/image metadata; keep the existing application password/session contract.

- [ ] **Step 3: Replace the task checklist.**

  Replace the 32-task old checklist with implementation tasks for SPA build, API Worker configuration, external image adapter, D1 cleanup/import, router/CI, focused checks, and environment-bound production cutover. Mark only work actually completed as `[x]`.

- [ ] **Step 4: Validate the artifact set.**

  Run:

  ```powershell
  openspec status --change cloudflare-admin-d1-migration --json
  openspec instructions apply --change cloudflare-admin-d1-migration --json
  ```

  Expected: the change remains `spec-driven`, has the revised task list, and has no stale requirement that Admin must render SSR or own R2.

- [ ] **Step 5: Commit the planning-artifact update.**

  ```powershell
  git add openspec/changes/cloudflare-admin-d1-migration
  git commit -m "docs: 对齐免费账户后台迁移方案"
  ```

### Task 2: Convert `nuxt-admin` Into A Static SPA Build

**Files:**
- Modify: `nuxt-admin/nuxt.config.ts`
- Modify: `nuxt-admin/package.json`
- Modify: `nuxt-admin/app/composables/useAdminApi.ts`
- Modify: `nuxt-admin/app/middleware/admin-auth.ts`
- Modify: `nuxt-admin/app/pages/admin/imagebed/index.vue`
- Modify: `nuxt-admin/README.md`

- [ ] **Step 1: Add a failing static-build smoke check.**

  Add an npm script named `generate` that runs `nuxt generate`, then run:

  ```powershell
  npm run generate
  ```

  Expected before configuration changes: the generated output still has SSR-oriented asset settings or fails to produce a Pages-ready `.output/public/index.html`; record the actual failure/output before implementing the config change.

- [ ] **Step 2: Configure SPA routing and asset paths.**

  Update `nuxt.config.ts` so the relevant values are equivalent to:

  ```ts
  export default defineNuxtConfig({
    ssr: false,
    app: {
      baseURL: '/admin/',
      buildAssetsDir: '_nuxt/',
      head: { /* retain current title and viewport */ }
    },
    nitro: { preset: 'cloudflare_module' }
  })
  ```

  Remove the `/_ssr/**` cache rule and keep Admin responses private through router/Pages behavior. Do not put D1, image API, session, or deploy secrets in `runtimeConfig.public`.

- [ ] **Step 3: Separate build and deployment commands.**

  Add scripts with these meanings:

  ```json
  {
    "generate": "nuxt generate",
    "build:api": "nuxt build",
    "deploy:pages": "npm run generate && wrangler pages deploy .output/public --project-name=$env:PAGES_PROJECT_NAME",
    "deploy:api": "npm run build:api && wrangler deploy --config wrangler.toml"
  }
  ```

  Keep existing typecheck/database scripts. The CI workflow will call the commands explicitly so PowerShell-only syntax is not required in GitHub Actions.

- [ ] **Step 4: Make the Admin client browser-only where SSR assumptions remain.**

  Change `useAdminApi` to use `$fetch` with same-origin `/admin/api/*`, `credentials: 'include'`, and browser-safe cache state. Change `admin-auth` to run its session check after SPA navigation and redirect on `401`/`428`; no server-rendered data or `useRequestFetch` dependency may remain.

- [ ] **Step 5: Remove the Admin UI's provider-token input.**

  Keep the imagebed page's domain/default-folder display and file workflows, but do not bind an API token to reactive state or send it to `/admin/api/imagebed/config`. The token is configured only as `IMAGE_API_TOKEN` on `blog-api`; the page displays configured/not-configured status returned by the API.

- [ ] **Step 6: Verify the SPA build.**

  Run from `nuxt-admin`:

  ```powershell
  npm run typecheck
  npm run generate
  ```

  Expected: typecheck passes and `.output/public` contains the static Admin shell/assets with no server data embedded.

### Task 3: Reconfigure The Nitro Output As `blog-api` Without R2

**Files:**
- Modify: `nuxt-admin/wrangler.toml`
- Modify: `nuxt-admin/env.d.ts`
- Modify: `nuxt-admin/server/utils/cloudflare.ts`
- Modify: `nuxt-admin/server/utils/d1.ts`
- Modify: `nuxt-admin/server/routes/api/beatmaps/[...path].all.ts`

- [ ] **Step 1: Add a configuration validation fixture.**

  Create `nuxt-admin/scripts/check-free-worker-config.mjs` that parses `wrangler.toml` as text and exits non-zero when it finds `BLOG_MEDIA`, `[[r2_buckets]]`, `cpu_ms = 30000`, or a Beatmap migration reference. Add `npm run check:free-config`.

- [ ] **Step 2: Turn the Worker configuration into `blog-api`.**

  Set `name = "blog-api"`, retain `main = ".output/server/index.mjs"`, remove `[limits] cpu_ms = 30000`, remove `[[r2_buckets]]`, and retain only the D1 binding and non-secret API/origin variables. Add variables for `IMAGE_API_BASE_URL`, `PUBLIC_SITE_ORIGIN`, and `IMAGE_API_TOKEN` as a secret-only value (never committed as a literal).

- [ ] **Step 3: Remove R2-specific runtime access.**

  Remove `BLOG_MEDIA` from `BlogCloudflareEnv` and remove `getCloudflareMedia`. Keep `getCloudflareEnv`, D1 lookup, request origin/client address, and secret lookup. Replace all callers before deleting the helper.

- [ ] **Step 4: Keep retired Beatmap behavior explicit.**

  Ensure `/api/beatmaps/*` and `/admin/api/beatmaps/*` return `410` with `BEATMAP_API_RETIRED`; no active route reads Beatmap tables.

- [ ] **Step 5: Run configuration and API build checks.**

  ```powershell
  npm run check:free-config
  npm run build:api
  ```

  Expected: the config check passes and Nitro produces `.output/server/index.mjs` without requiring an R2 binding.

### Task 4: Replace Admin-Owned R2 Media With The Independent Image API

**Files:**
- Create: `nuxt-admin/server/utils/image-api.ts`
- Modify: `nuxt-admin/server/domain/config.ts`
- Modify: `nuxt-admin/server/domain/media.ts`
- Modify: `nuxt-admin/server/domain/assets.ts`
- Modify: `nuxt-admin/server/domain/gallery.ts`
- Modify: `nuxt-admin/server/routes/images/[...path].get.ts`
- Modify: `nuxt-admin/server/routes/admin/api/imagebed/config.get.ts`
- Modify: `nuxt-admin/server/routes/admin/api/imagebed/config.post.ts`
- Modify: `nuxt-admin/server/routes/admin/api/imagebed/files.get.ts`
- Modify: `nuxt-admin/server/routes/admin/api/imagebed/upload.post.ts`
- Modify: `nuxt-admin/server/routes/admin/api/imagebed/delete/[...file].post.ts`
- Modify: `nuxt-admin/server/routes/admin/api/imagebed/bulk-delete.post.ts`
- Test: `nuxt-admin/scripts/check-image-api-contract.mjs`

- [ ] **Step 1: Write the image API contract check first.**

  Add a fixture-driven Node test that verifies the adapter contract uses:

  ```text
  POST /upload?uploadChannel=cfr2&returnFormat=default[&uploadFolder=...]
  GET  /api/manage/list?start=...&count=...&channel=CloudflareR2&fileType=image
  GET  /api/manage/delete/<encoded-path>[?folder=true]
  Authorization: Bearer <Worker secret>
  upload multipart field: file
  upload response: [{ "src": "..." }]
  list response: { files, directories, totalCount, returnedCount }
  ```

  The check must fail if the token is added to a client payload or if a request omits the Bearer header.

- [ ] **Step 2: Implement `image-api.ts`.**

  Provide typed functions for `getConfig`, `listFiles`, `uploadFile`, `deleteFile`, and `deleteFiles`. Normalize `IMAGE_API_BASE_URL` to scheme/host, append the existing query parameters, forward the request body as a stream when possible, cap metadata/list sizes, parse bounded JSON responses, and convert non-2xx or `{ success: false }` responses into sanitized `createError` responses.

- [ ] **Step 3: Route imagebed operations through the adapter.**

  Preserve current Admin route paths and response fields (`domain`, `configured`, `files`, `directories`, `totalCount`, `deleted`, `failed`, `url`, `name`). The config route returns only the public image domain and upload folder plus `configured`; it never returns or accepts an API token.

- [ ] **Step 4: Synchronize D1 metadata after external operations.**

  After upload, derive a stable `public_id` from the returned path/URL, upsert `image_assets` with `source_url`, `storage_key`, content type, and active state, then return the image-host URL. After delete, mark matching `image_assets` inactive only after the image-host API succeeds. Use idempotent updates and preserve the external response when D1 synchronization fails so the operation is visibly unsuccessful.

- [ ] **Step 5: Replace `/images/*` object reads with redirects.**

  Resolve a valid public ID from D1, require an active asset with a safe `source_url`, and return a `302`/`307` redirect to the external URL with a short cache policy. Do not call `R2Bucket.get`, do not proxy arbitrary URLs, and return `404` for missing/unsafe metadata.

- [ ] **Step 6: Remove R2 dimension logic.**

  Gallery dimension refresh must consume dimensions from the image API response when available; otherwise retain existing dimensions and report skipped rows. It must not call `head()` on a bucket or download image bytes.

- [ ] **Step 7: Run image/media checks.**

  ```powershell
  node scripts/check-image-api-contract.mjs
  npm run typecheck
  ```

### Task 5: Make D1 Schema And SQLite Import Match The New Scope

**Files:**
- Modify: `nuxt-admin/migrations/0001_initial.sql`
- Modify: `nuxt-admin/migrations/0002_legacy_beatmaps.sql`
- Create: `nuxt-admin/migrations/0003_free_admin_cleanup.sql`
- Modify: `nuxt-admin/scripts/sqlite-d1-export.mjs`
- Modify: `nuxt-admin/scripts/sqlite-d1-verify.mjs`
- Modify: `nuxt-admin/scripts/sqlite-d1-import.mjs`
- Modify: `nuxt-admin/package.json`

- [ ] **Step 1: Add a migration cleanup test.**

  Run the local migration sequence against a fresh local D1 database and assert that `articles`, `comments`, `likes`, `galleries`, `image_assets`, `imagebed_configs`, `admin_users`, and `admin_sessions` exist while `cf_image_configs`, `beatmap_sets`, and `beatmap_difficulties` do not.

- [ ] **Step 2: Preserve migration history and add cleanup.**

  Do not rewrite an already-applied migration in a way that hides history. Make `0002_legacy_beatmaps.sql` historical/no-op for new installs and add `0003_free_admin_cleanup.sql` with:

  ```sql
  PRAGMA foreign_keys = ON;
  DROP TABLE IF EXISTS beatmap_difficulties;
  DROP TABLE IF EXISTS beatmap_sets;
  DROP TABLE IF EXISTS cf_image_configs;
  ```

- [ ] **Step 3: Narrow export/import/verify table maps.**

  Export only active blog/admin tables, retain IDs/slugs/timestamps/JSON/image metadata, omit imagebed credentials and Beatmap data, and update verification counts/checksums accordingly. Keep the existing statement-size splitting behavior for large article bodies.

- [ ] **Step 4: Add local migration commands.**

  Ensure these scripts use the revised migration set:

  ```powershell
  npm run db:export
  npm run db:migrate:local
  npm run db:verify
  ```

  Expected: local D1 foreign-key checks are clean, active table counts match the SQLite snapshot, and no Beatmap/media binary rows are imported.

### Task 6: Update Router, Pages Deployment, And CI/CD

**Files:**
- Modify: `cloudflare-worker/router.js`
- Modify: `cloudflare-worker/wrangler.toml`
- Create: `cloudflare-worker/router.test.mjs`
- Modify: `.github/workflows/release.yml`
- Modify: `nuxt-public/nuxt.config.ts` only if the final SSG API variable still requires a path correction

- [ ] **Step 1: Write router behavior tests.**

  Add `node:test` cases for:

  - `/admin/api/auth/session` reaches `BLOG_API` unchanged;
  - `/api/articles` reaches `BLOG_API` unchanged;
  - `/images/id` reaches `BLOG_API`;
  - `/admin/articles` fetches Admin Pages after stripping `/admin`;
  - a non-server path fetches Public Pages;
  - missing bindings return `503` without silently falling back to the old origin.

- [ ] **Step 2: Implement route precedence and Admin Pages mapping.**

  Change `SERVER_PATHS` handling to dispatch `/admin/api`, `/api`, and `/images` to `BLOG_API` first. Add an `ADMIN_PAGES_ORIGIN` helper, strip `/admin` for Admin Pages requests, and retry the Admin Pages index document for SPA deep-link 404s. Preserve request method, query, cookies, and `X-Forwarded-*` headers.

- [ ] **Step 3: Update Wrangler bindings.**

  Replace `BLOG_ADMIN` with `BLOG_API`, add `ADMIN_PAGES_ORIGIN`, and remove any `SERVER_ORIGIN` fallback from committed production configuration.

- [ ] **Step 4: Rewrite the release workflow.**

  Use jobs in this dependency order:

  ```text
  deploy-api -> deploy-admin-pages -> deploy-router -> deploy-public
  ```

  `deploy-api` applies D1 migrations and runs `npm run build:api`/`wrangler deploy`. `deploy-admin-pages` runs `npm run generate` and `wrangler pages deploy .output/public`. `deploy-router` deploys the Service Binding. `deploy-public` runs SSG after the new router/API is available. None of these jobs sets a Workers Paid CPU limit or uploads R2 bindings.

- [ ] **Step 5: Run router tests.**

  ```powershell
  node --test cloudflare-worker/router.test.mjs
  ```

### Task 7: Update Environment, Runbooks, And OpenSpec Progress

**Files:**
- Modify: `nuxt-admin/.dev.vars.example`
- Modify: `nuxt-admin/.env.example`
- Modify: `nuxt-admin/README.md`
- Modify: `nuxt-admin/DEPLOYMENT.md`
- Modify: `README.md`
- Modify: `docs/archive/Cloudflare-Production-Cutover.md`
- Modify: `docs/archive/Cloudflare-Production-Cutover.zh-CN.md`
- Modify: `openspec/changes/cloudflare-admin-d1-migration/tasks.md`

- [ ] **Step 1: Document the new secret ownership.**

  Document `IMAGE_API_BASE_URL` as a variable and `IMAGE_API_TOKEN` as a Worker Secret. Remove instructions that put an image token in D1 or the Admin UI. Document the Admin Pages project and `ADMIN_PAGES_ORIGIN`.

- [ ] **Step 2: Rewrite deployment and rollback instructions.**

  Replace Workers Paid, Admin-owned R2, SSR, `blog-admin`, and R2 object validation steps with Free limits, `blog-api`, Admin Pages, external image API checks, PBKDF2 canary, and D1-only migration checks. Keep production resource IDs and secrets as explicit environment inputs, never committed values.

- [ ] **Step 3: Mark only locally verified tasks complete.**

  Keep production D1 creation, real image API credential validation, password reset, public cutover, and observation-window tasks unchecked unless they were actually executed against the user's Cloudflare account. Do not claim a production deployment from local tests.

- [ ] **Step 4: Commit the implementation and documentation milestone.**

  ```powershell
  git add nuxt-admin cloudflare-worker .github/workflows/release.yml README.md docs openspec/changes/cloudflare-admin-d1-migration
  git commit -m "feat: 适配免费账户 SPA 后台部署"
  ```

### Task 8: Verification Gate And Handoff

**Files:**
- No new application files; verify the files changed in Tasks 2–7.

- [ ] **Step 1: Run focused static checks.**

  ```powershell
  npm run check:free-config
  node --test cloudflare-worker/router.test.mjs
  npm run typecheck --prefix nuxt-admin
  npm run generate --prefix nuxt-admin
  npm run build:api --prefix nuxt-admin
  npm run db:export --prefix nuxt-admin
  npm run db:migrate:local --prefix nuxt-admin
  npm run db:verify --prefix nuxt-admin
  ```

- [ ] **Step 2: Run local Wrangler smoke checks.**

  Start `wrangler dev` with local D1 and `.dev.vars`, then verify `/admin/login`, `/admin/articles`, `/admin/api/auth/session`, `/api/articles?limit=1`, `/api/beatmaps/test`, and `/images/missing`. Expected results are SPA shell, SPA deep-link shell, `401`/unauthenticated session, public API success, `410 BEATMAP_API_RETIRED`, and `404` respectively.

- [ ] **Step 3: Run the PBKDF2 canary.**

  Execute valid and invalid login plus password reset/change against the local Worker and record timing. Do not change iteration count based only on local timing; mark the production canary as an environment-bound gate.

- [ ] **Step 4: Review the diff for stale runtime dependencies.**

  ```powershell
  rg -n "Workers Paid|BLOG_MEDIA|BLOG_ADMIN|SERVER_ORIGIN|cpu_ms|cloudflare_module.*SSR|R2Bucket|beatmap_sets|beatmap_difficulties|ApiToken" nuxt-admin cloudflare-worker .github docs README.md openspec/changes/cloudflare-admin-d1-migration
  ```

  Expected: only historical/read-only documentation and explicit retirement references remain; no active runtime path requires those dependencies.

- [ ] **Step 5: Report production blockers explicitly.**

  If Cloudflare account credentials, D1 ID, Pages project names, or image API secrets are unavailable, stop after local verification and list the exact environment-bound commands still required. Do not fabricate production smoke results.


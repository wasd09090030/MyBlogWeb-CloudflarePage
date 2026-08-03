## Why

The previous migration proposal targeted Workers Paid, an SSR Admin Worker, and an Admin-owned R2 bucket. That topology does not match the confirmed deployment constraint: the account must remain on the Workers Free plan, the Admin is used by one administrator, and media is owned by an independent image-host project backed by R2.

The public site can remain static on Pages. The Admin can also be static, while a small Worker handles D1-backed API calls and proxies the independent image-host API. This removes SSR CPU cost, removes the Admin R2 binding, and keeps the existing same-origin browser contracts.

## What Changes

- **BREAKING**: build `nuxt-admin/` as a static SPA and deploy it to a separate Cloudflare Pages project.
- Add a `blog-api` Worker for public `/api/*`, administration `/admin/api/*`, authentication, D1 repositories, and Pages deployment operations.
- Keep `blog-router` as the public hostname entry point; route Admin static paths to Admin Pages and API/media compatibility paths to `blog-api`.
- Use D1 for articles, comments, likes, galleries, image metadata, administrator records, and durable sessions.
- Keep image/file binaries outside this project. Proxy authenticated image upload/list/delete requests to the independent image-host API using a Worker Secret.
- Preserve image `public_id`, `storage_key`, `source_url`, gallery records, and article cover references during SQLite import.
- Remove Admin R2 bindings, `cf_image_configs`, Beatmap schema/import behavior, and image-byte proxying from the active runtime.
- Preserve application username/password login with D1-backed opaque sessions and the existing same-origin cookie contract.
- Update CI/CD, local bindings, migration commands, SPA fallback behavior, smoke tests, and rollback documentation for the Free plan.

## Capabilities

### New Capabilities

- `cloudflare-admin-runtime`: Free-plan API Worker, Admin Pages deployment, and service-boundary routing.
- `d1-blog-storage`: D1 schema, migrations, repositories, and SQLite import for active blog/admin data.
- `r2-media-storage`: image metadata and compatibility URL behavior backed by an independent image-host API; no Admin R2 binding.
- `public-api-compatibility`: same-origin public API routes preserving the public site contract.

### Modified Capabilities

- `nuxt-admin-ssr-host`: becomes a static SPA Pages host with isolated Admin asset paths.
- `admin-bff-auth`: keeps application password login but moves all protected API handling to `blog-api`.
- `admin-workspace`: keeps gallery and imagebed workflows while routing media operations through the external image-host API.

## Impact

- Affects `nuxt-admin/`, `cloudflare-worker/`, `.github/workflows/release.yml`, `nuxt-public/` build variables, D1 migrations/import tools, and deployment documentation.
- The active runtime no longer depends on PM2/Nginx, a Node SSR process, `backend-dotnet/BlogApi/`, an Admin R2 binding, or image-provider credentials in D1/Pages output.
- Requires a second Admin Pages project, a Free `blog-api` Worker, a D1 database, `BLOG_API` service binding, and image-host API variables/secrets.
- Requires a maintenance-window data cutover. Once D1 receives production writes, rollback requires an export/restore or reverse-sync decision.

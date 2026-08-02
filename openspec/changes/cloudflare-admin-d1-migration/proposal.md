## Why

The administration runtime still depends on a Node-hosted Nuxt SSR process, a .NET API, local SQLite, a file-backed password, and process-local refresh-token state. That topology prevents the admin application from being fully hosted on Cloudflare and makes authentication state non-durable across edge isolates. The existing Cloudflare Pages public site and R2-backed media provide a suitable foundation for moving the admin runtime and relational data to Cloudflare now.

## What Changes

- **BREAKING**: deploy `nuxt-admin/` as a Cloudflare Workers/Nitro `cloudflare_module` application instead of a Node server managed by PM2/Nginx.
- Add a Cloudflare D1 database as the production source of truth for blog, comment, gallery, image metadata, configuration, administrator, and session data.
- Reuse the existing R2 bucket for media objects and replace runtime dependence on the external imagebed API with Worker-controlled R2 operations.
- Implement the public `/api/*` and administration `/admin/api/*` contracts inside the Cloudflare runtime, preserving response shapes used by `nuxt-public/` and `nuxt-admin/`.
- Replace .NET JWT and process-local refresh tokens with D1-backed opaque admin sessions and a one-time administrator password reset using an edge-compatible password hash.
- Change the existing front-door Worker to route server prefixes through a Service Binding to the new admin Worker while leaving public pages on Cloudflare Pages.
- Preserve the administration operation that triggers public Pages deployment, implemented through a Worker secret and the Cloudflare API or the existing deployment integration.
- Migrate existing SQLite data and preserve primary keys, article URLs, image asset identifiers, and existing R2 object keys.
- Retire Beatmap API behavior and preserve or archive its historical data without migrating the unused upload/parser workflow.
- Update CI/CD, local development bindings, migration commands, smoke tests, and rollback documentation for the Cloudflare-only runtime.

## Capabilities

### New Capabilities

- `cloudflare-admin-runtime`: Cloudflare Worker hosting, bindings, service-boundary routing, and production deployment behavior for `nuxt-admin`.
- `d1-blog-storage`: D1 schema, migrations, repositories, data import, and relational consistency rules for the blog domain.
- `r2-media-storage`: R2-backed image/media upload, lookup, delivery, and thumbnail compatibility behavior.
- `public-api-compatibility`: Same-origin public API routes that preserve the existing public site contract after the .NET API is retired.

### Modified Capabilities

- `nuxt-admin-ssr-host`: change the host from a Node SSR server to a Cloudflare Worker while preserving `/admin/*` SSR and `/_ssr/*` asset behavior.
- `admin-bff-auth`: replace .NET token exchange and access/refresh cookies with D1-backed opaque sessions, edge-compatible password hashing, and the same-origin security contract.
- `admin-workspace`: keep the current administration workflows while replacing imagebed and backend service dependencies with the Cloudflare domain services.

## Impact

- Affects `nuxt-admin/`, `cloudflare-worker/`, `.github/workflows/release.yml`, `nuxt-public/` API build/runtime configuration, and new D1/R2 migration and binding files.
- Retires runtime dependencies on `backend-dotnet/BlogApi/`, `blog.sqlite`, `admin-password.enc`, EF Core, ImageSharp, and the process-local refresh-token store.
- Requires Cloudflare Workers Paid production plan, an existing R2 bucket name, D1 database identifiers, Worker service bindings, and secrets for session hashing, AI access, and Pages deployment.
- Requires a maintenance-window data cutover. After new writes reach D1, rollback to SQLite is not an automatic lossless operation; the old backend remains read-only during an observation window.

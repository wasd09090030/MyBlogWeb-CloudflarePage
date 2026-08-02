## Context

The current `nuxt-admin` application is a Node SSR server whose Nitro BFF forwards protected requests to a .NET API. The .NET API owns EF Core SQLite data, a file-backed administrator password, in-memory refresh tokens, imagebed integration, and several legacy services. The public site is already a Cloudflare Pages SSG application, and the existing front-door Worker routes server prefixes to a separate origin.

The confirmed target is Cloudflare-only production for the active blog/admin workflows:

- Workers Paid is the production baseline.
- The existing R2 bucket behind `cfimg.wasd09090030.top` is reused.
- Administrators accept a one-time password reset during cutover.
- Beatmap API behavior is retired; historical data may be preserved but its unused parser/upload workflow is not migrated.
- The admin action that triggers a public Pages deployment remains available.

The repository has no complete automated test suite, so the implementation must provide focused repository tests/fixtures where practical and a deterministic manual smoke-test path for Worker, D1, R2, SSR, authentication, and public API behavior.

## Goals / Non-Goals

**Goals:**

- Run `nuxt-admin` as a Cloudflare Worker using Nitro `cloudflare_module`.
- Keep `/admin/*`, `/admin/api/*`, `/api/*`, `/images/*`, and `/_ssr/*` externally stable.
- Move active relational data and durable admin session state to D1.
- Reuse the existing R2 object keys and deliver/upload media through Worker bindings.
- Preserve public API response shapes used by `nuxt-public` and admin workflow behavior.
- Preserve the Pages deployment operation through a secret-backed Cloudflare API call.
- Make cutover repeatable with explicit migrations, import verification, backups, and a documented observation/rollback policy.

**Non-Goals:**

- Rebuild or redesign the Nuxt UI workspace; the existing six active admin workflows remain the UI surface.
- Migrate the retired Beatmap upload/parser implementation.
- Store media binaries in D1 or expose R2 as an unauthenticated write API.
- Maintain dual writes to SQLite and D1 after cutover; this would make consistency and rollback less predictable.
- Delete legacy `.NET`, `nuxt/`, or historical database files in this change; cleanup is a later change after the observation window.

## Decisions

### D1: One admin Worker, front-door Service Binding

`nuxt-admin` will build with Nitro's `cloudflare_module` preset and deploy as `blog-admin`. The existing `blog-router` remains the public routing Worker and declares a Service Binding to `blog-admin`. Requests for `/admin`, `/api`, `/images`, and `/_ssr` are forwarded to that binding; all other requests continue to the public Pages origin.

This keeps the public URL contract and isolates bindings/secrets to the admin runtime. It also avoids an extra public HTTP hop. A Pages SSR project was considered, but Workers are the current Nitro recommendation for this binding-heavy application and provide a clearer deployment unit for D1, R2, scheduled cleanup, and internal routing.

### D2: Direct server routes and repositories, no backend proxy

The existing `/admin/api/*` Nitro handlers will call typed domain services and D1 repositories directly. Public compatibility routes will be added under `server/routes/api/*`. The browser will continue to call same-origin admin routes, and `nuxt-public` will use relative `/api` at runtime.

The .NET API path will not remain as a runtime fallback. Keeping a proxy would preserve the independent backend dependency and make the Cloudflare migration incomplete. API DTOs are normalized at the route boundary so D1 column names never become a browser contract.

### D3: Raw D1 SQL with explicit migrations

The first implementation will use the native D1 prepared-statement API rather than adding an ORM. The data set is small, the current schema is already SQLite, and explicit SQL keeps migration behavior visible and avoids adding another edge-runtime compatibility surface. Repository functions will own query text and row mapping; dynamic values are always bound.

Tables will be normalized to lower-case snake_case while preserving primary-key IDs. Core tables are `articles`, `comments`, `likes`, `galleries`, `image_assets`, `cf_image_configs`, `admin_users`, and `admin_sessions`. Existing beatmap tables may be imported for preservation but have no active route requirements.

D1 `batch()` will be used for multi-statement writes that must commit together. Queries that require read-after-write consistency will use a primary-first D1 session or remain within one batch. List endpoints must be paginated and indexed.

### D4: Opaque D1 sessions and one-time password reset

Login will verify the administrator against a D1 user row containing a PBKDF2-SHA-256 hash, salt, iteration count, and algorithm version. The cutover procedure creates/resets this row; the old bcrypt file is not bundled into the Worker.

The browser receives only a random opaque session token in `__Host-admin_session`. The Worker stores a SHA-256/pepper-derived token hash in `admin_sessions` with expiry, revocation, and audit metadata. Protected requests validate the session in D1. Logout revokes the current session. Password change rehashes the new password and revokes all other sessions.

This is preferred over JWT plus D1 refresh tokens because the active admin has no need for independently verifiable bearer tokens, and a single durable session table avoids the old process-local state problem. Cloudflare Access was considered, but it would replace the current application login flow and add account-level configuration outside this change.

### D5: R2-native media with compatibility URLs

The existing R2 bucket and object keys are reused. `image_assets` continues to map stable public IDs to storage keys. A Worker image route resolves metadata from D1 and reads the object from R2; public response headers preserve long-lived immutable caching. Upload/delete/list operations are admin-authenticated and stream request bodies directly to R2.

The old third-party/imagebed API token is not copied to D1 or Worker source. Configuration rows retain only compatibility metadata where needed; credentials move to Worker secrets. Thumbnail behavior uses a Cloudflare-compatible transform path and falls back to the original object when a transform is unavailable.

### D6: Preserve Pages deployment operation through a secret-backed route

`/admin/api/ops/pages/deploy-hook` remains an authenticated state-changing route. Instead of calling the .NET deployment service, it calls the Cloudflare Pages deploy hook/API using a Worker secret. The secret is never stored in D1 or returned to the browser.

### D7: Ordered cutover with one-way write ownership

Migration order is D1 schema, staging import/verification, admin Worker, router binding, public Pages build, and then production cutover. The old server remains read-only during an observation window. Before D1 receives new writes, rollback can route traffic back to the old origin. After D1 writes, rollback requires an explicit reverse-sync or database restore; it is not treated as an automatic operation.

## Risks / Trade-offs

- [D1 is single-threaded per database] -> Add indexes, use bounded pagination, batch related writes, and run production on Workers Paid.
- [Worker CPU/memory and request-body limits affect SSR and uploads] -> Stream R2 bodies, avoid buffering large files, remove ImageSharp/file-system code, and retire the unused 200 MB Beatmap upload path.
- [PBKDF2 parameters or password cutover are mishandled] -> Require a maintenance-window reset, store algorithm metadata, reject weak parameters, and revoke sessions after a password change.
- [Existing image URLs may reference objects outside the confirmed bucket] -> Import and validate every `image_assets.storage_key`; block cutover if referenced keys cannot be read from the reused R2 bucket.
- [Public API response drift breaks SSG/client code] -> Preserve endpoint paths/statuses and add fixture comparisons for articles, gallery, and comments before changing the public build URL.
- [Service binding deployment order is wrong] -> Deploy `blog-admin` before `blog-router`; keep router changes backward-compatible during the first deploy.
- [D1 writes make SQLite rollback stale] -> Take a final export, freeze the old writer, retain the old runtime read-only, and document the exact restore/reverse-sync decision.
- [Pages deploy hook secret is over-privileged] -> Scope the token to the required Pages project/action and keep it only as a Worker secret.

## Migration Plan

1. Add D1/R2 bindings, migration SQL, local Wrangler configuration, and a read-only SQLite export/import verifier.
2. Create a staging D1 database, import existing rows, validate counts/IDs/foreign keys, and verify sample R2 objects through the reused bucket.
3. Implement D1 repositories and active public/admin API routes while retaining the current Node/.NET path in production.
4. Implement session/password migration, R2 media routes, Pages deploy operation, rate/CSRF checks, and focused contract fixtures.
5. Switch `nuxt-admin` to `cloudflare_module`, add `blog-admin` deployment, and validate SSR, cookies, D1, R2, and local `wrangler dev` behavior.
6. Change the front-door Worker to use a Service Binding, deploy router after admin, update public SSG API build variables, and run smoke tests.
7. During the cutover window, reset the administrator password, import the final SQLite snapshot, switch writes to D1, and monitor the old runtime as read-only.
8. After the observation period, archive the old runtime and Beatmap implementation in a separate cleanup change.

## Open Questions

The product decisions are resolved for this change. Implementation still needs the production R2 bucket name/ID, D1 database ID, Pages project name, Cloudflare account ID, and the exact deploy-hook/API permission available to the deployment environment. These are environment inputs, not architecture choices, and will be represented by Wrangler bindings/secrets rather than committed credentials.

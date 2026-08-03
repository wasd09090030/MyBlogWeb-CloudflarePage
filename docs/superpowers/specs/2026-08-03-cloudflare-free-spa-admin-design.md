# Cloudflare Free SPA Admin Deployment Design

Date: 2026-08-03

## Decision Summary

The production target is a Cloudflare Free account. Workers Paid is explicitly out of scope.

The public blog remains a static Cloudflare Pages site. The administration UI becomes a static Nuxt SPA on a separate Pages project. A lightweight `blog-api` Worker owns D1 access, application authentication, public API routes, administration API routes, and the adapter to the independent image-host API. The existing front-door `blog-router` Worker keeps the public hostname and dispatches requests by path.

The administration runtime does not bind R2 and does not store media binaries. D1 stores relational blog data and image metadata only. Beatmap data and behavior are not migrated.

## Goals

- Deploy the public site and Admin without upgrading to Workers Paid.
- Keep the existing public hostname and `/admin/*`, `/api/*`, and `/images/*` URL contracts where practical.
- Remove Admin SSR so static Admin assets do not consume Worker CPU.
- Keep application username/password login with durable D1 sessions.
- Migrate articles, comments, likes, gallery records, image metadata, and administrator state from SQLite.
- Use the independent image-host API for image upload, deletion, listing, and lookup.
- Preserve public API response shapes used by `nuxt-public`.
- Keep the Pages deploy operation available from the Admin API.
- Make the migration observable and reversible before D1 starts receiving production writes.

## Non-Goals

- Upgrade to Workers Paid.
- Store image or other file binaries in D1 or in the Admin Worker.
- Bind the Admin Worker to the image-host R2 bucket.
- Migrate or retain active Beatmap routes, uploads, parsers, or database tables.
- Replace application login with Cloudflare Access.
- Redesign the Admin UI workflows.
- Delete the legacy .NET service, old Nuxt application, or SQLite file during this change.

## Architecture

```text
Browser
  |
  v
blog-router Worker (Free)
  |-- /admin/api/*, /api/*, /images/* --> blog-api Worker
  |-- /admin/* -----------------------> Admin Pages (static SPA)
  |-- everything else ----------------> Public Pages (static SSG)

blog-api Worker
  |-- D1: articles, comments, likes, galleries, image metadata,
  |        administrator and sessions
  |-- independent image-host API: upload, delete, list, lookup
  |-- Cloudflare Pages deploy hook/API
```

### Deployment Units

1. `nuxt-public` remains the existing static Pages project.
2. `nuxt-admin` keeps the Vue/Nuxt application code but builds with `ssr: false` and is deployed as a separate static Pages project.
3. `blog-api` is a Worker with a minimal Fetch/API runtime. It has a D1 binding and no R2 binding.
4. `cloudflare-worker` remains `blog-router`. Its service binding changes from `BLOG_ADMIN` to `BLOG_API`, and it receives an `ADMIN_PAGES_ORIGIN` variable.

The public hostname remains the source of truth. The router checks `/admin/api` before `/admin` so API requests cannot be mistaken for static SPA requests. For static Admin requests, the router removes the external `/admin` prefix before fetching the Admin Pages origin and falls back to the SPA entry document for deep links. Admin assets are exposed under an `/admin/_nuxt/*`-style public prefix and are mapped to the Pages origin's static asset path.

The old `/_ssr/*` contract is retired because the Admin is no longer SSR. A compatibility response may be retained during the observation window, but no production asset depends on it.

### Free-Plan Constraints

- Static HTML, JavaScript, and CSS are served by Pages and do not require an SSR Worker invocation.
- `blog-api` must avoid SSR, image-byte proxying, unbounded queries, and large request buffering.
- Free Worker limits remain hard constraints: 100,000 requests per day, 10 ms CPU per invocation, and 50 subrequests per request.
- D1 uses the Free account limits; list APIs stay bounded and indexed.
- R2 billing and quota remain owned by the independent image-host project; the Admin deployment has no R2 binding.
- The login and password-reset PBKDF2 path is an explicit canary gate because the existing hash uses 210,000 iterations.

## Admin SPA Behavior

- The Admin build contains no server-rendered business data and no secrets.
- The SPA starts with a public shell and calls `/admin/api/auth/session` after loading.
- A client route guard redirects `401` responses to `/admin/login` and `428` responses to the password-reset page.
- Server-side authorization remains mandatory on every `/admin/api/*` route. Client guards are only a navigation convenience.
- Admin requests use same-origin relative URLs and `credentials: include`; no cross-origin CORS contract is introduced.
- Pages fallback rules must support direct navigation to `/admin/articles`, `/admin/gallery`, `/admin/imagebed`, and other existing deep links.

## D1 Data Model and Migration

### Active Tables

The production schema contains:

- `articles`
- `comments`
- `likes`
- `galleries`
- `image_assets`
- `imagebed_configs` for non-sensitive public domain/default-folder metadata only
- `admin_users`
- `admin_sessions`

`cf_image_configs` is removed because image transformation configuration belongs to the independent image-host project. No `beatmap_sets` or `beatmap_difficulties` migration is applied.

`image_assets` remains metadata-only. It preserves `public_id`, `storage_key`, `source_url`, content type, version, kind, active state, and timestamps. `galleries.image_url` and `articles.cover_image` remain compatible with existing data, and cover/gallery references retain their original IDs.

### SQLite Import

The export/import tooling is narrowed to the active tables. It continues to preserve:

- primary-key IDs;
- article slugs and timestamps;
- markdown/JSON text fields;
- comment and gallery foreign keys;
- gallery ordering and active state;
- image `public_id`, `storage_key`, and source URL.

No image object is copied. No provider token is exported. `admin_users` and `admin_sessions` are initialized through the one-time reset flow rather than importing the old password file or process-local tokens.

The migration verifier checks row counts, primary-key coverage, foreign keys, slug uniqueness, image metadata references, and representative image-host lookups. It does not require the Admin Worker to read an R2 bucket.

## Independent Image-Host API

The API adapter keeps the current Admin-facing operation names while isolating the external contract:

```text
/admin/api/imagebed/config
/admin/api/imagebed/files
/admin/api/imagebed/upload
/admin/api/imagebed/delete/*
/admin/api/imagebed/bulk-delete
```

The adapter uses:

- `IMAGE_API_BASE_URL` as a non-secret Worker variable;
- `IMAGE_API_TOKEN` as a Worker Secret;
- an explicit request/response mapper for upload, list, delete, and lookup operations.

Upload bodies are streamed to the image-host API. The Worker never stores file bytes in D1 or buffers an entire file in memory. A successful upload is followed by an idempotent `image_assets` metadata upsert. A successful delete marks the corresponding metadata inactive. External API failures do not produce a successful Admin response.

`source_url` is the canonical public URL when available. `storage_key` remains an opaque metadata value used for stable identity and reconciliation. The compatibility `GET /images/<public-id>` route resolves the metadata and redirects to the external stable URL; it does not proxy image bytes. If the image API supplies dimensions, those values are stored on gallery rows. The Worker does not download or parse image binaries to calculate dimensions.

The exact external endpoint paths, authentication header, upload field name, and response fields are deployment inputs and must be documented before implementation.

## Authentication

Application username/password login is retained.

- Password hashes remain PBKDF2-SHA-256 with per-user salt and stored iteration/algorithm metadata.
- The current 210,000-iteration setting is retained initially.
- A valid login creates a random opaque session token; D1 stores only a peppered token hash.
- The cookie remains `__Host-admin_session` over HTTPS with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and the configured bounded TTL.
- Logout revokes the current session.
- Password changes rehash the new password and revoke other sessions.
- Origin checks and mutation validation remain on all state-changing Admin API requests.
- No authentication state is kept in Worker global memory or a deployed file.

The 210,000-iteration login, reset, and password-change operations are release gates on the Free plan. A real Free deployment must complete valid and invalid password checks without a CPU-limit response. Iteration counts are never silently reduced; any security-parameter change requires an explicit follow-up decision.

## API Boundaries

`blog-api` owns the current public and Admin route contracts:

- public article, gallery, comment, and like endpoints under `/api/*`;
- Admin article, comment, gallery, image-host, authentication, AI, and Pages deployment endpoints under `/admin/api/*`;
- compatibility `/images/*` redirects;
- retired Beatmap paths returning `410` with `BEATMAP_API_RETIRED`.

Repositories use prepared D1 statements, bounded list queries, indexes, and batch writes for related article/gallery/session changes. The external image-host API is called only through the adapter; browser code never receives the provider token.

## CI/CD and Cutover

The release workflow runs jobs in this order:

1. Apply D1 migrations and verify the target database.
2. Build and deploy `blog-api`.
3. Generate and deploy the Admin SPA Pages artifact.
4. Deploy `blog-router` with the `BLOG_API` binding and Admin Pages origin.
5. Generate and deploy the public Pages artifact using the public `/api` contract.

Required configuration is split by ownership:

- API Worker: D1 binding, `SESSION_PEPPER`, `ADMIN_RESET_TOKEN`, image API base URL/token, public/admin origins, Pages deploy secret, and optional AI secret.
- Router: public Pages origin, Admin Pages origin, and the `BLOG_API` service binding.
- Pages projects: public build variables only; no D1 credentials or provider tokens.

The cutover window performs a final SQLite export, freezes the old writer, imports and verifies D1, executes the administrator reset, deploys the router, and runs the smoke suite. The old .NET runtime remains read-only during the observation window.

Before D1 receives new writes, rollback is a routing change. After D1 receives production writes, rollback requires a D1 export/restore or an explicit reverse-sync decision; it is not an automatic origin switch.

## Verification

### Static and Routing Checks

- public home, article, gallery, and about pages remain `200`;
- `/admin/login` and every existing Admin deep link load the SPA entry document;
- Admin assets use the isolated prefix and do not collide with public `/_nuxt/*` assets;
- `/api/*` and `/admin/api/*` reach `blog-api` through the router;
- old `/_ssr/*` paths are not required by the new build.

### Data and API Checks

- D1 row counts, IDs, slugs, foreign keys, and image metadata match the final SQLite export;
- login, session persistence, logout, password reset, and password-change revocation work across requests;
- article, comment, like, gallery, and ordering contracts match the existing public/Admin consumers;
- image-host upload/list/delete calls use the external API and synchronize metadata;
- `/images/<public-id>` redirects to the external stable URL;
- Beatmap routes return the explicit retired response;
- Pages deployment operation succeeds without exposing its secret.

### Free-Plan Gate

The production canary must include valid/invalid login, session lookup, one article read, one article mutation, gallery read, and one image-host metadata operation. Any CPU-limit response, unbounded request body, missing binding, or unexpected D1 quota error blocks the cutover.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| PBKDF2 exceeds Free CPU | Canary gate; retain security parameters; do not silently weaken hashing |
| Image API contract differs from current UI | Isolate a typed adapter and require endpoint/response mapping before implementation |
| External delete and D1 metadata update are not atomic | Use idempotent operations, explicit error responses, and a reconciliation command |
| SPA deep links return 404 | Router prefix mapping plus Pages fallback tests |
| Public API data drifts during migration | Fixture/contract checks before switching SSG and public traffic |
| D1 writes make SQLite stale | Final export, writer freeze, read-only observation period, documented reverse-sync decision |
| Provider credential leaks | Worker Secret only; sanitized config responses; no credentials in D1 or Pages output |

## Required Inputs Before Implementation

1. The independent image-host API base URL, authentication header/token format, upload/list/delete/lookup paths, multipart field name, and response examples.
2. Production D1 database ID and the final names/origins of the public Pages, Admin Pages, API Worker, and router deployments.
3. Confirmation that the current public hostname continues to route `/admin` through `blog-router`.
4. A Free-plan canary result for the current PBKDF2 parameters before the cutover is declared ready.


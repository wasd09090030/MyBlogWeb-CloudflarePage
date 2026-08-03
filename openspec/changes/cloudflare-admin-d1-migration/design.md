## Context

The public blog is already a static Cloudflare Pages application. The current migration implementation instead assumes Workers Paid, an SSR `blog-admin` Worker, and an Admin-owned R2 bucket. The confirmed target is a Cloudflare Free account with a single administrator and an independent image-host project that owns R2 media.

The Admin UI remains the existing Nuxt UI v4 workspace. It becomes a static SPA. A `blog-api` Worker keeps the server-side responsibilities: D1 queries, application authentication, public/admin API routes, Pages deployment, and the image-host API adapter.

## Goals / Non-Goals

**Goals:**

- Serve the public site and Admin without Workers Paid.
- Preserve the public hostname and `/admin/*`, `/api/*`, and compatibility `/images/*` paths.
- Use Pages for both static frontends and a Free Worker for dynamic API requests.
- Keep application username/password login and D1-backed opaque sessions.
- Migrate articles, comments, likes, galleries, image metadata, and administrator state.
- Route image operations to the independent image-host API; never store media binaries in D1 or the Admin runtime.
- Keep public API response shapes and Pages deployment behavior.

**Non-Goals:**

- SSR Admin pages or `/_ssr/*` assets.
- Workers Paid CPU limits or Paid-only bindings.
- Admin-owned R2 upload/read/delete behavior.
- Beatmap tables, uploads, parsers, or active routes.
- Cloudflare Access replacing application login.
- Deleting legacy .NET/old Nuxt/SQLite source during this change.

## Decisions

### D1: Static Pages plus a Free API Worker

`nuxt-public` remains the public Pages project. `nuxt-admin` builds with `ssr: false` and deploys to a separate Admin Pages project. `blog-api` is built from the Nitro server output and owns all D1/API routes. `blog-router` keeps the public hostname and routes `/admin/api`, `/api`, and `/images` to `blog-api`; other `/admin` requests are mapped to Admin Pages, and all other paths go to Public Pages.

The router strips the external `/admin` prefix when fetching the Admin Pages origin and falls back to the SPA entry document for deep links. Admin assets use an `/admin/_nuxt/*`-style public path and do not depend on `/_ssr/*`.

### D2: D1 Active Schema

Active tables are `articles`, `comments`, `likes`, `galleries`, `image_assets`, `imagebed_configs` (non-secret compatibility metadata), `admin_users`, and `admin_sessions`. `cf_image_configs`, `beatmap_sets`, and `beatmap_difficulties` are not part of the final schema. Existing migration history is preserved with a cleanup migration for any previously-created legacy tables.

Image assets preserve stable IDs, storage keys, public URLs, content types, and active state. D1 stores metadata only.

### D3: Independent Image-Host API

`blog-api` uses `IMAGE_API_BASE_URL` and the `IMAGE_API_TOKEN` Worker Secret. It preserves the existing Admin API paths while adapting to the image-host protocol:

- `POST /upload?uploadChannel=cfr2&returnFormat=default[&uploadFolder=...]` with multipart field `file`;
- `GET /api/manage/list` with `channel=CloudflareR2` and `fileType=image`;
- `GET /api/manage/delete/<encoded-path>[?folder=true]`;
- `Authorization: Bearer <token>`.

The adapter streams uploads, bounds list/delete inputs, sanitizes provider errors, and never returns the token. Upload success is followed by an idempotent D1 metadata upsert; delete success marks metadata inactive. `/images/<public-id>` resolves metadata and redirects to the stable external URL without proxying image bytes.

### D4: Application Authentication

The SPA calls same-origin `/admin/api/auth/session` after loading. Login verifies the D1 PBKDF2 record and creates a random opaque session in `__Host-admin_session`. Every Admin API route validates the D1 session and Origin/mutation rules. Logout revokes the session; password changes rehash and revoke other sessions. The existing 210,000-iteration PBKDF2 setting is retained initially and must pass a real Free Worker CPU canary before cutover; no automatic weakening is allowed.

### D5: Free-Plan Limits

Static Pages assets avoid Worker CPU. `blog-api` avoids SSR, R2 operations, image-byte proxying, unbounded SQL, and request-body buffering. Free limits are treated as hard gates: 100,000 requests/day, 10 ms CPU/invocation, 50 subrequests/request, and D1 Free storage/read/write limits.

### D6: Ordered Deployment and Rollback

CI order is D1 migration/verification, `blog-api`, Admin Pages, `blog-router`, and Public Pages SSG. Before D1 receives production writes, rollback is a router change. Afterwards it requires D1 export/restore or reverse sync. The old .NET runtime remains read-only during the observation window.

## Migration Plan

1. Apply the cleanup migration and narrow the SQLite export/import to active tables.
2. Build the Admin SPA and Free API Worker locally; verify D1/auth/public/API/image-host contracts.
3. Deploy a staging D1 database, `blog-api`, Admin Pages, and router with the required environment inputs.
4. Run the one-time password reset and image-host metadata checks.
5. Generate/deploy the public Pages artifact after the new API path is available.
6. Perform the maintenance-window cutover and retain the old writer as read-only.

## Open Inputs

- Production D1 ID and Pages project names/origins.
- Image-host API base URL and Worker token.
- Cloudflare API/Pages deploy secret.
- Real Free-plan PBKDF2 canary result.

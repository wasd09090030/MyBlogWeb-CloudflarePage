# Cloudflare Free Deployment

`nuxt-admin` has two outputs: a static Admin SPA for the `myblog-admin` Pages project and a Free-plan `blog-api` Worker. The Worker owns D1, application login, public/admin APIs, Pages deployment operations, and the adapter for the independent image-host project. It does not bind R2, render SSR pages, or run the retired .NET service.

## Provisioning

From `nuxt-admin/`:

```powershell
npx wrangler d1 create blog-db
```

Copy the returned `database_id` into `wrangler.toml` locally or through the deployment environment. Do not commit production identifiers or secrets. Create the two Pages projects separately (`myblog-admin` and `myblogweb-cloudflarepage`) and set their origins in `cloudflare-worker/wrangler.toml`.

The Worker stores provider credentials only as secrets:

```powershell
npx wrangler secret put IMAGE_API_TOKEN --config wrangler.toml
npx wrangler secret put SESSION_PEPPER --config wrangler.toml
npx wrangler secret put ADMIN_RESET_TOKEN --config wrangler.toml
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml
npx wrangler secret put DEEPSEEK_API_KEY --config wrangler.toml
```

`IMAGE_API_BASE_URL`, `PUBLIC_ASSET_ORIGIN`, and the imagebed domain are non-secret metadata. The image-host token must never be placed in D1, `wrangler.toml`, Pages output, or browser state. `DEEPSEEK_API_KEY` and the Pages fallback credentials are optional features.

## Permanent thumbnail transformations

`blog-api` binds Cloudflare Images as `env.IMAGES` for the stable
`/images/thumb/{publicId}.webp` route. Transformations are fixed per named
display variant: article cards use `card` (`720px` / q75), gallery grids use
`grid` (`1024px` / q85, also the default for the legacy bare URL), Hero uses
`hero` (`1280px` / q80), and fullscreen lightboxes use `lightbox`
(`2048px` / q82). All variants use
`scale-down` and output WebP with a one-year immutable cache header. The
legacy `/images/thumb/{publicId}.webp` URL defaults to `grid`. Article detail
covers use the native image via the `/images/{publicId}` redirect. Client
requests cannot choose dimensions, quality, format, or source URLs.

The Images Free plan includes 5,000 unique transformations per calendar month
for external/R2-backed images. The current registry has 361 active assets, so
one fixed variant per asset remains within that allowance. Repeat requests for
the same source and parameters in the same month are counted once. New
transformations after the allowance return a non-leaking `503` and are not
charged; cached variants continue to serve.

The binding and Worker Cache are declared in `wrangler.toml`:

```toml
[cache]
enabled = true

[images]
binding = "IMAGES"
```

Run `npm run check:image-transform` before deploying and verify one known
thumbnail returns `image/webp`, a resized natural dimension, and
`Cache-Control: public, max-age=31536000, immutable` after deployment.

Before deploy, run the local gates:

```powershell
npm run check:free-config
npm run check:image-api
npm run check:image-transform
```

## Data cutover

### Gallery duplicate detection

Apply `migrations/0006_gallery_image_fingerprints.sql` before releasing the updated
`blog-api` and Admin Pages. It adds a cache table only; existing gallery rows and
image files are unchanged. Deployment remains manual; use the normal migration,
API, then Admin Pages order below. This change requires no public-site or router
deployment, additional bindings, provider secrets, image transformations, or AI service.

In the gallery, use **检查重复图片** to build the initial fingerprint cache. The
scan includes hidden records and paginates beyond the ordinary 2000-row management
list. Single additions, changed image URLs, and batches (up to 500) are submitted
directly by default and do not read image contents. Select **保存前可选检查重复图片**
or **导入前可选检查重复图片** to run a preflight; batch candidates are compared to
both existing records and earlier candidates. Duplicates and unreadable candidates
default to skipped. Explicitly select images to retain; incomplete results also
require acknowledgement. Both scan results and the gallery list use the same
gallery DELETE API. After explicit confirmation, it deletes the provider file,
then deactivates matching assets and removes the gallery record and related
fingerprints in one D1 transaction. Other gallery entries (including hidden
entries), article covers and Hero items referencing the same storage key block
deletion, including legacy URLs and public/thumbnail shortlinks. Unsupported
external sources are rejected. Provider failures preserve the gallery record;
database failures after remote deletion can be retried because the provider's
file deletion is idempotent. Only an explicit provider success response permits
database cleanup. This extension needs no additional migration or secret.

**批量删除较晚的重复图片** removes the later records of exact duplicates: identical
stored files or zero perceptual distance (0 / 64). Every group keeps its oldest record,
and a record older than the kept one is never deleted. Deletion runs only after explicit
confirmation, in batches of 20 records per request, to stay inside the Free plan's
50-subrequest limit. A duplicate whose file is still shared with the kept record, an
article cover, or a Hero item loses only its gallery row, so the shared file survives;
an exclusively owned file is deleted from the image host. The result reports records
removed with file deletion, records removed without it, and any skipped or failed items.

The file deletion is permanent: rolling back code does not restore deleted files.
Reference checks cover the fields above; free-form article/diary body links and
links outside this database are not tracked. A concurrent write after the
reference check can still add a reference; avoid editing the same files during
cleanup. Deploy API and Admin Pages together so the confirmation matches the
server behavior, and rebuild the public SSG after gallery content changes.

Fingerprints are computed in the browser using versioned DCT pHash with color,
detail, and aspect-ratio checks. Successful fingerprints are reused for 30 days.
**强制重新读取全部图片** refreshes originals when a URL's content has changed;
retries after a forced refresh continue to ignore stale cached fingerprints.
Read failures remain visible and retryable. A catalog/API failure stops preflight.

Source reads use session-protected `/admin/api/gallery/duplicates/*` endpoints.
Only `IMAGE_API_BASE_URL` / `PUBLIC_ASSET_ORIGIN` hosts and resolvable registered
`/images/*` links are supported. Every redirect is checked (maximum three).
The reader accepts JPEG/PNG/WebP/GIF/AVIF, at most 20 MB, within 20 seconds;
browser fingerprints reject decoded images above 40 million pixels. Animations
use their first frame. Unsupported hosts, SVG, failed downloads, and unsupported
browser decoders appear as explicit failures, rather than unique images.

Detection is advisory admin preflight. It permits deliberate retention and does
not enforce uniqueness against concurrent imports or direct API callers. Cropping,
watermarks, transparency/background changes, large edits, and very low-detail
images can produce misses or false matches; review the side-by-side images.
First scans download originals and can take time. Comparisons run in the browser
and yield periodically; very large collections may require a later indexed approach.

Validation (Node 22.18+; verified with Node 24):

```powershell
npm run check:gallery-duplicates
npm run generate
npm run check:gallery-duplicates:browser
```

The browser check uses a fresh temporary headless Edge profile and local mocked
APIs; set `CHROMIUM_BIN` for another Chromium installation. It does not access the
production database or provider. Core checks run all SQL migrations against an
isolated in-memory SQLite database. For rollback, restore the previous API and
Admin Pages together; the additive fingerprint cache table may remain in D1.

The export utility imports active blog/admin tables only: articles, comments, likes, galleries, image metadata, imagebed metadata, and administrator tables. It omits image bytes, provider tokens, `cf_image_configs`, and Beatmap data. Existing migration history is retained; `0003_remove_retired_tables.sql` removes the retired tables.

```powershell
npm run db:export
npm run db:migrate:local
npm run db:import
$db = Get-ChildItem .wrangler/state/v3/d1/miniflare-D1DatabaseObject -Filter '*.sqlite' | Where-Object Name -ne 'metadata.sqlite' | Select-Object -First 1 -ExpandProperty FullName
node scripts/sqlite-d1-verify.mjs --manifest .data/d1-import-manifest.json --sqlite $db
```

For production, apply migrations before importing during the maintenance window, then use `--remote`:

```powershell
npm run db:migrate:remote
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --remote --chunk-size 400000
```

Export a backup before the first production write. After import, validate row counts, checksums, slugs, foreign keys, gallery ordering, and representative external image URLs.

## Deploy order

Deployment is manual via local Wrangler (no GitHub Actions workflow). The order is fixed:

1. Apply D1 migrations and run Free/image API checks.
2. Build and deploy the `blog-api` Worker.
3. Generate and deploy the Admin SPA from `.output/public`.
4. Deploy `blog-router` with the `BLOG_API` service binding.
5. Generate and deploy the public Pages artifact.

Manual commands for the API and Admin Pages are:

```powershell
npm run deploy:api
npm run deploy:pages
cd ../cloudflare-worker
npm test
npx wrangler deploy --config wrangler.toml
cd ../nuxt-public
$env:NUXT_PUBLIC_API_BASE_URL='/api'
$env:NUXT_API_BASE_URL='https://wasd09090030.top/api'
npm run generate
npx wrangler pages deploy .output/public --project-name myblogweb-cloudflarepage
```

The Admin SPA keeps `/admin/*` as its page routes and emits assets under `/admin/_nuxt/`. The router forwards that path unchanged to the Admin Pages origin, whose artifact is deployed from `.output/public`. Deep Admin routes fall back to the SPA entry document; API and image paths never use that fallback.

## Password bootstrap and Free CPU canary

After the first import, use the reset endpoint with `ADMIN_RESET_TOKEN` to create the administrator, then rotate or remove that secret. The Free-plan deployment uses 100,000 PBKDF2-SHA-256 iterations: the original 210,000-iteration setting failed the production canary under the Free 10 ms CPU limit, while 100,000 completed successfully. This is an explicit security trade-off for the Free plan, not an automatic fallback; keep the verifier minimum at 100,000 and raise the work factor only after moving the Worker to a plan with sufficient CPU.

## Smoke test and rollback

Through the public hostname, verify `/admin/login`, an authenticated Admin deep link, session/logout/password-change behavior, public article/gallery/comment APIs, gallery mutations, an image upload/list/delete cycle, and `/images/<public-id>` returning a validated external redirect. `/api/beatmaps/*` must return `410 BEATMAP_API_RETIRED`. Trigger one Pages deployment operation when its secret is enabled.

Before D1 receives production writes, rollback is a router change back to the previous origins. After writes begin, export/restore or reverse-sync D1 before switching back. Keep the legacy .NET and old Nuxt sources read-only during the observation window; do not delete them in this change.

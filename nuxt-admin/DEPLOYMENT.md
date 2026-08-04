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
`/images/thumb/{publicId}.webp` route. The Worker accepts only the D1-resolved
image provider source and applies a fixed `scale-down` transformation chosen by
asset kind: article covers use `640px` at WebP quality `75`, while gallery and
other assets use `960px` at quality `85`. Responses carry a one-year immutable
cache header. Client requests cannot choose dimensions, quality, format, or
source URLs.

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

The release workflow enforces this order:

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

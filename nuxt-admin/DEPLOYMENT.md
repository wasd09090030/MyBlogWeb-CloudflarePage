# Nuxt Admin Cloudflare Deployment

`nuxt-admin` is deployed as the `blog-admin` Cloudflare Worker. Production assumes a Workers Paid account, one D1 database, and the existing R2 media bucket. The .NET API and PM2/Nginx deployment are retained only as a read-only rollback reference during the observation window.

## Provisioning

From `nuxt-admin/`:

```powershell
npx wrangler d1 create blog-db
npx wrangler r2 bucket create <production-bucket-name>
```

Copy the returned D1 `database_id` into `wrangler.toml`, and replace the R2 `bucket_name` with the production bucket. Do not commit those identifiers if the project keeps them private. The local placeholder `blog-media-dev` is valid for development only.

Set non-secret values in `wrangler.toml` and secrets with Wrangler:

```powershell
npx wrangler secret put SESSION_PEPPER --config wrangler.toml
npx wrangler secret put ADMIN_RESET_TOKEN --config wrangler.toml
npx wrangler secret put DEEPSEEK_API_KEY --config wrangler.toml
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml
```

`DEEPSEEK_API_KEY` is only needed when AI summaries are enabled. Use either `PAGES_DEPLOY_HOOK_URL` or the scoped Cloudflare API token/account variables for the Pages deployment operation. Never place provider tokens in D1 or client-side runtime configuration.

## Data cutover

The export utility omits the legacy image-provider token and preserves IDs, timestamps, slugs, JSON fields, and R2 storage keys. D1 limits each SQL statement to 100 KB, so large article/beatmap text is emitted as short inserts followed by append updates.

```powershell
npm run db:export
npm run db:migrate:local
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --chunk-size 400000
npx wrangler d1 execute blog-db --local --command "PRAGMA foreign_key_check; SELECT 'articles' AS table_name, COUNT(*) AS count FROM articles UNION ALL SELECT 'comments', COUNT(*) FROM comments UNION ALL SELECT 'galleries', COUNT(*) FROM galleries;" --config wrangler.toml
```

For production, apply migrations first and use the same importer with `--remote` only after a backup/maintenance window has been approved:

```powershell
npm run db:migrate:remote
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --remote --chunk-size 400000
```

Validate row counts/checksums with `scripts/sqlite-d1-verify.mjs` against a D1 export before switching public traffic. Verify representative R2 objects using their `storage_key` and `/images/<public-id>` URL.

## Deploy order

The release workflow enforces this sequence:

1. Apply D1 migrations.
2. Build and deploy `blog-admin`.
3. Deploy `blog-router` with the `BLOG_ADMIN` Service Binding.
4. Generate and deploy the `nuxt-public` Pages artifact.

Manual commands for a single environment:

```powershell
npm run db:migrate:remote
npm run deploy:worker
cd ../cloudflare-worker
npx wrangler deploy --config wrangler.toml
cd ../nuxt-public
$env:NUXT_PUBLIC_API_BASE_URL='/api'
$env:NUXT_API_BASE_URL='https://wasd09090030.top/api'
npm run generate
npx wrangler pages deploy .output/public --project-name myblogweb-cloudflarepage
```

The public build uses relative `/api` in the browser and the deployed Worker URL only during SSG. The admin Worker keeps `/_ssr/` assets isolated from Pages' `/_nuxt/` assets and sends private/no-store headers for `/admin/**`.

## Password bootstrap and reset

After the first D1 import, run the one-time reset endpoint with the secret reset token. The endpoint creates or resets the administrator and forces a password change. Rotate or remove `ADMIN_RESET_TOKEN` immediately after use. The normal login, logout, password-change, session revocation, and expiration cleanup paths are all D1-backed.

## Pages rebuild trigger

The admin operation `POST /admin/api/ops/pages/deploy-hook` remains available. It calls the configured Pages Deploy Hook (or the scoped Cloudflare API fallback) after content mutations. This preserves the existing background-triggered Pages deployment workflow without restoring an independent backend.

## Smoke test and rollback

Through the public hostname, verify:

- `/admin/login` and an authenticated deep link;
- `/admin/api/auth/session`, logout, and password-change revocation;
- public `/api/articles`, `/api/gallery`, and `/api/comments` contracts;
- an article mutation, comment moderation, gallery ordering, and `/images/<public-id>` cache headers;
- `/api/beatmaps/*` returns `410 BEATMAP_API_RETIRED`;
- one AI summary request and one Pages deploy-hook request when those secrets are enabled;
- a hashed `/_ssr/` asset and a static Pages page through `blog-router`.

If the Worker cutover fails, disable the `blog-router` Service Binding route and restore the previous `nuxt`/API route during the observation window. Do not delete D1, R2, or the legacy source until counts, media URLs, sessions, and public regeneration have been verified in production.

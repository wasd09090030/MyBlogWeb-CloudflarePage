# Cloudflare Production Cutover Runbook

This runbook deploys the blog without a runtime dependency on the independent .NET API or PM2/Nginx. The release order is fixed:

```text
D1 migrations -> blog-api Worker -> Admin Pages -> blog-router Worker -> Public Pages
```

Do not switch traffic until every prerequisite and smoke test below is complete.

## 1. One deployment owner

Use GitHub Actions as the production deployment owner. The repository workflow already deploys D1, the Free-plan `blog-api` Worker, Admin Pages, `blog-router`, and Public Pages in dependency order.

In the Cloudflare dashboard, disconnect the Git build integration for the existing `blogworkermixed` Worker:

1. Open **Workers & Pages** and select `blogworkermixed`.
2. Open **Settings** -> **Builds**.
3. Select **Disconnect**.

The connected Worker name is `blogworkermixed`, while this repository declares `blog-router` in `cloudflare-worker/wrangler.toml`. Cloudflare Workers Builds requires the dashboard Worker name and the Wrangler name to match. Keeping both Workers Builds and GitHub Actions enabled also creates two competing deployment paths.

If Workers Builds must remain enabled, stop here and change the Wrangler Worker name, CI references, and documentation together before deploying. Do not deploy a name-mismatched configuration.

## 2. GitHub Actions credentials

In the GitHub repository, open **Settings** -> **Secrets and variables** -> **Actions** and create repository secrets:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Runs D1 migrations and deploys Workers and Pages |
| `CLOUDFLARE_ACCOUNT_ID` | Selects the target Cloudflare account |

Create an account-scoped API token in Cloudflare. Limit it to the production account and grant these permissions:

- Account: **Workers Scripts - Edit**
- Account: **D1 - Edit**
- Account: **Pages - Edit**
- Account: **Workers Routes - Edit**, only if CI is also responsible for Worker Routes

Do not store the token in `wrangler.toml`, `.env`, D1, or any committed file. GitHub masks repository secrets in workflow logs. A missing or environment-restricted token causes Wrangler to fail before it can run `d1 migrations apply`.

## 3. Cloudflare resources

Create or reuse the production resources in the intended account:

```powershell
cd nuxt-admin
npx wrangler d1 create blog-db
```

Update `nuxt-admin/wrangler.toml` with the returned D1 `database_id`. The Admin Worker must remain D1-only; the independent image-host project owns the R2 bucket and exposes its API separately. The committed `REPLACE_WITH_D1_DATABASE_ID` value is not a deployable production setting.

Set runtime secrets against the `blog-api` Worker. Enter each value interactively; never paste it into a source file.

```powershell
npx wrangler secret put IMAGE_API_TOKEN --config wrangler.toml
npx wrangler secret put SESSION_PEPPER --config wrangler.toml
npx wrangler secret put ADMIN_RESET_TOKEN --config wrangler.toml
npx wrangler secret put DEEPSEEK_API_KEY --config wrangler.toml
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml
```

`DEEPSEEK_API_KEY` is optional when AI summaries are disabled. For Pages rebuilds, configure `PAGES_DEPLOY_HOOK_URL` or the scoped Cloudflare API fallback, but not an unscoped credential in D1. Rotate existing legacy tokens before the cutover.

## 4. D1 data cutover

Before the maintenance window, export and validate locally:

```powershell
cd nuxt-admin
npm run db:export
npm run db:migrate:local
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --chunk-size 400000
npx wrangler d1 execute blog-db --local --command "PRAGMA foreign_key_check" --config wrangler.toml
```

During the maintenance window:

1. Back up the SQLite source database.
2. Stop old admin writes or put the legacy deployment into read-only mode.
3. Export the final SQLite snapshot.
4. Apply remote migrations and import that snapshot.
5. Verify counts, foreign keys, representative article IDs/slugs, and representative R2 object keys.

```powershell
npm run db:migrate:remote
node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --remote --chunk-size 400000
npx wrangler d1 execute blog-db --remote --command "PRAGMA foreign_key_check" --config wrangler.toml
```

The importer intentionally splits large text fields because D1 limits an individual SQL statement to 100 KB. Do not replace it with a raw SQLite dump.

## 5. Deploy and route traffic

Push the reviewed commit to `main`, then run **Build and Release** from GitHub Actions. The workflow must show these successful jobs in order:

1. `deploy-api`: applies D1 migrations and deploys `blog-api`.
2. `deploy-admin-pages`: generates and deploys the Admin SPA to the Admin Pages project.
3. `deploy-router`: deploys `blog-router` with `BLOG_API -> blog-api` Service Binding.
4. `deploy-public`: generates and deploys the Public Pages artifact.

Do not retry the router build before `blog-api` exists. A router failure such as `Service binding 'BLOG_API' references Worker 'blog-api' which was not found` is a downstream symptom of a failed or missing API deployment.

Bind the public hostname to `blog-router` after the first successful deployment, or update its route in the Cloudflare dashboard. `blog-router` sends `/admin/api`, `/api`, and `/images` to `blog-api`, maps static `/admin/*` requests to Admin Pages, and sends all other paths to Public Pages.

## 6. Production smoke test

Run these through the public hostname, not a workers.dev subdomain:

```powershell
curl.exe -sS -o NUL -w "articles=%{http_code}`n" https://<public-host>/api/articles?limit=1
curl.exe -sS -o NUL -w "admin=%{http_code}`n" https://<public-host>/admin/login
curl.exe -sS -o NUL -w "beatmap=%{http_code}`n" https://<public-host>/api/beatmaps/test
```

Expected results:

| Check | Expected result |
| --- | --- |
| Public page | `200` and Cloudflare response headers |
| `/api/articles` and `/api/gallery` | `200`, D1-backed data |
| `/admin/login` | `200` with private/no-store cache behavior |
| Reset, login, session, logout | Success; logout invalidates the opaque session |
| `/api/beatmaps/test` | `410` with `BEATMAP_API_RETIRED` |
| `/images/<public-id>` | `302` redirect to a validated external image-host URL |
| Pages deploy operation | A new Pages deployment is recorded |

A `404` from `/api/beatmaps/test` means the public hostname is still reaching an old deployment or old route. It is not a successful migration result.

## 7. Failure guide

| Symptom | Cause | Action |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` is required | GitHub secret is missing, empty, or unavailable to that workflow | Create/repair the Actions secret and rerun from `deploy-admin` |
| `BLOG_API` Worker was not found | `blog-api` did not deploy | Fix the API job first; do not retry router alone |
| Worker name mismatch | Cloudflare Workers Builds is connected to a differently named Worker | Disconnect Builds or align all names before deploy |
| D1 import is too big | A raw SQL statement exceeds D1's limit | Use `sqlite-d1-export.mjs` and `sqlite-d1-import.mjs` |
| Admin mutation is 403 | Request Origin does not match `ADMIN_ORIGIN` | Verify the Worker variable and public hostname |
| Login returns 503 | `SESSION_PEPPER` is not configured | Set the Worker secret and redeploy/retry |

## 8. Rollback and observation

Keep the old .NET API and old `nuxt/` deployment read-only during the observation window. Do not delete D1, R2, or legacy source before checking sessions, media URLs, Pages regeneration, and public API contracts in production.

If rollback is needed before new writes begin, restore the previous route target. Once D1 has accepted production writes, treat rollback as a data migration decision rather than only a routing change.

## Sources

- Cloudflare API tokens: `https://developers.cloudflare.com/fundamentals/api/get-started/create-token/` (checked 2026-08-02)
- Cloudflare Workers Builds name requirement: `https://developers.cloudflare.com/workers/ci-cd/builds/` (checked 2026-08-02)
- Service Binding forwarding: `https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/` (checked 2026-08-02)
- D1 query and foreign-key guidance: `https://developers.cloudflare.com/d1/best-practices/query-d1/` (checked 2026-08-02)

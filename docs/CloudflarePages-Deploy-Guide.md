# Cloudflare Pages Deployment Guide

The public site remains a Nuxt 4 SSG project on Cloudflare Pages. Runtime data and admin operations are served by the `blog-admin` Worker, so Pages never needs a direct connection to the old .NET API.

## Pages project

Create or reuse a Pages project with:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `nuxt-public` |
| Build command | `npm ci && npm run generate` |
| Output directory | `.output/public` |
| Node version | `20` or newer |

For builds, set:

| Variable | Value |
| --- | --- |
| `NUXT_PUBLIC_API_BASE_URL` | `/api` |
| `NUXT_API_BASE_URL` | `https://wasd09090030.top/api` |
| `NUXT_PUBLIC_SITE_URL` | `https://wasd09090030.top` |

The browser uses relative `/api`; `NUXT_API_BASE_URL` is used only while SSG fetches article routes and content. The `blog-router` Worker must be active before a production build that reads live D1 data.

## Manual deployment

```powershell
cd nuxt-public
npm ci
$env:NUXT_PUBLIC_API_BASE_URL='/api'
$env:NUXT_API_BASE_URL='https://wasd09090030.top/api'
$env:NUXT_PUBLIC_SITE_URL='https://wasd09090030.top'
npm run generate
npx wrangler pages deploy .output/public --project-name myblogweb-cloudflarepage
```

## Background rebuilds

The public Pages project is connected to Git, so pushing `nuxt-public` code to `main` triggers a Cloudflare Pages build automatically. For content changes (articles, galleries) that don't involve code, the admin "重构 nuxt-public" button calls `POST /admin/api/ops/pages/deploy-hook`, which triggers a Pages rebuild via the `PAGES_DEPLOY_HOOK_URL` Worker secret (or falls back to the scoped Cloudflare API). The hook URL is never exposed to the browser.

Manual full ordered deployment:

```text
D1 migrations -> blog-api Worker -> myblog-admin Pages -> blog-router Worker -> public Pages artifact
```

See [nuxt-admin/DEPLOYMENT.md](../nuxt-admin/DEPLOYMENT.md) for the complete cutover and smoke-test checklist.

## Domain routing

Attach the public hostname to the front-door `blog-router` Worker. It sends `/admin`, `/api`, `/images`, and `/_ssr` through the `BLOG_ADMIN` Service Binding and forwards all other paths to the Pages origin. Keep Pages' `/_nuxt/` asset path separate from the admin Worker's `/_ssr/` path.

## Troubleshooting

- SSG cannot load articles: verify `NUXT_API_BASE_URL`, Worker routing, D1 migrations, and the `blog-admin` binding.
- A published article is not visible: trigger the Pages Deploy Hook and inspect the Pages deployment log.
- Admin assets return 404: verify the Worker build preserved `buildAssetsDir: '/_ssr/'` and that the router sends `/_ssr/*` to `blog-admin`.
- Do not reintroduce `backend.wasd09090030.top` or a PM2 process into the production request path; the old backend is a rollback-only reference.

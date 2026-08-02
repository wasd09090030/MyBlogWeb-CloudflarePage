# Nuxt Admin

`nuxt-admin/` 是当前唯一活动的 `/admin/*` 管理后台。它使用 Nuxt 4 SSR、Nuxt UI v4、Tailwind CSS v4、CodeMirror 和 Nuxt MDC。

## 运行方式

```powershell
npm install
npm run dev
npm run typecheck
npm run build
```

本地入口为 `http://localhost:3000/admin/login`。使用 Wrangler 本地运行时，D1 和 R2 绑定来自 `wrangler.toml`，变量来自 `.dev.vars`。

## 环境变量

```env
NUXT_PUBLIC_ADMIN_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://localhost:3000
PUBLIC_ASSET_ORIGIN=http://localhost:8787/file
SESSION_PEPPER=replace-with-a-long-random-secret
ADMIN_RESET_TOKEN=replace-before-bootstrap
```

生产环境将 `ADMIN_ORIGIN`、`NUXT_PUBLIC_ADMIN_ORIGIN` 和 `PUBLIC_ASSET_ORIGIN` 设为正式域名，并通过 `wrangler secret put` 设置 `SESSION_PEPPER`、`ADMIN_RESET_TOKEN`，以及可选的 `DEEPSEEK_API_KEY` 和 Pages 部署凭据。

浏览器请求始终发往同源 `/admin/api/*`。Nitro BFF 在 Worker 内直接调用 D1/R2 域服务，并通过 opaque session Cookie 完成认证；前端不会直接暴露数据库或提供商凭据。

## 部署

生产构建使用 Nitro `cloudflare_module` preset，产物通过 Wrangler 部署到 `blog-admin` Worker：

```powershell
npm run db:migrate:remote
npm run deploy:worker
```

前门 `blog-router` 通过 Service Binding 把 `/admin/*`、`/api/*`、`/images/*` 和 `/_ssr/*` 交给 `blog-admin`，其余请求交给 Pages。详细的环境变量、迁移、切换、冒烟和回滚检查清单见 [DEPLOYMENT.md](DEPLOYMENT.md)。

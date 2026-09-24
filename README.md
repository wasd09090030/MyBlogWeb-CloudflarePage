# MyBlogWeb

个人博客的 Cloudflare 混合部署项目。

## 当前架构

| 项目 | 职责 | 部署方式 |
| --- | --- | --- |
| `nuxt-public/` | 公开博客：主页、文章、画廊、教程和关于页 | Nuxt 4 SSG，Cloudflare Pages |
| `nuxt-admin/` | `/admin/*` 管理后台（SPA）、同源 API、认证与运维接口 | Nuxt 4 SPA + `blog-api` Worker + D1（Cloudflare Free，无 R2/Workers Paid） |
| `cloudflare-worker/` | 统一域名路由分发（= `blog-router` Worker） | Cloudflare Worker |
| `cloudflare-imgbed`（独立仓库） | 图床：媒体二进制托管与 CDN | Cloudflare Pages，`cfimg.wasd09090030.top` |

`cloudflare-worker/router.js`（`blog-router`）按路径分发，`blog-router` 绑定了三个自定义域名：`wasd09090030.top`、`www.wasd09090030.top`、`blog.wasd09090030.top`：

- `/admin/api/*`、`/api/*`、`/images/*` → `blog-api` Worker（service binding，直连 D1）
- `/admin/*` → `myblog-admin` Pages（静态 SPA 壳）
- 其他路径 → `myblogweb-cloudflarepage` Pages（公开站）

媒体二进制不经过 `blog-api`；图片由 `cfimg.wasd09090030.top` 图床直接服务。后台前端只通过**同源的** `/admin/api/*` BFF 请求，浏览器不接触 D1 或图床凭据。Cloudflare「Always Use HTTPS」已开启，`http://` 会在边缘 301 到 `https://`。

## 开发

```powershell
# 公开站
cd nuxt-public
npm install
npm run dev

# 管理后台
cd ../nuxt-admin
npm install
npm run dev
npm run typecheck
npm run build

# Cloudflare 本地运行（需要 Wrangler）
cd ../nuxt-admin
npm run db:migrate:local
npx wrangler dev --config wrangler.toml
```

本地管理后台默认访问 `http://localhost:3000/admin/login`。浏览器只通过同源的 `/admin/api/*` BFF 请求；数据和会话由 `blog-api` Worker 直接访问 D1，媒体对象由 Worker 访问独立图床 API。`.dev.vars.example` 和 `.env.example` 列出了本地变量模板。

## 部署

管理后台拆为两个产物：

```powershell
cd nuxt-admin
npm run deploy:api      # 构建并部署 blog-api Worker（cloudflare_module preset）
npm run deploy:pages    # 生成并部署 myblog-admin Pages（静态 SPA）
```

路由分发：`cd cloudflare-worker && wrangler deploy`（部署 `blog-router`）。

D1 迁移必须先执行：`cd nuxt-admin && npm run db:migrate:remote`。生产变量在 `nuxt-admin/wrangler.toml` 的 `[vars]` 与 Worker Secrets（`SESSION_PEPPER`、`ADMIN_RESET_TOKEN`、`IMAGE_API_TOKEN`）中配置。完整步骤见 [nuxt-admin/README.md](nuxt-admin/README.md) 与 [nuxt-admin/DEPLOYMENT.md](nuxt-admin/DEPLOYMENT.md)。

后台 API、后台 Pages 和路由 Worker 通过本地 Wrangler 发布。公开站连接 Cloudflare Pages Git 构建，也可在后台通过「重构 nuxt-public」按钮触发内容重建。完整部署步骤见 [CLAUDE.md](CLAUDE.md) 与 [nuxt-admin/DEPLOYMENT.md](nuxt-admin/DEPLOYMENT.md)。

## 相关文档

- [CLAUDE.md](CLAUDE.md) — 部署方式与后台 trigger 按钮重建说明
- [Cloudflare Pages 部署](docs/CloudflarePages-Deploy-Guide.md)
- [管理后台运行与部署](nuxt-admin/README.md)
- [生产性能记录](doc/2026-09-11_production-performance-report.md)

# MyBlogWeb

个人博客的混合部署项目。

## 当前架构

| 项目 | 职责 | 部署方式 |
| --- | --- | --- |
| `nuxt-public/` | 公开博客：主页、文章、画廊、教程和关于页 | Nuxt 4 SSG，Cloudflare Pages |
| `nuxt-admin/` | `/admin/*` 管理后台、同源 API、认证与运维接口 | Nuxt 4 SSR，Cloudflare Workers Paid + D1 + R2 |
| `backend-dotnet/BlogApi/` | 历史数据迁移源与回滚参考 | ASP.NET Core 8（只读保留，不再作为运行时依赖） |
| `cloudflare-worker/` | 统一域名的路由分发 | Cloudflare Worker |
| `nuxt/` | 旧 SSR 管理后台，仅用于回滚和历史参考 | 已冻结，不再新增功能 |

`cloudflare-worker/router.js` 通过 Service Binding 将 `/admin/*`、`/api/*`、`/images/*` 和 `/_ssr/*` 转发至 `blog-admin` Worker；其他路径转发至 Cloudflare Pages。公开站资源使用 `/_nuxt/`；管理后台资源使用 `/_ssr/`，避免冲突。

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

本地管理后台默认访问 `http://localhost:3000/admin/login`。浏览器只通过同源的 `/admin/api/*` BFF 请求；数据和会话由 Worker 直接访问 D1，媒体对象由 Worker 访问 R2。`.dev.vars.example` 和 `.env.example` 列出了本地变量模板。

## 部署

管理后台通过 `nuxt-admin/wrangler.toml` 构建并部署为 `blog-admin` Worker。生产基线为 Workers Paid；D1 迁移必须先执行，R2 bucket 和 D1 database ID 需要在生产配置中替换占位符。完整步骤见 [nuxt-admin/README.md](nuxt-admin/README.md) 与 [nuxt-admin/DEPLOYMENT.md](nuxt-admin/DEPLOYMENT.md)。

GitHub Actions 按 `D1 migrations -> blog-admin -> blog-router -> Pages` 顺序发布。后台仍保留 Pages Deploy Hook/API，可在文章变更后触发公开站重新生成。旧 .NET API、旧 `nuxt/` 和 PM2 文件仅用于观察期回滚，不再参与正常流量。

## 相关文档

- [混合架构](docs/Hybrid-Architecture.md)
- [Cloudflare Pages 部署指南](docs/CloudflarePages-Deploy-Guide.md)
- [管理后台 Markdown 编辑器记录](doc/2026-07-25_admin-markdown-editor.md)

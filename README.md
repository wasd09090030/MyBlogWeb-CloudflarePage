# MyBlogWeb

个人博客的混合部署项目。

## 当前架构

| 项目 | 职责 | 部署方式 |
| --- | --- | --- |
| `nuxt-public/` | 公开博客：主页、文章、画廊、教程和关于页 | Nuxt 4 SSG，Cloudflare Pages |
| `nuxt-admin/` | `/admin/*` 管理后台 | Nuxt 4 SSR + Nuxt UI v4，云服务器 |
| `backend-dotnet/BlogApi/` | 博客 API | ASP.NET Core 8 |
| `cloudflare-worker/` | 统一域名的路由分发 | Cloudflare Worker |
| `nuxt/` | 旧 SSR 管理后台，仅用于回滚和历史参考 | 已冻结，不再新增功能 |

`cloudflare-worker/router.js` 将 `/admin/*`、`/api/*`、`/images/*` 和 `/_ssr/*` 转发至云服务器。公开站资源使用 `/_nuxt/`；管理后台资源使用 `/_ssr/`，避免冲突。

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

# 后端
cd ../backend-dotnet/BlogApi
dotnet run
```

本地管理后台默认访问 `http://localhost:3000/admin/login`。开发环境中，`NUXT_API_BASE_URL` 应指向后端的 `http://127.0.0.1:5000/api`；浏览器只通过同源的 `/admin/api/*` BFF 请求，并由 SSR 层转发 Cookie 会话。

## 部署

管理后台构建产物为 `nuxt-admin/.output`。将其部署到云服务器后，由 PM2 启动 `nuxt-admin/ecosystem.config.cjs`，并让 Nginx 将 `/admin/*` 代理到管理后台端口。完整步骤见 [nuxt-admin/README.md](nuxt-admin/README.md) 与 [nuxt-admin/DEPLOYMENT.md](nuxt-admin/DEPLOYMENT.md)。

GitHub Actions 的 `nuxt-admin` 目标构建当前后台。保留 `nuxt-ssr` 目标仅用于在迁移后的短期回滚窗口构建冻结的旧项目，不能作为新功能的发布目标。

## 相关文档

- [混合架构](docs/Hybrid-Architecture.md)
- [Cloudflare Pages 部署指南](docs/CloudflarePages-Deploy-Guide.md)
- [管理后台 Markdown 编辑器记录](doc/2026-07-25_admin-markdown-editor.md)

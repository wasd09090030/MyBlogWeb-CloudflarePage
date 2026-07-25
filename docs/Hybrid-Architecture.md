# 混合架构

```text
wasd09090030.top / www.wasd09090030.top
  |
  +-- Cloudflare Worker
        |
        +-- /, /article/*, /gallery, /tutorials, /about
        |     -> Cloudflare Pages (nuxt-public/)
        |
        +-- /admin/*, /api/*, /images/*, /_ssr/*
              -> 云服务器
                   +-- Nuxt Admin SSR (nuxt-admin/)
                   +-- ASP.NET Core API (backend-dotnet/BlogApi/)
```

## 职责边界

`nuxt-public/` 负责公开内容，构建时生成静态产物并部署到 Cloudflare Pages。`nuxt-admin/` 只负责 `/admin/*`，运行在云服务器上，使用 Nuxt UI v4 和 SSR Cookie BFF。后端继续负责所有数据与鉴权 API。

旧 `nuxt/` 已冻结，仅保留回滚用途；它不再是发布或开发目标。

## 路由与资源

- 跨项目跳转使用普通 `<a>` 标签，避免两个 Nuxt 应用间错误地进行 SPA 路由。
- 同一项目内使用 `NuxtLink`。
- Pages 使用 `/_nuxt/` 资源目录；Nuxt Admin 使用 `/_ssr/`。
- `/admin/*` 页面和 BFF 路由不应被 CDN 或 Nginx 缓存。

## 发布影响

| 变更 | 操作 | 影响范围 |
| --- | --- | --- |
| 公开站内容或界面 | 构建并发布 `nuxt-public/` | Cloudflare Pages |
| 管理后台 | 构建并发布 `nuxt-admin/.output`，重启 PM2 | 云服务器后台 |
| Worker 规则 | `wrangler deploy` | 路由层 |
| .NET API | 发布并重启 BlogApi | API 消费方 |

在 GitHub Actions 的手动触发中选择 `nuxt-admin` 构建当前后台。`nuxt-ssr` 仅保留用于冻结旧版本的回滚构建。

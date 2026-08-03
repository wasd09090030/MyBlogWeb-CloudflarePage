# Nuxt Admin

`nuxt-admin/` 是当前唯一活动的 `/admin/*` 管理后台。它使用 Nuxt 4、Nuxt UI v4、Tailwind CSS v4、CodeMirror 和 Nuxt MDC，部署形态是 Cloudflare Pages 静态 SPA；动态请求由同一仓库构建的 Free-plan `blog-api` Worker 处理。

## 运行方式

```powershell
npm install
npm run dev
npm run typecheck
```

本地开发入口为 `http://localhost:3000/admin/login`。浏览器只请求同源 `/admin/api/*`；认证、D1 读写和独立图床 API 转发均在 `blog-api` 中完成。Admin Worker 只绑定 D1，不绑定 R2，也不保存图片或文件二进制。

## 构建产物

项目有两个相互独立的构建命令：

```powershell
# 构建并部署 D1/API Worker。API 产物使用根路径 /，以同时服务 /api/* 和 /admin/api/*。
npm run build:api
npm run deploy:api

# 生成并部署 Admin Pages 静态 SPA。浏览器公开基路径为 /admin/。
npm run generate
npm run deploy:pages
```

`generate` 的输出位于 `.output/public/admin`，不包含 D1、会话、Pages 凭据或图床 token。前门 `blog-router` 会移除外部 `/admin` 前缀后请求 Admin Pages，并为深层链接回退到 SPA 入口；`/admin/api/*`、`/api/*` 和 `/images/*` 则通过 `BLOG_API` Service Binding 进入 Worker。

## Worker 环境变量

非敏感配置写入 `wrangler.toml` 或部署环境：`ADMIN_ORIGIN`、`PUBLIC_SITE_ORIGIN`、`PUBLIC_ASSET_ORIGIN`、`IMAGE_API_BASE_URL`、`PAGES_DEPLOY_HOOK_URL`。以下值只能使用 Worker Secret：

```powershell
npx wrangler secret put IMAGE_API_TOKEN --config wrangler.toml
npx wrangler secret put SESSION_PEPPER --config wrangler.toml
npx wrangler secret put ADMIN_RESET_TOKEN --config wrangler.toml
```

`IMAGE_API_TOKEN` 永远不会进入 SPA、D1 或 API 响应。完整的 D1 迁移、SQLite 导入、Free-plan 检查、切换、冒烟和回滚清单见 [DEPLOYMENT.md](DEPLOYMENT.md)；中文逐步操作指南见 [Cloudflare-Free-Production-Operations.zh-CN.md](../docs/Cloudflare-Free-Production-Operations.zh-CN.md)。

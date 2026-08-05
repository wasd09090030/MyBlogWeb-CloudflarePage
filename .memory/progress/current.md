# 当前进度
最后更新：2026-08-05

## 当前阶段
管理后台已完整迁移到 **Cloudflare Free 架构**（SPA Pages + `blog-api` Worker + D1，无 R2/Workers Paid），生产在 `wasd09090030.top`（blog-router 分发）运行。`nuxt/` 旧 SSR 后台冻结待删，`backend-dotnet` 只读保留作回滚参考。

## 最近完成（2026-08）
- **Cloudflare Free admin 迁移**（2026-08-04）：见 `features/completed/cloudflare-free-admin-migration.md`。SPA 上 `myblog-admin` Pages、Nitro server 部署为 `blog-api` Worker、`blog-router` 绑 apex/www/blog 三域名。
- **缩略图命名变体**（2026-08-05，commit `58792fd`）：见 `features/completed/thumbnail-named-variants.md`。card/grid/lightbox 三变体白名单，文章详情封面用原生图。
- **admin Origin 校验 bug 修复**（2026-08-05）：见 `lessons/admin-origin-check-vs-routed-hostnames.md`。`assertSafeMutation` 由硬编码 `PUBLIC_SITE_ORIGIN` 改为基于 `runtime.request.url` 的真实 origin，www/blog/http 访问后台不再 403。已部署并 curl 验证。
- **blog-api 错误响应统一 JSON**（2026-08-05）：`nitro.errorHandler = '~~/server/error-handler'`，错误不再按 Accept 渲染 SPA HTML 壳。已部署（Version `caef1f0e`）并验证：无 Accept+UA=Mozilla / Accept json / 未授权路径均返回 JSON。
- **Cloudflare「Always Use HTTPS」开启**（2026-08-05）：zone `wasd09090030.top`，`http://` 301 → `https://`，已验证。

## 正在进行的 / 阻塞
- 无阻塞。`blog-api` 最新构建已部署（Version `caef1f0e-b97c-4eb8-995b-35c7a028e51c`）。

## 下一步
1. （可选）www→apex 归一化（当前 apex/www/blog 三个入口都可用，Always Use HTTPS 已消除 http 入口）。
2. 清理 `nuxt/` 旧项目与 `backend-dotnet`（仅观察期后删）。
3. README.md 已过时（仍写 SSR/Workers Paid/R2/`blog-admin`），建议同步更新。

## 已验证结论（勿重复踩坑）
- **admin API Origin 校验必须基于请求实际 origin**（`runtime.request.url`，router 经 service binding 保留原始 URL），不能只信硬编码 env；h3 `getRequestURL` 因 router 不转发 `x-forwarded-proto` 会把 HTTPS 判成 http。详见 `lessons/`。
- Nuxt 4 中 `~`/`@` 指向 `app/` 目录，`nitro.errorHandler` 配置要引用 `server/` 需用 `~~/`（项目根）。
- blog-api 是纯 API Worker（SPA 由 Pages 单独服务），不应返回 HTML 错误页。
- `isJsonRequest` 只认 `/api/` 前缀，不认 `/admin/api/` → 裸 curl/浏览器类请求会拿到 HTML 错误页（已用 JSON handler 根治）。
- 旧结论（nuxt/ Tailwind v4 时代）已归档：`archive/2026-07-nuxt-ssr-admin-progress.md`。

## 风险与待确认
- blog-api Worker 自带 subdomain（`blog-api.256870170.workers.dev`）已启用——非规范入口，长期建议禁用或加保护。
- `http://wasd09090030.top` 无 https 跳转，用户可能误走 http 入口（修复后可登录，但入口不统一）。
- 图片媒体二进制归独立图床项目 `cloudflare-imgbed`，blog-api 无 R2；配额走 Images Free 5000 变换/月。

## 关键入口
- 部署 blog-api：`cd nuxt-admin && npm run deploy:api`（= `npm run build:api && wrangler deploy --config wrangler.toml`）
- 部署 admin SPA：`cd nuxt-admin && npm run deploy:pages`（wrangler pages deploy .output/public --project-name=myblog-admin）
- 部署 router：`cd cloudflare-worker && wrangler deploy`（README 有说明）
- 本地开发：`cd nuxt-admin && npm run dev`（http://localhost:3000/admin/login）
- 图床：`cfimg.wasd09090030.top`（cloudflare-imgbed Pages 项目）

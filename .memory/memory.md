# 项目记忆索引

> 个人博客站：**Cloudflare Free 架构**（2026-08-04 完成迁移）。
> 详细变更提案与设计以 `docs/superpowers/specs/`、`docs/superpowers/plans/` 为准，本目录只存跨会话状态与经验。
> 最后核验：2026-08-06（含线上删除链路回归 + admin 侧边弹窗/gallery 加载动画改造）。

## 项目核心

- **nuxt-public/**：对外博客前端，Nuxt 4 SSG（static preset），Cloudflare Pages（`myblogweb-cloudflarepage`）。主页、文章、画廊、教程、关于。
- **nuxt-admin/**：管理后台，Nuxt 4 **SPA**（`ssr:false`）。静态壳上 `myblog-admin` Pages 项目；Nitro server 部署为 `blog-api` Worker（D1 `blog-db`，负责 `/admin/api/*`、`/api/*`、`/images/*`）。无 R2，媒体二进制归独立图床。
- **cloudflare-worker/**：= `blog-router` Worker，绑 apex/www/blog 三个自定义域名，按路径分发。
- **图床（独立仓库）**：`cloudflare-imgbed` Pages 项目，`cfimg.wasd09090030.top`。
- **backend-dotnet/**：历史数据迁移源，只读保留，不再作为运行时依赖。
- **nuxt/**：旧 SSR 后台，已冻结待删（回滚/历史参考）。

## 关键架构决策

- **Cloudflare Free admin 迁移（2026-08-04 完成）**：SPA 静态壳 + `blog-api` Worker + D1，替代原云服务器 SSR 后台与 Workers Paid/R2。设计：`docs/superpowers/specs/2026-08-03-cloudflare-free-spa-admin-design.md`；详见 `features/completed/cloudflare-free-admin-migration.md`。
- **admin 同源相对 URL，无 CORS 头**：浏览器只走 `/admin/api/*` BFF；所有变更请求经 `assertSafeMutation` 做 Origin 校验（CSRF 防线）。
- **缩略图按展示场景命名变体**（2026-08-05）：card/grid/lightbox 三白名单变体，详情封面用原生图。见 `features/completed/thumbnail-named-variants.md`。
- **blog-api 错误响应统一 JSON**（2026-08-05）：`nitro.errorHandler = '~~/server/error-handler'`。
- **部署改为本地 wrangler 手动发布**（2026-08-06）：已删除 `.github/workflows/release.yml`（推送自动部署）。固定顺序 `D1 migrations -> blog-api -> myblog-admin Pages -> blog-router -> myblogweb-cloudflarepage Pages`；公开站连 Git 可自动构建，内容变更走后台「重构 nuxt-public」按钮（`POST /admin/api/ops/pages/deploy-hook`，依赖 `PAGES_DEPLOY_HOOK_URL` 或 Cloudflare API secrets）。部署文档见仓库根 `CLAUDE.md`。
- 其他历史决策（nuxt-public Tailwind v4、UI 演进路线等）见 `archive/` 与旧 progress 归档。

## 当前进度

- 入口：`progress/current.md`（2026-08-05 更新）

## 已完成的重要功能

- [Cloudflare Free admin 迁移](features/completed/cloudflare-free-admin-migration.md) — 已实施、已线上验证
- [缩略图命名变体](features/completed/thumbnail-named-variants.md) — 已实施、已线上验证

## 经验与教训

- [admin Content-Type 415 拦截删除](lessons/admin-content-type-415-delete.md) — 已修复（2026-08-06），无 body 的变更请求不得强制 Content-Type
- [admin Origin 校验 vs 多主机名路由](lessons/admin-origin-check-vs-routed-hostnames.md) — 已修复（2026-08-05）
- [Nuxt UI v4 主题类需 Tailwind 扫描 .nuxt/ui](lessons/nuxt-ui-tailwind-source.md) — 已修复（2026-08-05），`tailwind.css` 需 `@source '../../../.nuxt/ui'`，否则动画类不生成
- [Nuxt UI v4 USlideover 需 #body 具名插槽](lessons/nuxt-ui-slideover-body-slot.md) — 已验证（2026-08-06），默认插槽只渲染为 DialogTrigger 触发元素，内容放默认插槽会内联渲染、弹窗正文空
- 旧结论（nuxt/ Tailwind v4 时代）：见 `archive/2026-07-nuxt-ssr-admin-progress.md`

## 归档

- `archive/2026-07-nuxt-ssr-admin-progress.md` — 2026-07 nuxt/ SSR 收缩 + Tailwind v4 进度，已被迁移取代

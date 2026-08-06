# 当前进度
最后更新：2026-08-06

## 当前阶段
管理后台已完整迁移到 **Cloudflare Free 架构**（SPA Pages + `blog-api` Worker + D1，无 R2/Workers Paid），生产在 `wasd09090030.top`（blog-router 分发）运行。`nuxt/` 旧 SSR 后台冻结待删，`backend-dotnet` 只读保留作回滚参考。

## 最近完成（2026-08）
- **admin Content-Type 415 拦截删除修复**（2026-08-06）：`assertSafeMutation` 改为仅在请求有 body 时校验 Content-Type（`hasRequestBody()`：content-length>0 或 chunked），无 body 的 DELETE/POST（`api.del`、无参 `api.post`：删除、登出、图床单删）不再 415。已部署 blog-api（Version `88115e2d`）并线上回归：文章/评论/画廊 DELETE→204、图床单删→200、伪造表单 Content-Type 仍 415。详见 `lessons/admin-content-type-415-delete.md`。
- **移除 GitHub Actions 推送自动部署，改本地 Wrangler 手动发布**（2026-08-06）：删除 `.github/workflows/release.yml`（原 push→D1→blog-api→router→Pages 自动发布）。现在部署顺序固定为 `D1 migrations -> blog-api -> myblog-admin Pages -> blog-router -> myblogweb-cloudflarepage Pages`，全部本地 wrangler 手动执行；公开站 `myblogweb-cloudflarepage` 连了 Git，代码推送会触发 Pages 自动构建，内容变更走后台「重构 nuxt-public」按钮（`POST /admin/api/ops/pages/deploy-hook`）。新写 `CLAUDE.md`（部署文档），README/AGENTS/DEPLOYMENT.md/CloudflarePages-Deploy-Guide 同步。后台 trigger 依赖 `blog-api` Secret `PAGES_DEPLOY_HOOK_URL`（或回退 `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`/`PAGES_PROJECT_NAME`）。
- **Cloudflare Free admin 迁移**（2026-08-04）：见 `features/completed/cloudflare-free-admin-migration.md`。SPA 上 `myblog-admin` Pages、Nitro server 部署为 `blog-api` Worker、`blog-router` 绑 apex/www/blog 三域名。
- **缩略图命名变体**（2026-08-05，commit `58792fd`）：见 `features/completed/thumbnail-named-variants.md`。card/grid/lightbox 三变体白名单，文章详情封面用原生图。
- **admin Origin 校验 bug 修复**（2026-08-05）：见 `lessons/admin-origin-check-vs-routed-hostnames.md`。`assertSafeMutation` 由硬编码 `PUBLIC_SITE_ORIGIN` 改为基于 `runtime.request.url` 的真实 origin，www/blog/http 访问后台不再 403。已部署并 curl 验证。
- **blog-api 错误响应统一 JSON**（2026-08-05）：`nitro.errorHandler = '~~/server/error-handler'`，错误不再按 Accept 渲染 SPA HTML 壳。已部署（Version `caef1f0e`）并验证：无 Accept+UA=Mozilla / Accept json / 未授权路径均返回 JSON。
- **Cloudflare「Always Use HTTPS」开启**（2026-08-05）：zone `wasd09090030.top`，`http://` 301 → `https://`，已验证。
- **nuxt-public 前端 UI 调整**（2026-08-05）：①导航栏移除「其他」下拉，首页/画廊/归档/关于站长全部平铺（`app/layouts/default.vue`）；②文章分页改用 Nuxt UI v4 `UPagination`（`app/features/article-list/components/ArticlePagination.vue`，`show-edges` + sibling-count 1，无自定义 CSS/阴影，对外 props/emit 不变）；③首页图标走马灯改用 Nuxt UI `UMarquee` 并做 **3D 倾斜**（`app/components/IconMarquee.vue`：vertical 双列右列 reverse，图标直接 `img`（无卡片背景、固定 64px 避免 content `min-w-max` 撑大），root 用 Tailwind 类 `transform-3d rotate-x-55 rotate-y-0 rotate-z-30` 实现 3D 扁平倾斜（视觉 87×50、带子"左下→右上"方向）；**可见边界由 info-section 控制**——走马灯移到 `WelcomeSection.vue` 的 info-section 直接子元素，`.icon-marquee-wrapper` 用 `position:absolute; top:0; right:0; height:calc(100% - 65px)`（bottom-cards 前）覆盖 info-section 右侧、带子可延伸到文字底部；info-section 加 `position:relative`，移动端 info-section 本就 `display:none` 隐藏）。已 commit `88d0594`（不含 3D/布局后续调整）。`nuxi generate` 均验证通过。
- **⚠️ Tailwind 需扫描 Nuxt UI 主题目录**（2026-08-05）：`tailwind.css` 加 `@source '../../../.nuxt/ui'`。否则 `.nuxt/ui/*.ts`（gitignore 排除）里的 Nuxt UI 组件主题类不被扫描，`animate-[...]`、`![animation-direction:reverse]` 等类不生成（UMarquee 等动画类组件失效）。详见 `lessons/nuxt-ui-tailwind-source.md`。

## 正在进行的 / 阻塞
- 无阻塞。`blog-api` 最新构建已部署（Version `88115e2d-e7e1-484e-bc1e-f40c250c4fba`，含 Content-Type 415 修复）。

## 下一步
1. （可选）www→apex 归一化（当前 apex/www/blog 三个入口都可用，Always Use HTTPS 已消除 http 入口）。
2. 清理 `nuxt/` 旧项目与 `backend-dotnet`（仅观察期后删）。
3. （待确认）`blog-api` 尚未配置 `PAGES_DEPLOY_HOOK_URL`（或回退的 Cloudflare API secrets），后台「重构 nuxt-public」按钮目前会 503；需要时在 `nuxt-admin/` 执行 `npx wrangler secret put`。

## 已验证结论（勿重复踩坑）
- **`assertSafeMutation` 的 Content-Type 校验只应对有 body 的请求生效**；无 body 的 DELETE/POST（`api.del`、无参 `api.post`）不带 Content-Type，强制校验会 415 拦掉删除/登出。用 content-length/chunked 判 body。详见 `lessons/`。
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
- 部署顺序：`D1 migrations -> blog-api -> myblog-admin Pages -> blog-router -> myblogweb-cloudflarepage Pages`（全本地 wrangler，无 GitHub Actions，见 `CLAUDE.md`）
- 部署 blog-api：`cd nuxt-admin && npm run deploy:api`（= `npm run build:api && wrangler deploy --config wrangler.toml`）
- 部署 admin SPA：`cd nuxt-admin && npm run deploy:pages`（wrangler pages deploy .output/public --project-name=myblog-admin）
- 部署 router：`cd cloudflare-worker && wrangler deploy`（README 有说明）
- 公开站重建：后台「重构 nuxt-public」按钮（`POST /admin/api/ops/pages/deploy-hook`）或推 `nuxt-public` 代码到 main（Pages 连 Git 自动构建）
- 本地开发：`cd nuxt-admin && npm run dev`（http://localhost:3000/admin/login）
- 图床：`cfimg.wasd09090030.top`（cloudflare-imgbed Pages 项目）

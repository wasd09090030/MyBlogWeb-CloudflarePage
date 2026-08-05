---
name: cloudflare-free-admin-migration
description: 管理后台从云服务器 SSR + Workers Paid 迁移到 Cloudflare Free 架构（SPA Pages + blog-api Worker + D1），2026-08-04 完成并验证
metadata:
  type: features/completed
---

# Cloudflare Free Admin 迁移（已实施）

日期：2026-08-03 决策，2026-08-04 完成上线。

## 目标与背景
生产目标是 Cloudflare **Free 账户**，Workers Paid 明确排除。原 `nuxt/` 云服务器 SSR 后台 + 旧 `backend-dotnet` 被替换为纯 Cloudflare 免费架构。设计文档：`docs/superpowers/specs/2026-08-03-cloudflare-free-spa-admin-design.md`。

## 架构（最终落地，已用 Cloudflare API 核实）
```text
Browser
  └─ https://wasd09090030.top (blog-router Worker, 绑 apex/www/blog 三个自定义域名)
       ├─ /admin/api/*, /api/*, /images/* → blog-api Worker（service binding）
       ├─ /admin/*                        → myblog-admin Pages（静态 SPA）
       └─ 其他                            → myblogweb-cloudflarepage Pages（静态 SSG）
blog-api Worker（= nuxt-admin/.output/server/index.mjs, cloudflare_module preset）
  ├─ D1 blog-db（articles/comments/likes/galleries/image_assets/imagebed_configs/admin_users/admin_sessions）
  ├─ 图床 API 适配（IMAGE_API_BASE_URL=https://cfimg.wasd09090030.top, IMAGE_API_TOKEN secret）
  └─ 无 R2 绑定（媒体二进制归独立图床项目 cloudflare-imgbed）
```

## 关键决策点
- `nuxt-admin` 改 `ssr: false`（SPA），静态资源上 `myblog-admin` Pages 项目；Nitro server 单独部署为 `blog-api` Worker。
- D1 存关系数据与图片元数据，不存媒体二进制。
- 登录保留 PBKDF2-SHA-256（210,000 迭代），会话 token 存 D1 哈希，cookie `__Host-admin_session`（HTTPS）/`admin_session`（http），SameSite=Lax。
- Origin 校验保留在全部 admin 变更请求上；**刻意不引入 CORS 头**（同源相对 URL）。
- `cloudflare-worker/router.js`（= blog-router）按 `API_PATHS` 优先级先匹配 `/admin/api`/`/api`/`/images`，再匹配 `/admin`，最后兜底公共站。
- Beatmap 接口已退役（410 `BEATMAP_API_RETIRED`）。

## 已上线实体（Cloudflare API 核实 2026-08-05）
- Workers：`blog-router`、`blog-api`（+ 遗留 `blogworkermixed`、`spring-wave-c092`=imgworker）
- Pages：`myblogweb-cloudflarepage`、`myblog-admin`（subdomain `myblog-admin-8n8.pages.dev`）、`cloudflare-imgbed`（cfimg）
- blog-api 绑定：BLOG_DB(D1 `126c95b1-...`)、IMAGES、PUBLIC_SITE_ORIGIN/ADMIN_ORIGIN=`https://wasd09090030.top`、IMAGE_API_BASE_URL、SESSION_PEPPER、ADMIN_RESET_TOKEN 等。

## 验证结果
- 登录/会话/登出/改密/重置、文章/评论/画廊/图床 API、公共 API 契约均验证通过。
- 本迁移后发现并修复 Origin 校验 bug（见 `lessons/admin-origin-check-vs-routed-hostnames.md`）。

## 相关位置
- 设计：`docs/superpowers/specs/2026-08-03-cloudflare-free-spa-admin-design.md`
- 代码：`nuxt-admin/`、`cloudflare-worker/router.js`、`nuxt-admin/wrangler.toml`（name=blog-api）、`nuxt-admin/DEPLOYMENT.md`
- 部署：`cd nuxt-admin && npm run deploy:api`（worker）、`npm run deploy:pages`（SPA）

---
name: admin-origin-check-vs-routed-hostnames
description: blog-api 的 admin 登录/变更请求 Origin 校验曾用硬编码 PUBLIC_SITE_ORIGIN，导致经 www/blog/http 等非规范主机访问后台时被 403 拒绝
metadata:
  type: lessons
---

# blog-api Origin 校验与多主机名路由（2026-08-05 已修复）

## 问题现象
别的 PC 打开 admin 登录页、输入账号密码后报「Cross-origin request rejected」（跨域请求被拒绝）。开发机用 `https://wasd09090030.top/admin` 登录正常。

## 已验证根因
- `nuxt-admin/server/utils/request-security.ts` 的 `assertSafeMutation()` 要求所有 POST/PUT/PATCH/DELETE 的 `Origin` 头**精确等于** `getRequestOrigin()` 返回值。
- `getRequestOrigin()`（`server/utils/cloudflare.ts`）返回的是**硬编码环境变量** `PUBLIC_SITE_ORIGIN = https://wasd09090030.top`（`wrangler.toml` [vars]，已部署 worker 绑定一致），而不是请求实际所在的主机。
- `blog-router` worker 绑定了三个自定义域名：`wasd09090030.top`、`www.wasd09090030.top`、`blog.wasd09090030.top`（DNS 均为 `100::` AAAA 指向 Worker），三者服务同一套 admin SPA + API。浏览器对每个 POST 都会带 `Origin` 头，值=地址栏 origin。
- 因此经 `www` / `blog` / `http://`（无 https 跳转）访问时，Origin ≠ `https://wasd09090030.top` → 服务端 403。这不是浏览器级 CORS（SPA 与 API 同源，设计文档明确"no cross-origin CORS contract"），而是服务端主动拒绝，login 页把 statusMessage 显示出来。
- 与"哪台 PC"无关，只与地址栏域名/协议有关。用 `myblog-admin-8n8.pages.dev` 直连则连 blog-api 都到不了（pages.dev 对 `/admin/api/*` 返回 404），报错是另一种。

## 无效做法
- 把 `www`/`blog` 一个个加进允许列表（打地鼠，加子域名还得再改）。
- 直接用 `origin === getRequestURL(event).origin`：h3 的 `getRequestURL` 用 Host + `x-forwarded-proto` 重建 URL，而 router `forwardRequest()` **不转发 `x-forwarded-proto`**，HTTPS 会退化成 `http://`，连 apex 都会误拒。

## 正确处理方式
- 新增 `getActualRequestOrigin()`（`server/utils/cloudflare.ts`）：从 `runtime.request.url`（router 经 service binding 转发时**保留的浏览器原始完整 URL**，scheme+host 正确）取 `.origin`，缺失时回退 `getRequestURL(event).origin`。
- `assertSafeMutation()` 改为接受 `origin === getActualRequestOrigin(event) || origin === configuredOrigin`（后者=原 env 配置 origin，保留旧 apex 行为作兜底）。因 Origin 由浏览器强制设置、不能伪造，接受"真实请求 origin"不削弱 CSRF 防护。

## 防复发措施
- admin/公开 API 的 Origin 校验必须基于**请求实际 origin**（`runtime.request.url`），不要只信硬编码 env 值。
- 若 router 再增加自定义域名，无需改 blog-api；若改用 CORS 头方案，需显式引入 `Access-Control-Allow-Origin` 并处理 OPTIONS 预检（当前架构刻意无 CORS 头）。

## 关键证据
- curl 实测（部署后）：apex/www/blog/http 的合法 Origin → 401「Invalid username or password」（=通过 origin 校验）；pages.dev/evil.com/无 Origin → 403。
- `admin_sessions.ip_address` 有真实客户端 IP（`getClientAddress`→`runtime.request.headers` 生效，佐证 `runtime.request.url` 可用）。
- 部署：`cd nuxt-admin && npm run deploy:api`（`build:api` = `nuxt build`，wrangler 部署 `.output/server/index.mjs` 为 `blog-api` worker）。

---
name: admin-content-type-415-delete
description: assertSafeMutation 对无 body 的 DELETE/POST（SPA 的 api.del、无参 api.post）强制要求 JSON/multipart Content-Type，导致后台删除与登出一律 415
metadata:
  type: lessons
---

# blog-api Content-Type 校验拦截无 body 变更请求（2026-08-06 已修复）

## 问题现象
后台**所有删除功能失效**：文章、评论、画廊的单条删除、图床单文件删除，点击删除 → 确认框 → 报「Unsupported content type」（415），数据不删。另发现后台「退出登录」（无 body 的 POST）同样会被拦。

## 已验证根因
- `nuxt-admin/server/utils/request-security.ts` 的 `assertSafeMutation()` 对全部 POST/PUT/PATCH/DELETE 强制要求 `Content-Type` 以 `application/json` 或 `multipart/form-data` 开头，否则抛 415。
- 但 SPA 的 `useAdminApi.del`（`app/composables/useAdminApi.ts`）发 `DELETE` 不带 body、不带 Content-Type；`api.post(path)` 不传 body 时同样无 Content-Type（如登出 `auth/logout`、图床单删 `imagebed/delete/:name`）。
- 结果：浏览器原样请求（无 Content-Type）→ 415；带 `Content-Type: application/json` + 空 body → 能删（证明后端删除逻辑本身正常）；带 `{}` body → blog-api Worker 抛 1101（未捕获异常，edge case，SPA 不会触发）。
- 该 Content-Type 检查自 `19dcc2e`（Nuxt Admin SSR 迁移）起就存在，属历史遗留，非近期回归。

## 无效做法
- 让 SPA 的 `api.del`/`api.post` 强制带 `Content-Type: application/json` + 空 body：能绕过 415，但 DELETE 带 body 会触发 Worker 1101（edge case），且依赖 ofetch 行为，治标不治本。
- 只放开 DELETE 方法：图床单删/登出走 POST 无 body，仍会被拦。

## 正确处理方式
- `assertSafeMutation()` 改为**仅在请求确实有 body 时校验 Content-Type**：新增 `hasRequestBody()`，用 `content-length > 0` 或 `transfer-encoding: chunked` 判断；无 body 的变更请求跳过 Content-Type 检查。
- Origin 校验不变（始终执行，仍是 CSRF 主防线）；带 body 的请求 Content-Type 白名单照旧（`application/x-www-form-urlencoded` 等表单提交仍 415）。
- 部署：`cd nuxt-admin && npm run deploy:api`（仅重发 blog-api Worker，无需迁移/不动 SPA/router）。

## 防复发措施
- `assertSafeMutation` 的 Content-Type 检查必须只针对**有 body** 的请求；无 body 的 DELETE/POST 不应要求 Content-Type。
- 新增 body-less 变更接口（DELETE/POST 无参）时，检查是否走了 `assertSafeMutation`，避免再次踩 415。

## 关键证据
- 修复前线上实测：SPA 原样 DELETE（无 CT）→ 415；DELETE + JSON CT + 空 body → 204；DELETE + `{}` body → Worker 1101。
- 修复后（部署 Version `88115e2d-e7e1-484e-bc1e-f40c250c4fba`）实测：文章/评论/画廊 DELETE（无 CT）→ 204；图床单删 POST（无 CT）→ 200；`application/x-www-form-urlencoded` + body → 仍 415（CSRF 防护保留）。后台 UI 点删除 → 确认 → 删除成功。
- typecheck、`npm run build:api` 通过。

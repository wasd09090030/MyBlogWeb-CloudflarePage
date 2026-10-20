# 画廊完全相同图片批量删除发布记录

## 时间与范围

- 2026-10-20 20:05–20:12（UTC+8）完成提交、推送与发布。
- 提交：`8c5e14f feat(admin): 画廊完全相同图片批量删除`（12 个文件，+470 / -17）。
- 发布范围：`blog-api` Worker、`myblog-admin` Production Pages。
- 未人工发布：`blog-router`、`myblogweb-cloudflarepage`；后者随 `main` 推送由 Git 连接自动重建。
- 无 D1 迁移、无新增绑定或 secret。

## 发布结果

| 资源 | 发布前 | 发布后 |
| --- | --- | --- |
| D1 | 无待执行迁移 | 未改动，仍无待执行迁移 |
| API Worker | `913c92e5-26b1-4bcb-bc79-e7312a2d3106` | `b0b67e71-576a-4322-9987-f77fd60414e8` |
| Admin Pages | `cdc60724-e3fb-4de1-be37-5a252d39e7e3` | `e27b2c95-32b8-4c50-a0ff-64b4045ee122`，Production / `main` / 源码 `8c5e14f` |
| 公开站（自动） | `aabdaaad-61db-4e4e-806d-71f82906adaf` | `8400b3fb-0c6a-4650-8fc5-940e78be233a`，Active / 源码 `8c5e14f` |

独立版本：<https://e27b2c95.myblog-admin-8n8.pages.dev> ，入口 <https://wasd09090030.top/admin/gallery>

## 本地检查

- `check:free-config`：Free 计划、D1-only。
- `check:image-api`：图床凭据仅在 Worker secret，SPA 无 token 引用。
- `check:image-transform`：`card 720/q75 | grid 1024/q85 | hero 1280/q80 | lightbox 2048/q82`。
- `check:gallery-duplicates`：通过，覆盖新增的完全相同分组与批量清理用例（保留最早、同文件分组、时间相同按 id、读取失败排除、距离非 0 不分组、独占文件删文件、共享文件只删记录、更早记录跳过、参数校验）。
- `check:gallery-duplicates:browser`：退出码 0，`ok: true`；新增端到端用例断言预览不触发删除、确认后只删 #901/#902 并保留 #900。
- `wrangler d1 migrations list --remote`：`No migrations to apply!`

## 发布步骤

1. `git push origin main`：`7f48aaa..8c5e14f`。
2. `npm run build:api` → `wrangler deploy --config wrangler.toml --keep-vars`。
3. `npm run generate` → `wrangler pages deploy .output/public --project-name=myblog-admin --branch main`（上传 118 个文件，复用 26 个）。

## 线上验证

| 检查 | 结果 |
| --- | --- |
| `/admin/login` | HTTP 200 |
| `/admin/gallery` | HTTP 200，入口 `/admin/_nuxt/CPlFvGsH.js` |
| 入口脚本 | HTTP 200，408,799 字节，SHA-256 与本地产物一致 |
| `/admin/api/auth/session` | HTTP 200，`{"authenticated":false,"mustReset":false}` |
| `POST /admin/api/gallery/duplicates/purge`（同源、无会话） | HTTP 401，确认新接口已上线且受会话保护 |
| `/admin/api/gallery/duplicates/catalog` | HTTP 401 |
| `/admin/api/gallery/admin` | HTTP 401 |
| `/api/gallery` | HTTP 200 |
| `/api/beatmaps/test` | HTTP 410 |
| 首页 `/` | HTTP 200 |

线上未使用管理员密码或浏览器会话，未创建会话，未执行任何删除；批量删除的完整交互由本地浏览器回归覆盖。

## 回滚

- API：`wrangler rollback`，或回滚至 `913c92e5-26b1-4bcb-bc79-e7312a2d3106`。
- Admin Pages：在 Cloudflare Pages 将 `cdc60724-e3fb-4de1-be37-5a252d39e7e3` 恢复为 Production。
- 代码：`git revert 8c5e14f`。API 与 Pages 需一起回滚，否则界面会调用不存在的接口。
- 已删除的图床文件无法恢复；本次未改动数据库结构，回滚不涉及数据迁移。

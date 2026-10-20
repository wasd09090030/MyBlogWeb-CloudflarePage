# Admin 项目提交与重新发布记录（2026-10-20）

## 时间与范围

- 2026-10-20 19:40–19:50（UTC+8）完成提交、推送与发布。
- 前置提交 `b844a22 完善画廊查重并支持图床联动删除` 已在远端；本次先提交并推送剩余修改项，再按 Wrangler 流程发布。
- 发布范围：`blog-api` Worker、`myblog-admin` Production Pages。
- 未发布：`blog-router`、`myblogweb-cloudflarepage`（无人工发布；后者因 Git 连接随 `main` 推送自动重建）。

## 提交与推送

| 提交 | 内容 |
| --- | --- |
| `adab2f2` | docs: 补充画廊查重与 admin 发布记录 |
| `cecd357` | docs: 添加 MDC 组件样式展示页 |
| `96eb333` | chore(deps): 同步 oxide-wasm32-wasi 依赖锁 |

推送：`b844a22..96eb333 main -> main`，推送后本地与 `origin/main` 无差异，工作区干净。

推送触发 Git 连接的公开站自动构建：部署 `aabdaaad-61db-4e4e-806d-71f82906adaf`（Production / `main` / 源码 `96eb333`，Active）。本次未改动 `nuxt-public/`，公开站产物与内容无实质变化。

## 发布结果

| 资源 | 发布前 | 发布后 |
| --- | --- | --- |
| D1 | 无待执行迁移 | 未改动，仍无待执行迁移 |
| API Worker | `4da622c7-b6ab-4c89-9b78-f18c14155f95` | `913c92e5-26b1-4bcb-bc79-e7312a2d3106`，启动 19 ms |
| Admin Pages | `a575d1da-0c05-4b12-9a86-4438180e3bca` | `cdc60724-e3fb-4de1-be37-5a252d39e7e3`，Production / `main`，源码 `96eb333` |

独立版本：<https://cdc60724.myblog-admin-8n8.pages.dev> ，入口 <https://wasd09090030.top/admin/gallery>

## 本地检查

全部通过后发布：

- `check:free-config`：Free 计划、D1-only。
- `check:image-api`：图床凭据仅在 Worker secret，SPA 无 token 引用。
- `check:image-transform`：`card 720/q75 | grid 1024/q85 | hero 1280/q80 | lightbox 2048/q82`。
- `check:gallery-duplicates`：pHash、来源读取、目录、指纹、远端删除、共享引用、D1 回滚后重试。
- `check:gallery-duplicates:browser`：退出码 0，`ok: true`；浏览器重压缩/缩放、默认单条与批次跳过查重、可选批次查重三项均通过。
- `wrangler d1 migrations list --remote`：`No migrations to apply!`

## 发布步骤

1. `npm run build:api` → `wrangler deploy --config wrangler.toml --keep-vars`（保留面板环境变量）。
2. `npm run generate` → `npm run check:gallery-duplicates:browser`。
3. `wrangler pages deploy .output/public --project-name=myblog-admin --branch main`（工作区干净，记录源码提交 `96eb333`；上传 117 个文件，复用 27 个）。

## 线上验证

| 检查 | 结果 |
| --- | --- |
| `/admin/login` | HTTP 200 |
| `/admin/gallery` | HTTP 200，入口 `/admin/_nuxt/DshetdcO.js` |
| 入口脚本 | HTTP 200，408,799 字节，SHA-256 与本地产物一致 |
| `/admin/api/auth/session` | HTTP 200，`{"authenticated":false,"mustReset":false}` |
| `/admin/api/gallery/admin`（GET） | HTTP 401 |
| `/admin/api/gallery/duplicates/catalog`（GET） | HTTP 401 |
| `/admin/api/gallery/duplicates/source`（同源 POST） | HTTP 401 `Authentication required` |
| `/admin/api/imagebed/files`（GET） | HTTP 401 |
| `/admin/api/imagebed/bulk-delete`（同源 POST） | HTTP 401 |
| `/api/gallery` | HTTP 200 |
| `/api/beatmaps/test` | HTTP 410 |
| 首页 `/` | HTTP 200 |

线上未使用管理员密码或浏览器会话，未创建会话、未导入或删除任何数据。

## 回滚

- API：`wrangler rollback`，或回滚至 `4da622c7-b6ab-4c89-9b78-f18c14155f95`。
- Admin Pages：在 Cloudflare Pages 将 `a575d1da-0c05-4b12-9a86-4438180e3bca` 恢复为 Production。
- 代码层：`git revert 96eb333 cecd357 adab2f2`（本次三次提交仅含文档与依赖锁，回滚不影响运行时）。
- 本次未改动 D1 结构或业务数据，回滚无需恢复数据库。

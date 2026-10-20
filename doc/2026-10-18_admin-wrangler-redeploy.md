# Admin 项目 Wrangler 重新发布记录

## 时间与范围

- 2026-10-18 23:47–23:52（UTC+8）完成发布与冒烟检查。
- 发布范围：`blog-api` Worker、`myblog-admin` Production Pages。
- 未发布：`blog-router`（路由逻辑未变）、`myblogweb-cloudflarepage`（本次为 admin 项目，公开站无改动）。
- 发布方式：本地 Wrangler 手动发布，未创建 Git 提交或推送。

## 发布结果

| 资源 | 发布前 | 发布后 |
| --- | --- | --- |
| D1 | 无待执行迁移（0006 已应用） | 未改动，仍无待执行迁移 |
| API Worker | `7f3c962b-15ce-4824-bd22-520e1d960eaf` | `4da622c7-b6ab-4c89-9b78-f18c14155f95`，启动耗时 23 ms |
| Admin Pages | `0efbead4-d4e6-47c9-af2f-5f2ed5ba1a9e` | `a575d1da-0c05-4b12-9a86-4438180e3bca`，Production / `main`，源码 `803efcd` |

入口：<https://wasd09090030.top/admin/gallery>

本次 Pages 独立版本：<https://a575d1da.myblog-admin-8n8.pages.dev>

## 执行过程

1. 读取仓库发布约定（`CLAUDE.md`、`AGENTS.md`、`nuxt-admin/DEPLOYMENT.md`）并加载 Wrangler 技能；核实 OAuth 登录账号 `256870170@qq.com`（account `be3a3678017e78886b6a66665a1b0d3d`）。
2. 核对发布前版本：Worker `7f3c962b`、Pages `0efbead4`。
3. 本地检查全部通过：`check:free-config`（Free / D1-only）、`check:image-api`（凭据仅在 Worker secret，SPA 无 token 引用）、`check:image-transform`（card/grid/hero/lightbox 变体）、`check:gallery-duplicates`（pHash、批次默认、受限源读取、分页、迁移与指纹缓存）。
4. `wrangler d1 migrations list --remote` 返回 `No migrations to apply!`，因此本次不写 D1、不导出备份。
5. `npm run build:api` 构建成功，`wrangler deploy --keep-vars` 发布 Worker（保留面板设置的环境变量）。
6. `npm run generate` 生成 Admin SPA，`wrangler pages deploy .output/public --project-name=myblog-admin --branch main --commit-dirty=true` 发布（上传 117 个文件，复用 27 个）。
7. 通过主域名核对 HTML、哈希资源与接口鉴权边界，并确认 Pages Production 记录指向本次部署。

注：发布前 10 分钟工作区曾有另一进程在跑 `check:gallery-duplicates:browser`（headless Edge），已退出；等待确认无写入后，以当前工作区产物发布。

## 线上验证

| 检查 | 结果 |
| --- | --- |
| `/admin/login` | HTTP 200 |
| `/admin/gallery` | HTTP 200，加载本次入口 `/admin/_nuxt/CXS36_oy.js` |
| 入口脚本 | HTTP 200，408,799 字节，SHA-256 与本地产物一致（`DD1A6F32…CD407D37`） |
| `/admin/api/auth/session` | HTTP 200，`{"authenticated":false,"mustReset":false}` |
| `/admin/api/gallery/duplicates/catalog`（GET） | HTTP 401 `Authentication required` |
| `/admin/api/gallery/duplicates/{source,lookup,fingerprints}`（同源 POST） | HTTP 401 `Authentication required` |
| 无 `Origin` 头的 POST | HTTP 403 `Cross-origin request rejected`（`assertSafeMutation` 设计行为） |
| `/admin/api/gallery/admin` | HTTP 401 |
| `/api/gallery` | HTTP 200 |
| `/api/beatmaps/test` | HTTP 410 |
| 首页 `/` | HTTP 200 |

线上未使用管理员密码或浏览器会话，未创建登录会话、未导入图片或删除记录。登录后的完整查重交互回归见实现记录。

## 回滚

- API：`wrangler rollback`，或回滚至 `7f3c962b-15ce-4824-bd22-520e1d960eaf`。
- Admin Pages：在 Cloudflare Pages 将 `0efbead4-d4e6-47c9-af2f-5f2ed5ba1a9e` 恢复为 Production。
- 两者应协调回滚；本次未改动 D1 结构与业务数据，回滚无需恢复整库。

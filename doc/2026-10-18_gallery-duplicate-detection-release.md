# 画廊图片查重上线记录

## 时间与授权

- 2026-10-18 15:49（UTC+8）完成发布与冒烟检查。
- 用户明确授权：“请你帮我上线改动”。
- 发布范围：D1 指纹缓存迁移、`blog-api` Worker、`myblog-admin` Production Pages。
- 公开站与路由 Worker 无本次变更，不需要重建或发布。

## 发布结果

| 资源 | 发布前 | 发布后 |
| --- | --- | --- |
| D1 | 仅待执行 `0006_gallery_image_fingerprints.sql` | 0006 成功，无待执行迁移 |
| API Worker | `8c2a15b0-8b4c-4e0a-9804-1b498b18796c` | `7f3c962b-15ce-4824-bd22-520e1d960eaf` |
| Admin Pages | `eeab7282-96e5-4deb-9dfa-530bc633eaa7` | `0efbead4-d4e6-47c9-af2f-5f2ed5ba1a9e`，Production/main |

入口：https://wasd09090030.top/admin/gallery

本次 Pages 独立版本：https://0efbead4.myblog-admin-8n8.pages.dev

## 执行过程

1. 读取仓库发布约定与 Wrangler 技能，核对已登录账号、项目域名、生产分支、当前 Worker 和 Pages 版本。
2. 重新构建 API Worker，成功。
3. 导出生产 D1 到忽略版本控制的本地备份：`nuxt-admin/.data/backups/2026-10-18_before-gallery-duplicates.sql`，2,333,129 字节。初次导出因本地目标目录缺失未保存成功；创建目录后重新导出并核实文件。
4. 应用唯一待执行的 0006 迁移，复查画廊仍为 694 条，新指纹缓存表为 0 条。没有导入、删除或修改任何画廊业务记录。
5. 发布 API，使用 `--keep-vars` 保留面板设置的环境变量。Worker 启动耗时 22 ms。
6. 重新生成 Admin Pages 成功，明确使用 `--branch main --commit-dirty=true` 发布当前工作区。上传 118 个文件，复用 26 个文件。
7. 通过主域名检查实际 HTML 和哈希资源，并核实 Pages Production 部署记录与 D1 无待执行迁移。

本次为本地 Wrangler 手动上线。未创建 Git 提交或推送；非任务文件 `docs/mdc-style-showcase.html` 保持原样。

## 线上验证

| 检查 | 结果 |
| --- | --- |
| `/admin/login` | HTTP 200，加载本次入口 `/admin/_nuxt/urie5F4z.js` |
| `/admin/gallery` | HTTP 200，加载本次入口，与本地产物一致 |
| 入口脚本 | HTTP 200，SHA-256 与本地发布文件一致 |
| 画廊脚本 `/admin/_nuxt/D-IKMuCk.js` | HTTP 200，包含查重界面，SHA-256 与本地产物一致 |
| `/admin/api/auth/session` | HTTP 200；无登录 Cookie 时 `authenticated: false` |
| 查重目录接口 | 无登录 Cookie 返回 HTTP 401 `Authentication required` |
| 查重图片读取接口 | 同源 POST、无登录 Cookie 返回 HTTP 401 |
| `/api/gallery` | HTTP 200，公开项 693 条 |
| 生产 D1 画廊总数 | 迁移前后均 694 条（包含隐藏项） |
| D1 迁移列表 | 无待执行迁移 |

线上未使用管理员密码或浏览器会话，也没有为测试创建登录会话、导入图片或删除记录。登录后的完整查重交互已在实现阶段通过本地 Edge 与模拟 API 回归，详见实现记录；本次线上验证覆盖发布版本、静态资源、公开读取与认证边界。首次登录画廊后点击“检查重复图片”开始为现有记录生成指纹，首轮需要读取原图。

## 回滚

- API：可回滚至 `8c2a15b0-8b4c-4e0a-9804-1b498b18796c`。
- Admin Pages：在 Cloudflare Pages 将 `eeab7282-96e5-4deb-9dfa-530bc633eaa7` 恢复为 Production。
- 两者应协调回滚。0006 是独立缓存表，可保留；常规功能回滚无需恢复整库，避免覆盖上线后的正常业务数据。
- 生产数据库备份仅保存在本机忽略目录，不提交，不在文档中记录 SQL 内容或下载签名链接。

## 文档核对与最终审查

核对日期：2026-10-18。当前没有可用 Context7/fetch MCP，使用 PowerShell Invoke-WebRequest 直接读取官方文档，均返回 HTTP 200；同时核对本机 Wrangler 4.118.0 的命令帮助。

- https://developers.cloudflare.com/d1/wrangler-commands/
- https://developers.cloudflare.com/workers/wrangler/commands/
- https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/

最终发布顺序、迁移编号、路由路径、Pages 资源前缀均符合项目约定。既有全量类型检查错误仍维持实现记录中的状态，本次未修改程序代码或扩大修复范围。发布后没有发现需要回滚的冒烟失败。

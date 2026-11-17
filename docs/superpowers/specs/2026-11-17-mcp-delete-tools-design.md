# MCP 删除工具与可清空字段

日期：2026-11-17
状态：待批准
范围：为 blog-mcp 增加 `article_delete` / `gallery_delete` / `diary_delete`；让 `article_create` / `article_update` 接受 `null` 清空 `coverImage`、`aiSummary`
取代：`2026-11-16-blog-mcp-design.md` 中「删除类工具」属于非目标的条款

## 1. 意图与动机

MCP 目前只能增改不能删：文章建错、画廊加错、日记写错，都必须回后台手动处理。项目所有者于 2026-11-17 明确要求补上删除能力，并要求在工具描述中醒目标注这是危险操作。同时补上一个既有缺陷——`coverImage` / `aiSummary` 一旦写入就再也清不掉：domain 层本来就支持传 `null`（`server/domain/articles.ts:221-233`），只有 MCP 的 zod schema 用 `z.string().min(1)` 挡死了空值。

## 2. 已与用户确认的决策

| 决策 | 选择 |
| --- | --- |
| 删除覆盖范围 | 文章、日记、画廊 |
| 画廊删除语义 | 复用后台的 `deleteGallery`：**会真的删除图床原文件**；文件仍被文章封面/其他画廊/Hero 引用时服务端 409 拒绝；图床文件删除失败时保留记录 |
| 图床文件删除 | **不做**。`deleteMedia`（`server/domain/media.ts:160`）没有任何引用检查，删掉被文章正文引用的图会直接让公开站坏图 |
| 防护强度 | 工具描述标注「危险、不可恢复」+ 必填 `confirm`，值必须等于目标（文章 id / 画廊 id / 日记日期），不匹配时**本地直接拒绝、不发请求** |
| `confirm` 的性质 | 防模型误触的护栏，不是安全边界。真正边界仍是 `mcp:write` scope；持 token 直接调 HTTP 的人本来就绕得过去 |

## 3. 目标 / 非目标

**目标**

- 3 个删除工具 + 3 条服务端 `DELETE` 分支，复用现有 domain 函数
- `article_create` / `article_update` 的 `coverImage`、`aiSummary` 接受 `null`
- 同步更新 `blog-mcp/README.md` 工具表、`blog-mcp/scripts/smoke.mjs` 断言、`nuxt-admin/scripts/check-mcp.mjs` 断言、根 `CLAUDE.md`

**非目标**

- 图床文件删除、批量删除、评论删除
- 新增 `mcp:delete` scope（现有 token 不失效）
- 软删除 / 回收站 / 恢复接口
- 文章 `created_at` 可写

## 4. 设计

### 4.1 服务端路由

文件 `nuxt-admin/server/routes/api/mcp/[...path].ts`，在现有业务组各分支内各加一条：

| 路由 | scope | 调用 | 成功返回 |
| --- | --- | --- | --- |
| `DELETE /api/mcp/articles/:id` | `mcp:write` | `deleteArticle` | `{ success: true, deleted: <id> }` |
| `DELETE /api/mcp/gallery/:id` | `mcp:write` | `deleteGallery` | `{ success: true, deleted: <id> }` |
| `DELETE /api/mcp/diary/:date` | `mcp:write` | `deleteDiaryEntry` | `{ success: true, deleted: '<date>' }` |

- 用 200 + 明确 body，而不是后台 BFF 的 204：调用方需要能区分「删掉了」和「什么都没发生」。
- `id` / `date` 只从路径取，body 不参与定位（沿用现有约定）。
- domain 抛出的 404（记录不存在）、409（图床文件仍被引用）、422（无法识别图床文件）、502/503（图床删除或清理失败）原样透出，路由不吞异常。
- 不新增任何 secret / 依赖。

### 4.2 客户端工具

文件 `blog-mcp/src/tools.js`，新增三条：

| 工具 | 入参 | confirm 必须是 |
| --- | --- | --- |
| `article_delete` | `id`, `confirm` | `id` 本身 |
| `gallery_delete` | `id`, `confirm` | `id` 本身 |
| `diary_delete` | `date`, `confirm` | `date` 本身（`YYYY-MM-DD` 字符串） |

- 描述以「⚠️ 危险：不可恢复地删除……」开头，写清会直接改线上数据、公开站需重建，`gallery_delete` 额外写清会删图床原文件、仍被引用时服务端拒绝。
- 校验放在 `run` 内、请求之前：不一致时 `throw new Error(中文原因)`，由 `server.js` 的 `formatApiError` 转成工具错误，一个请求都不发出。
- `confirm` 用与目标相同的 zod 类型（数字 / 日期字符串），类型不对由 SDK schema 校验拦下。

### 4.3 可清空字段

文件 `blog-mcp/src/tools.js`：

```js
/** 可清空的文本字段：传 null 表示清空。 */
const clearableText = () => z.string().min(1).nullable().optional()
```

- `article_create` / `article_update` 的 `coverImage`、`aiSummary` 改用它，描述补「传 null 清空」。
- `endpoint()` 已经按 `!== undefined` 转发，`null` 会原样进 body；domain 侧 `updateArticle` 对 `null` 的处理已经正确（封面同时置空 `cover_image_asset_id`）。
- `title` / `slug` / `contentMarkdown` 保持不可清空。

### 4.4 断言与文档

- `blog-mcp/scripts/smoke.mjs`
  - 工具数 13 → 16（三处）；工具名清单加三条。
  - 删除原断言 `no tool may delete anything`，换成：三个删除工具存在、描述含「危险」或「不可恢复」、`inputSchema` 都含 `confirm`。
  - 新增行为断言：`confirm` 不匹配时 `api.request` 零调用；匹配时发出 `DELETE /api/mcp/articles/7`；`article_update({ id: 7, coverImage: null })` 的 body 里 `coverImage` 为 `null`。
- `nuxt-admin/scripts/check-mcp.mjs`
  - 把 15.13 三条「DELETE 必须 404」换成真实断言：只读 token → 403 且行不变；写 token 删文章/日记 → 成功且行消失；再次删除 → 404；画廊删除在无图床配置的测试环境走到 503（证明分支已挂上、不是 404），行仍保留。
  - 更新结尾的检查摘要文案。
- `blog-mcp/README.md`：工具表标题与行数改为 16，补三行；「安全说明」补一段删除工具的风险与 `confirm` 语义。
- 根 `CLAUDE.md`：「没有删除类工具，也不要加」「`/api/mcp/*` 也没有 DELETE 分支（恒 404）」「13 个 MCP 工具」三处改为新事实，并写明 `confirm` 是护栏不是安全边界。

## 5. 验证方式

- `cd blog-mcp && npm run smoke`（纯本地，stub server，不连线上）
- `cd nuxt-admin && npm run check:mcp`（内存 D1 驱动真实路由与领域函数）
- `cd nuxt-admin && npm run check:free-config`
- `npm run typecheck` 有 12 个既有错误，判断标准是「没有新增错误」，不声称它通过。

**不执行**：`db:migrate:remote`、`deploy:api`、`deploy:pages`、任何 git commit/push。本改动不需要迁移，但部署需要用户授权后自行执行。

## 6. 风险与回滚

- 风险：模型误删。缓解：`confirm` 回填 + 描述标注 + 画廊侧既有引用检查；文章/日记删除只删 D1 行，图床文件不会丢。
- 风险：`coverImage: null` 被误用导致文章失去封面。缓解：公开站仍可用正文渲染，封面为可选项；如需恢复，重新传图床 URL 即可。
- 回滚：三条路由与三个工具都是独立新增分支，删除即可；无 schema/迁移变更。

# MCP 删除工具与可清空字段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 blog-mcp 能删除文章、画廊条目、日记，并让 `coverImage` / `aiSummary` 可以被清空。

**Architecture:** 服务端在现有 `/api/mcp/*` Bearer 路由里新增三条 `DELETE` 分支，直接复用 domain 层已有的 `deleteArticle` / `deleteGallery` / `deleteDiaryEntry`；客户端在 `tools.js` 新增三条工具，`run` 内在发请求之前校验 `confirm` 必须等于目标值；`article_create` / `article_update` 的两个文案字段改为接受 `null`。

**Tech Stack:** Nuxt/Nitro (h3) · D1 · Node 20 ESM · zod · @modelcontextprotocol/sdk

**Spec:** `docs/superpowers/specs/2026-11-17-mcp-delete-tools-design.md`

## Global Constraints

- 不执行 `db:migrate:remote`、`deploy:api`、`deploy:pages`、任何 `git commit` / `push` / `merge`——均需用户单独授权。本计划不含提交步骤。
- 不新增 Worker Secret，不新增 npm 依赖，不改数据库结构。
- 删除路由统一返回 `200` + `{ success: true, deleted: <目标> }`（文章/画廊为数字 id，日记为日期字符串）。
- `confirm` 校验只在客户端 `run` 里做，且必须在发请求之前；错误文案为中文，含期望值与实际值。
- 工具描述必须与真实行为一致：删除工具的描述必须以 `⚠️ 危险且不可恢复` 开头。
- `title` / `slug` / `contentMarkdown` 保持不可清空；只有 `coverImage`、`aiSummary` 接受 `null`。
- 图床文件删除（`deleteMedia`）不暴露给 MCP。

## Review Focus

- `confirm` 值不匹配（`id=7, confirm=8`）时必须在本地抛错且 `api.request` 零调用。
- 只读 token（仅 `mcp:read`）调删除必须 403，且数据库行保持不变。
- 删除不存在的记录必须 404，不能静默成功返回 `success`。
- `updateArticle` 收到 `coverImage: null` 时必须同时把 `cover_image_asset_id` 置空，而不是只改 `cover_image` 字符串。
- 画廊删除失败时记录必须保留：图床配置缺失时报 503（不是 404，证明分支已挂上），而不是先删行再失败。（「文件仍被引用 → 409」由既有 domain 代码保证，本次不改也不加测试。）

---

### Task 1: 服务端三条 DELETE 路由

**Files:**
- Modify: `nuxt-admin/server/routes/api/mcp/[...path].ts:158-207`
- Test: `nuxt-admin/scripts/check-mcp.mjs:536-578`、`:657-665`

**Interfaces:**
- Consumes: `deleteArticle(event, idValue): Promise<null>`、`deleteGallery(event, idValue): Promise<null>`、`deleteDiaryEntry(event, dateValue): Promise<null>`（均已导出，`server/domain/articles.ts:244`、`gallery.ts:196`、`diary.ts:171`）
- Produces: `DELETE /api/mcp/articles/:id`、`DELETE /api/mcp/gallery/:id`、`DELETE /api/mcp/diary/:date` → `{ success: true, deleted: number | string }`

- [ ] **Step 1: 写失败断言**

在 `nuxt-admin/scripts/check-mcp.mjs` 的 15.5 小节之后（`assert.equal(db.prepare('SELECT title FROM articles WHERE id = 2').get().title, 'Beta', ...)` 那一行下面）插入：

```js
// 15.5b DELETE /articles/:id：只读 token 403 且行仍在；写 token 真删；重复删除 404
const roArticleDelete = await callRoute({ path: '/articles/2', method: 'DELETE', headers: { authorization: readOnlyBearer } })
assert.equal(roArticleDelete.ok, false)
assert.equal(roArticleDelete.status, 403, 'a read-only token must not delete an article')
assert.ok(String(roArticleDelete.message).includes('Insufficient scope: mcp:write'))
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM articles WHERE id = 2').get().n, 1, 'a rejected delete must not remove the row')
const articleDeleted = await callRoute({ path: '/articles/2', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(articleDeleted.ok, true)
assert.deepEqual(articleDeleted.value, { success: true, deleted: 2 })
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM articles WHERE id = 2').get().n, 0)
const articleDeleteAgain = await callRoute({ path: '/articles/2', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(articleDeleteAgain.status, 404, 'deleting a missing article must be 404')

// 15.5c PUT /articles/:id 传 coverImage: null 必须同时清空 cover_image 与 cover_image_asset_id
db.prepare("UPDATE articles SET cover_image = 'https://cfimg.example/cover.webp', cover_image_asset_id = NULL WHERE id = 1").run()
const cleared = await callRoute({ path: '/articles/1', method: 'PUT', headers: { authorization: bearer }, body: { coverImage: null } })
assert.equal(cleared.ok, true)
assert.equal(cleared.value.coverImage, null)
const clearedRow = db.prepare('SELECT cover_image, cover_image_asset_id FROM articles WHERE id = 1').get()
assert.equal(clearedRow.cover_image, null, 'coverImage: null must clear the cover column')
assert.equal(clearedRow.cover_image_asset_id, null, 'coverImage: null must also clear the linked asset id')
```

在 15.6b 小节之后（`assert.equal(db.prepare('SELECT tag FROM galleries WHERE id = 1').get().tag, 'landscape')` 下面）插入：

```js
// 15.6c DELETE /gallery/:id：只读 403；写 token 到达领域层（本地无图床配置 → 503，不是 404），记录保留
const roGalleryDelete = await callRoute({ path: '/gallery/1', method: 'DELETE', headers: { authorization: readOnlyBearer } })
assert.equal(roGalleryDelete.status, 403, 'a read-only token must not delete a gallery item')
const galleryDelete = await callRoute({ path: '/gallery/1', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(galleryDelete.status, 503, 'deleteGallery needs the image provider; a missing config must not look like a missing route')
assert.match(String(galleryDelete.message), /IMAGE_API_BASE_URL/)
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM galleries WHERE id = 1').get().n, 1, 'a failed media cleanup must keep the gallery row')
```

在 15.7 小节之后（`assert.equal(db.prepare("SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date = '2026-11-18'").get().n, 0)` 下面）插入：

```js
// 15.7a DELETE /diary/:date：只读 403；写 token 删掉；重复删除 404
const roDiaryDelete = await callRoute({ path: '/diary/2026-11-16', method: 'DELETE', headers: { authorization: readOnlyBearer } })
assert.equal(roDiaryDelete.status, 403, 'a read-only token must not delete a diary entry')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date = '2026-11-16'").get().n, 1)
const diaryDeleted = await callRoute({ path: '/diary/2026-11-16', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(diaryDeleted.ok, true)
assert.deepEqual(diaryDeleted.value, { success: true, deleted: '2026-11-16' })
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date = '2026-11-16'").get().n, 0)
assert.equal((await callRoute({ path: '/diary/2026-11-16', method: 'DELETE', headers: { authorization: bearer } })).status, 404)
```

把 15.13 小节里的三行「no delete capability」改为只保留图床那一条，并说明原因：

```js
// 15.13 不存在的业务路径仍是 404
assert.equal((await callRoute({ path: '/articles/1/nope', method: 'GET', headers: { authorization: bearer } })).status, 404)
// 图床文件删除仍是明确非目标：deleteMedia 没有引用检查，删掉被引用的图会直接坏图
assert.equal((await callRoute({ path: '/images', method: 'DELETE', headers: { authorization: bearer } })).status, 404, 'there must be no media delete capability')
```

把结尾 `console.log('MCP checks passed: ...')` 文案里的 `no delete capability` 改成 `article/gallery/diary delete capability (scope-gated, row removal, 404 on repeat, no media delete)`。

- [ ] **Step 2: 运行断言，确认失败**

Run: `cd nuxt-admin && npm run check:mcp`
Expected: FAIL，`DELETE /articles/2` 得到 404 而不是 403（路由尚不存在）

- [ ] **Step 3: 实现路由**

在 `nuxt-admin/server/routes/api/mcp/[...path].ts` 顶部补导入：

```ts
import { createArticle, deleteArticle, getAdminArticle, listAdminArticles, updateArticle } from '~~/server/domain/articles'
import { deleteDiaryEntry, listAdminDiaryEntries, upsertDiaryEntry } from '~~/server/domain/diary'
import { createGallery, deleteGallery, listAdminGallery, updateGallery } from '~~/server/domain/gallery'
```

在 articles 分支的 `PUT` 之后加：

```ts
    if (parts.length === 2 && currentMethod === 'DELETE') {
      await requireScope(event, 'mcp:write')
      // `deleted` 回的是路径里的 id：domain 在 requireId 阶段就会拒绝非法值，
      // 能走到这一行说明 parts[1] 一定是合法整数。
      await deleteArticle(event, parts[1])
      return { success: true, deleted: Number(parts[1]) }
    }
```

在 gallery 分支的 `PATCH` 之后加：

```ts
    if (parts.length === 2 && currentMethod === 'DELETE') {
      await requireScope(event, 'mcp:write')
      // 复用后台语义：真删图床原文件；文件仍被引用时 domain 抛 409 并保留记录。
      await deleteGallery(event, parts[1])
      return { success: true, deleted: Number(parts[1]) }
    }
```

在 diary 分支的 `PUT` 之后加：

```ts
    if (parts.length === 2 && currentMethod === 'DELETE') {
      await requireScope(event, 'mcp:write')
      await deleteDiaryEntry(event, parts[1])
      return { success: true, deleted: parts[1] }
    }
```

- [ ] **Step 4: 运行断言，确认通过**

Run: `cd nuxt-admin && npm run check:mcp`
Expected: PASS，输出 `MCP checks passed: ...`，末尾包含新增的 `article/gallery/diary delete capability` 文案

---

### Task 2: 客户端删除工具与可清空字段

**Files:**
- Modify: `blog-mcp/src/tools.js:22-28`、`:51-52`、`:76-103`、`:144-190`
- Test: `blog-mcp/scripts/smoke.mjs:196-220`、`:299-345`、`:410`、`:626`

**Interfaces:**
- Consumes: Task 1 的三条 `DELETE` 路由
- Produces: 工具 `article_delete({ id, confirm })`、`gallery_delete({ id, confirm })`、`diary_delete({ date, confirm })`；`article_create` / `article_update` 的 `coverImage`、`aiSummary` 接受 `null`

- [ ] **Step 1: 写失败断言**

`blog-mcp/scripts/smoke.mjs` 里把 `assert.equal(tools.length, 13)` 改为 `16`，把工具名清单替换为：

```js
assert.deepEqual(tools.map(t => t.name).sort(), [
  'article_create', 'article_delete', 'article_get', 'article_list', 'article_summarize', 'article_update',
  'diary_delete', 'diary_list', 'diary_upsert',
  'gallery_create', 'gallery_delete', 'gallery_list', 'gallery_update',
  'image_list', 'image_upload',
  'rebuild_public_site'
])
// 删除工具必须存在，但每条都必须自带危险标注与 confirm 回填
const deleteTools = tools.filter(t => /delete/i.test(t.name))
assert.deepEqual(deleteTools.map(t => t.name).sort(), ['article_delete', 'diary_delete', 'gallery_delete'])
for (const tool of deleteTools) {
  assert.match(tool.description, /危险/, `${tool.name} must mark itself dangerous`)
  assert.match(tool.description, /不可恢复/, `${tool.name} must say it cannot be undone`)
  assert.ok(tool.inputSchema.confirm, `${tool.name} must require a confirm value`)
}
```

删掉原来的 `assert.equal(tools.some(t => /delete|remove|destroy/i.test(t.name)), false, ...)` 一行，并把上方第 197 行的注释 `13 个工具、无删除能力` 改为 `16 个工具、删除工具必须带 confirm`。

在 `await byName.article_update.run({ id: 7 }, fakeApi)` 那三行之后插入：

```js
// 可清空字段：null 必须原样进入 body，不能被当成「未填写」丢掉
await byName.article_update.run({ id: 7, coverImage: null, aiSummary: null }, fakeApi)
assert.deepEqual(calls.at(-1).opts.body, { coverImage: null, aiSummary: null })

// 删除工具的 confirm 必须在发请求之前生效
let deleteCalls = 0
const countingApi = { request: async () => { deleteCalls += 1; return { ok: true } }, upload: async () => ({}) }
await assert.rejects(() => byName.article_delete.run({ id: 7, confirm: 8 }, countingApi), /confirm/)
await assert.rejects(() => byName.diary_delete.run({ date: '2026-11-17', confirm: '2026-11-16' }, countingApi), /confirm/)
await assert.rejects(() => byName.gallery_delete.run({ id: 7, confirm: 70 }, countingApi), /confirm/)
assert.equal(deleteCalls, 0, 'a mismatched confirm must never reach the API')

await byName.article_delete.run({ id: 7, confirm: 7 }, fakeApi)
assert.equal(calls.at(-1).method, 'DELETE')
assert.equal(calls.at(-1).path, '/api/mcp/articles/7')
assert.equal(calls.at(-1).opts, undefined)
await byName.gallery_delete.run({ id: 3, confirm: 3 }, fakeApi)
assert.equal(calls.at(-1).method, 'DELETE')
assert.equal(calls.at(-1).path, '/api/mcp/gallery/3')
await byName.diary_delete.run({ date: '2026-11-17', confirm: '2026-11-17' }, fakeApi)
assert.equal(calls.at(-1).method, 'DELETE')
assert.equal(calls.at(-1).path, '/api/mcp/diary/2026-11-17')
```

把第 410 行附近的 `assert.equal(listed.length, 13)` 和第 626 行附近的 `assert.equal(listResponse.result.tools.length, 13)` 都改为 `16`。

- [ ] **Step 2: 运行断言，确认失败**

Run: `cd blog-mcp && npm run smoke`
Expected: FAIL，`13 !== 16`（或 `tools.length` 断言先失败）

- [ ] **Step 3: 实现工具表**

在 `blog-mcp/src/tools.js` 的 `optionalText` 下面加两个辅助：

```js
/** 可清空的文本字段：传 null 表示清空；省略表示不修改。 */
const clearableText = () => z.string().min(1).nullable().optional()

/** 危险操作护栏：confirm 必须原样回填目标值，否则在发请求之前就拒绝。 */
function requireDeleteConfirm(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`危险操作已拒绝：confirm 必须等于${label} ${JSON.stringify(expected)}，收到 ${JSON.stringify(actual)}。请先向用户确认再调用。`)
  }
}
```

把 `article_create` 与 `article_update` 里的这两个字段改用 `clearableText()`：

```js
      coverImage: clearableText().describe('封面图 URL 或图床文件名；传 null 表示不设置/清空'),
      aiSummary: clearableText().describe('AI 摘要；传 null 表示清空'),
```

在 `article_update` 之后插入：

```js
  {
    name: 'article_delete',
    description: '⚠️ 危险且不可恢复：永久删除一篇文章及其数据库记录，会直接修改线上数据。图床里的图片文件不会被删除；公开站需重建后才会消失。必须传 confirm 且等于 id 才会执行。',
    inputSchema: {
      id: z.number().int().positive().describe('文章 id'),
      confirm: z.number().int().positive().describe('二次确认：必须与 id 完全相同，否则本地直接拒绝')
    },
    run: async (args, api) => {
      requireDeleteConfirm(args.confirm, args.id, '文章 id')
      return await api.request('DELETE', `/api/mcp/articles/${args.id}`)
    }
  },
```

在 `gallery_update` 之后插入：

```js
  {
    name: 'gallery_delete',
    description: '⚠️ 危险且不可恢复：永久删除一条画廊条目，并删除图床里的原文件，会直接修改线上数据。文件仍被其他画廊项、文章封面或 Hero 引用时服务端会拒绝（409），记录保留。公开站需重建后才会更新。必须传 confirm 且等于 id 才会执行。',
    inputSchema: {
      id: z.number().int().positive().describe('画廊条目 id'),
      confirm: z.number().int().positive().describe('二次确认：必须与 id 完全相同，否则本地直接拒绝')
    },
    run: async (args, api) => {
      requireDeleteConfirm(args.confirm, args.id, '画廊 id')
      return await api.request('DELETE', `/api/mcp/gallery/${args.id}`)
    }
  },
```

在 `diary_upsert` 之后插入：

```js
  {
    name: 'diary_delete',
    description: '⚠️ 危险且不可恢复：永久删除某一天的日记，会直接修改线上数据。公开站需重建后才会消失。必须传 confirm 且等于 date 才会执行。',
    inputSchema: {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('日期，格式 YYYY-MM-DD'),
      confirm: z.string().min(1).describe('二次确认：必须与 date 完全相同，否则本地直接拒绝')
    },
    run: async (args, api) => {
      requireDeleteConfirm(args.confirm, args.date, '日期')
      return await api.request('DELETE', `/api/mcp/diary/${args.date}`)
    }
  },
```

- [ ] **Step 4: 运行断言，确认通过**

Run: `cd blog-mcp && npm run smoke`
Expected: 末尾输出 `smoke: cli passed`，且无断言失败

---

### Task 3: 文档同步

**Files:**
- Modify: `blog-mcp/README.md:134-150`、`:163-170`
- Modify: `CLAUDE.md`（MCP 服务一节）
- Modify: `docs/superpowers/specs/2026-11-16-blog-mcp-design.md`（顶部加取代说明）

**Interfaces:**
- Consumes: Task 1 / Task 2 的最终行为（工具名、必填参数、返回形状）
- Produces: 文档与代码一致，供后续会话和模型读取

- [ ] **Step 1: 更新 README 工具表**

把 `## 工具清单（13 个，没有删除类工具）` 改为 `## 工具清单（16 个，含 3 个删除工具）`，并在 `article_update`、`gallery_update`、`diary_upsert` 三行之后各插入对应删除工具：

```markdown
| `article_delete` | ⚠️ **危险、不可恢复**：删除文章。只删 D1 行，不动图床文件 | `id`\*、`confirm`\*（必须等于 `id`） |
| `gallery_delete` | ⚠️ **危险、不可恢复**：删除画廊条目并**真删图床原文件**；文件仍被引用时服务端 409 拒绝 | `id`\*、`confirm`\*（必须等于 `id`） |
| `diary_delete` | ⚠️ **危险、不可恢复**：删除某天的日记 | `date`\*、`confirm`\*（必须等于 `date`） |
```

同时把 `article_update` 的描述行补一句「`coverImage` / `aiSummary` 传 `null` 可清空」。

- [ ] **Step 2: 更新 README 安全说明**

在「安全说明」一节补一段：

```markdown
**删除工具**：`article_delete` / `gallery_delete` / `diary_delete` 都要求 `confirm` 回填目标值（文章 id、画廊 id、日记日期），
不匹配时客户端直接拒绝、一个请求都不会发出。这是防模型误触的护栏，不是安全边界——真正的边界是 `mcp:write` scope。
`gallery_delete` 会真删图床原文件；图床文件删除（`deleteMedia`）**没有**暴露给 MCP，因为它没有引用检查，删掉被文章引用的图会直接坏图。
```

- [ ] **Step 3: 更新根 CLAUDE.md**

三处改动：

1. `把博客后台能力包装成 13 个 MCP 工具` → `16 个 MCP 工具`
2. 把 `- **没有删除类工具，也不要加**。...` 这一整条 bullet 替换为：

```markdown
- **删除类工具只有三个，且必须带 `confirm`**。`tools.js` 的 16 个工具包含 `article_delete` / `gallery_delete` / `diary_delete`；三者都要求 `confirm` 回填目标值（文章 id / 画廊 id / 日记日期），不匹配时客户端直接拒绝、不发请求。`gallery_delete` 复用 `deleteGallery`，**会真删图床原文件**（仍被引用时 409 拒绝）；`article_delete` / `diary_delete` 只删 D1 行。**图床文件删除仍是明确非目标**：`deleteMedia` 没有引用检查，删掉被文章正文引用的图会直接坏图。`confirm` 是防模型误触的护栏，不是安全边界，真正的边界是 `mcp:write` scope。
```

3. 把 `服务端 \`/api/mcp/*\` 也没有 DELETE 分支（恒 404）` 所在句改为：`服务端 \`/api/mcp/*\` 只有文章、画廊、日记三条 DELETE 分支，图床文件没有删除端点。`

- [ ] **Step 4: 旧 spec 加取代说明**

在 `docs/superpowers/specs/2026-11-16-blog-mcp-design.md` 标题下方插入一行：

```markdown
> 2026-11-17 更新：本文「删除类工具」属于非目标的条款已被 `2026-11-17-mcp-delete-tools-design.md` 取代；其余内容仍然有效。
```

- [ ] **Step 5: 检查文档与工具表一致**

Run: `cd blog-mcp && node -e "import('./src/tools.js').then(m => console.log(m.tools.map(t => t.name).join('\n')))"`
Expected: 输出 16 个工具名，与 README 表格逐行对得上

---

### Task 4: 全量验证

**Files:** 无改动

- [ ] **Step 1: 客户端冒烟**

Run: `cd blog-mcp && npm run smoke`
Expected: 以 `smoke: cli passed` 结束，无断言失败

- [ ] **Step 2: 服务端路由与领域检查**

Run: `cd nuxt-admin && npm run check:mcp`
Expected: 输出 `MCP checks passed: ...`，无断言失败

- [ ] **Step 3: Free 配置检查**

Run: `cd nuxt-admin && npm run check:free-config`
Expected: 输出检查通过（与本次改动无关，作为回归确认）

- [ ] **Step 4: 类型检查的既有基线**

Run: `cd nuxt-admin && npm run typecheck`
Expected: 仍为 12 个既有错误（`app/pages/admin/diary|gaming/*`、`server/domain/articles|assets|diary.ts`）。判断标准是**没有新增错误**，不得声称 typecheck 通过。

- [ ] **Step 5: 确认没有误改**

Run: `git status --short`
Expected: 只有本计划涉及的 6 个文件被修改/新增：`nuxt-admin/server/routes/api/mcp/[...path].ts`、`nuxt-admin/scripts/check-mcp.mjs`、`blog-mcp/src/tools.js`、`blog-mcp/scripts/smoke.mjs`、`blog-mcp/README.md`、`CLAUDE.md`，加上两份 spec/plan 文档。若出现 `.memory` 或无关文件，回退该改动。

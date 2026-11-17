# blog-mcp：本机 MCP 客户端 + 远端鉴权通道

日期：2026-11-16
状态：待批准
范围：A 阶段（本机 stdio MCP 服务），不含删除类工具，不含公网 OAuth 连接器

## 1. 意图与动机

让 Claude Code / Claude Desktop 直接操作博客后台的业务数据（文章、画廊、日记、图床文件、站点重建），
而不必打开浏览器复制粘贴。凭证由远端下发并可单独吊销，本地配置里不出现长期静态 token。

## 2. 已确认的现状（来自代码，非推断）

| 事实 | 位置 |
| --- | --- |
| admin 业务接口挂在 `/admin/api/*`，主要身份是 `admin_sessions` 表里的 cookie token。**例外**：`POST /admin/api/auth/reset` 走 `ADMIN_RESET_TOKEN`，无会话 | `nuxt-admin/server/domain/auth.ts:121`、`routes/admin/api/auth/reset.post.ts` |
| `[...path].ts` 对任何带 `authorization` 头的请求直接 400 | `nuxt-admin/server/routes/admin/api/[...path].ts:11` |
| 多数写操作过 `assertSafeMutation`：`Origin` 必须等于实际请求源，body 必须 JSON 或 multipart。**例外**：`steam/ratings.put.ts` 未调用；无 body 的请求跳过 Content-Type 检查；GET/HEAD 直接放行 | `nuxt-admin/server/utils/request-security.ts:13,14,26` |
| `blog-router` 把 `/admin/api`、`/api`、`/images` 整体转给 `blog-api`，路径原样保留 | `cloudflare-worker/router.js:1,77` |
| 图床是 BFF：`/admin/api/imagebed/*` 只是壳，真实读写走 `IMAGE_API_TOKEN` 调外部图床 | `nuxt-admin/server/utils/image-api.ts:46` |
| 业务域函数（articles / gallery / diary / media / operations / steam）不带鉴权，守卫全在路由层。**例外**：`domain/auth.ts` 自带守卫 | `server/domain/*.ts` |

推论：MCP 不可能"顺手复用"现有鉴权，必须新增一条独立的 Bearer 命名空间。
`blog-router` 无需改动。

## 3. 目标 / 非目标

**目标**

- 本机 stdio MCP 服务，13 个工具，覆盖文章、画廊、日记、图床、站点重建、AI 摘要
- 凭证由远端登录换取，具名、可吊销、有有效期、带 scope
- 本地只存 token，不存密码
- 复用现有 domain 层，不复制业务逻辑
- 为 B 阶段（公网 OAuth 连接器）留出可继承的部分

**非目标（明确不做）**

- 删除类工具：删文章、删画廊（会联动真删图床原文件）、删图床文件、批量删除
- 公网 OAuth 连接器、`/.well-known`、DCR / CIMD、同意页
- refresh token / 自动续期
- 评论审核、画廊查重、Hero 配置、Steam 相关工具
- 改变现有 `/admin/api/*` 的 Cookie + Origin 鉴权模型

**反目标**：如果最后做成"一个能删数据的公网地址"或"配置里贴一个永久 token"，就算失败。

## 4. 架构

```
Claude Code / Desktop
        │  stdio (JSON-RPC)
        ▼
  blog-mcp/ (Node 进程，本机)
        │  HTTPS + Authorization: Bearer bmcp_…
        ▼
  https://wasd09090030.top/api/mcp/*     ← blog-router 原样转发
        │
  blog-api: routes/api/mcp/[...path].ts
        │  1. 校验 Bearer（哈希比对 mcp_tokens）
        │  2. 校验 scope
        │  3. 直接调用现有 domain 函数
        ▼
   domain/*.ts  →  D1  /  外部图床
```

## 5. 后端设计（blog-api）

### 5.1 路由文件

新增 `nuxt-admin/server/routes/api/mcp/[...path].ts`。

**改用 `/api/mcp/*` 而不是 `/admin/api/mcp/*`**：`server/routes/api/` 下只有
`beatmaps/[...path].all.ts` 一个通配，`/api/mcp/*` 与它不冲突，也不经过
`admin/api/[...path].ts` 那三行前置检查（`rejectAuthorizationHeader` /
`assertSafeMutation` / `requireAdminSession`）。这样**完全不需要改动现有任何路由文件**，
不存在"静态段优先于通配"的不确定项。`blog-router` 的 `API_PATHS` 已包含 `/api`，
转发生效，router 仍然不用改。

（早先设想的 `/admin/api/mcp/*` 已放弃：即使 Nitro 路由优先级如预期，兜底方案也必须
重构那条 catch-all 的安全前置，影响面远大于收益。）

### 5.2 鉴权

- 只接受 `Authorization: Bearer bmcp_<43 字符 base64url>`（32 字节随机）。
- **业务路由一律忽略 Cookie**，避免与浏览器会话混用。唯一的例外是 5.4 里两个
  token 管理路由（列表/吊销），它们只认 Cookie 会话，且必须存在 Bearer 也不会被接受。
- token 存储：`hashToken(token, SESSION_PEPPER)`，复用
  `server/utils/edge-crypto.ts:62`，与 `admin_sessions` 同一套做法。
- 额外存 `token_prefix`（前 12 字符）用于在后台/`status` 里认人，不用于校验。
- 校验失败统一 401 + `WWW-Authenticate: Bearer`，**不区分**"不存在/过期/已吊销"。
- 命中后 `UPDATE last_used_at`（节流：同一 token 60 秒内只写一次，防止按请求计费的 D1 写放大）。

> **已知例外**：`mcp:read` 的 `image_list` 会调用 `listMedia`，后者对返回的文件
> 做 `image_assets` 的幂等 upsert（最多 100 行）。即"只读 scope"仍可能写 D1。
> 这是现有实现刷新素材索引的一部分，不涉及用户业务数据，接受并在此记录。

### 5.3 迁移 `0011_mcp_tokens.sql`

```sql
CREATE TABLE IF NOT EXISTS mcp_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash   TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  username     TEXT NOT NULL,
  label        TEXT NOT NULL,
  scopes       TEXT NOT NULL,          -- JSON 数组，如 ["mcp:read","mcp:write"]
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  expires_at   TEXT NOT NULL,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_mcp_tokens_username ON mcp_tokens(username);
```

只新增表，不动现有表。

### 5.4 端点

**鉴权组（不走 Bearer）**

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/mcp/token` | body `{username,password,label,scopes?,expiresInDays?}` → 发新 token |
| POST | `/api/mcp/token/revoke` | Bearer 自我吊销（`blog-mcp logout`） |
| GET | `/api/mcp/whoami` | Bearer → `{username,label,scopes,expiresAt}` |
| GET | `/api/mcp/tokens` | **Cookie 会话** → 列出本账号所有 token（只回 `token_prefix`、label、scope、时间） |
| POST | `/api/mcp/tokens/:id/revoke` | **Cookie 会话** → 按 id 吊销任意 token |

后两条是为"机器丢了/凭证泄露"准备的：不需要输密码，用浏览器现有会话就能精准吊销一枚
token，而不是像改密码那样把所有浏览器会话一起踢掉。它们复用 `requireAdminSession`
（Cookie），不影响 MCP 命名空间的 Bearer 规则。

发放规则：

- 密码校验复用从 `loginAdmin` 抽出的 `verifyAdminCredentials(event, username, password)`。
  抽取是纯重构：`loginAdmin` 改为调用它，行为不变。
- **`must_reset = 1` 时拒绝发 token**（403，与 `requireAdminSession` 的 428 语义对齐），
  否则强制改密流程可以从 MCP 这条路径绕过去。每次 Bearer 校验也一并检查该用户的
  `must_reset`，为 1 则 403。
- `label` 必填，1–64 字符；`scopes` 默认 `["mcp:read","mcp:write"]`，服务端白名单过滤。
- `expiresInDays` 默认 30，夹在 1–90。
- 同一次登录允许存在多个 token（多台机器各一个），不互相顶掉。
- 新 token 只回显一次，之后任何接口都不返回明文。

**业务组（Bearer + scope）**

| 方法 | 路径 | scope | 调用的 domain 函数 |
| --- | --- | --- | --- |
| GET | `/api/mcp/articles` | read | `listAdminArticles`（见下方投影说明） |
| GET | `/api/mcp/articles/:id` | read | `getAdminArticle` |
| POST | `/api/mcp/articles` | write | `createArticle` |
| PUT | `/api/mcp/articles/:id` | write | `updateArticle` |
| GET | `/api/mcp/gallery` | read | `listAdminGallery` |
| POST | `/api/mcp/gallery` | write | `createGallery` |
| PATCH | `/api/mcp/gallery/:id` | write | `updateGallery` |
| GET | `/api/mcp/diary` | read | `listAdminDiaryEntries`（见下方投影说明） |
| PUT | `/api/mcp/diary/:date` | write | `upsertDiaryEntry`（强制 `isPublic` 默认 false） |
| GET | `/api/mcp/images` | read | `listMedia` |
| POST | `/api/mcp/images` | write | `uploadMedia`（multipart） |
| POST | `/api/mcp/ops/pages/deploy` | write | `triggerPagesDeploy` |
| POST | `/api/mcp/ai/summary` | write | `generateArticleSummary` |

**列表投影（必须做，不是可选）**：`listAdminArticles` 一次返回最多 500 篇**全文**
（`content` + `contentMarkdown`），`listAdminDiaryEntries` 无上限，`listAdminGallery`
上限 2000 条。把这些直接塞进模型上下文会一次吃掉几十 MB。因此路由层做投影：

- `GET /api/mcp/articles` → 只保留 `id,title,slug,category,tags,createdAt,updatedAt,aiSummary`
  加 `contentLength`；分页参数 `page`/`pageSize`（默认 20，上限 50）由路由层做切片，
  不复用 domain 的 SQL。全文只通过 `articles/:id` 取。
- `GET /api/mcp/diary` → 原样返回全部字段（日记单条很短），但加 `page`/`pageSize`
  切片（默认 50，上限 100），避免无上限地一次返回几千条。
- `GET /api/mcp/gallery` → 原样返回（单条只有 URL 和尺寸，2000 条也可控），但加
  `page`/`pageSize` 切片，默认 100，上限 200。

投影是路由层的一处显式偏差，写在 `api/mcp/[...path].ts` 里并附注释说明原因。

说明：

- `ai/summary` 归 write：它会真实消耗 DeepSeek 额度。
- 不调用 `assertSafeMutation`：Bearer 不随浏览器自动携带，CSRF 模型不适用。
  这是有意为之，需在路由首行注释写明理由。
- 响应统一 `cache-control: no-store`（`nuxt.config.ts` 的 `/admin/api/**` 规则已覆盖）。
- 错误沿用现有 `error-handler` 的 JSON 形态，客户端按 `statusCode` + `statusMessage` 处理。

### 5.5 凭证生命周期一致性

- `changeAdminPassword`：在现有 batch 里追加一条
  `UPDATE mcp_tokens SET revoked_at = ? WHERE username = ? AND revoked_at IS NULL`，
  与 `admin_sessions` 的处理保持一致。
- `resetOrBootstrapAdmin`：同样追加。
- 这两处 + `loginAdmin` 的抽取，是本设计对现有文件仅有的改动。

### 5.6 不新增的 Secret

完全复用 `SESSION_PEPPER` 做 token 哈希。不需要新的 Worker Secret，不需要 KV。
（现有可选的 `ADMIN_RATE_LIMIT` KV 绑定保持未启用。）

> 风险说明：`/api/mcp/token` 是一个新的密码校验入口，与既有
> `/admin/api/auth/login` 同属暴力破解面。两者都受 PBKDF2 100k 迭代的固有成本保护，
> 且现有登录本来也没有启用限流。为 MCP 单独加限流属于范围外建议。

## 6. 本机客户端（blog-mcp/）

### 6.1 形态

仓库根新增独立包 `blog-mcp/`（不在 `nuxt-admin` 内，避免把 MCP 依赖塞进 Worker 构建）。

```
blog-mcp/
  package.json          # type: module, bin: blog-mcp
  src/index.js          # CLI 入口：login / logout / status / serve
  src/credentials.js    # 读写凭证文件
  src/api.js            # HTTP 客户端：baseUrl、Bearer、错误映射、multipart
  src/tools.js          # 工具定义表（纯数据：name/description/schema/handler）
  src/server.js         # MCP stdio 服务装配
  README.md             # 注册命令与排错
```

依赖：`@modelcontextprotocol/sdk`（当前 1.32.2）。工具的入参 schema 用 SDK 默认的
zod 写法；安装时以 SDK 声明的 peer 范围为准。不引入其他运行时依赖。

### 6.2 CLI

```
blog-mcp login --label laptop [--read-only] [--days 30]   # 交互式读用户名/密码
blog-mcp logout                                            # 用自身 token 吊销
blog-mcp status                                            # 显示账号、label、scope、过期时间
blog-mcp serve                                             # stdio MCP（由客户端启动）
```

- 密码输入不回显（`node:readline` + 关闭 echo）。
- 基址默认 `https://wasd09090030.top`，可用 `BLOG_MCP_URL` 覆盖（本地联调指向 `http://localhost:3000`）。
- 任何日志都不打印 token，只打印 `token_prefix`。

### 6.3 凭证文件

- Windows：`%APPDATA%\blog-mcp\credentials.json`
- 其他：`$XDG_CONFIG_HOME/blog-mcp/credentials.json`，回退 `~/.config/blog-mcp/`
- 权限：POSIX 下 `chmod 600`；Windows 依赖用户目录 ACL，README 说明。
- 内容：`{baseUrl, token, tokenPrefix, username, label, scopes, expiresAt}`
- 401 时客户端提示"凭证已失效，请重新 `blog-mcp login`"，不自动重试。

### 6.4 工具清单（13 个，全部不含删除）

| 工具名 | 用途 | 关键入参 |
| --- | --- | --- |
| `article_list` | 分页列出文章元信息（不含正文） | `page?`(默认 1)、`pageSize?`(默认 20，≤50) |
| `article_get` | 读单篇文章全文 | `id` |
| `article_create` | 新建文章 | `title`\*、`contentMarkdown`\*、`slug?`、`category?`(study/game/work/resource/other)、`tags?`、`coverImage?`、`aiSummary?` |
| `article_update` | 增量更新文章 | `id`\* + 上述任意字段 |
| `article_summarize` | 调 AI 生成摘要与 slug | `title`\*、`content`\*（≤80k） |
| `image_list` | 列出图床文件 | `dir?`、`search?`、`start?`、`count?`(≤100)、`recursive?` |
| `image_upload` | 上传本地图片到图床 | `filePath`\* |
| `gallery_list` | 分页列出画廊条目 | `page?`、`pageSize?`(默认 100，≤200) |
| `gallery_create` | 新增画廊条目 | `imageUrl`\*、`tag?`、`sortOrder?`、`isActive?`（**无 `createdAt`**：domain 层忽略它） |
| `gallery_update` | 更新画廊条目 | `id`\* + 上述任意字段，外加 `createdAt?`（仅更新生效） |
| `diary_list` | 分页列出日记元信息（含未公开） | `page?`、`pageSize?`(默认 50，≤100) |
| `diary_upsert` | 按日期写入/覆盖日记 | `date`\*（YYYY-MM-DD）、`contentMarkdown`\*、`mood?`、`weather?`、`location?`、`tags?`、`isPublic?`（**默认 false**） |
| `rebuild_public_site` | 触发公开站重建 | — |

工具描述要求：写清楚"这会修改线上数据"；`rebuild_public_site` 注明"几分钟后公开站才更新"；
`image_upload` 注明"文件会公开可访问"；`diary_upsert` 注明"不传 `isPublic` 时默认不公开"。

> **`diary_upsert` 的默认值覆盖**：`upsertDiaryEntry` 的 domain 默认 `is_public = 1`，
> 模型漏填就会直接发到公开站。MCP 路由层在调用前补 `isPublic ?? false`，
> 把"默认公开"改成"默认私密"。这是有意偏离 domain 默认值，需在路由里注释。

### 6.5 `image_upload` 的本地文件安全约束

模型被提示注入后可以把任意本地文件上传成一个公开 URL——这是本设计里最现实的一条外泄路径。因此：

- 只接受绝对路径，且必须是以下扩展名：`.jpg .jpeg .png .webp .gif .avif`
- 单文件 ≤ 50 MB（与服务端 `MAX_UPLOAD_BYTES` 一致）
- 若设置了 `BLOG_MCP_UPLOAD_ROOTS`（分号分隔），路径必须落在其中
- 工具描述里写明"只上传用户明确指定的图片文件"

## 7. 客户端注册

```powershell
claude mcp add blog --scope user -- node D:\Work_space\MyBlogWeb-CloudflarePage\blog-mcp\src\index.js serve
```

README 同时给出 Claude Desktop 的 `claude_desktop_config.json` 片段。

## 8. 验证计划

**必做（本地，不触线上）**

1. `cd nuxt-admin && npm run typecheck`
2. `npm run check:free-config`（确认没有引入 Paid 特性）
3. 新增 `scripts/check-mcp-token.mjs`，用 `node --experimental-strip-types`（沿用
   `check-gallery-duplicates.mjs` 的做法）覆盖纯逻辑：token 格式、scope 白名单过滤、
   `expiresInDays` 夹取、过期/吊销判定、`must_reset` 拒绝、`isPublic` 默认 false。
4. `nuxt dev` + curl 冒烟：`/api/mcp/token` 换 token → 调 `articles`（校验投影字段）
   → 调 `images` → 用 Cookie 会话调 `tokens` 列表 → 按 id 吊销 → 再调应 401。
5. 确认 `/api/mcp/*` 与 `api/beatmaps/[...path].all.ts` 不互相遮蔽。
6. `node blog-mcp/src/index.js status`，再用一个 stdio 冒烟脚本跑通 `article_list`。

**需授权后才做**

- `npm run db:migrate:remote`、`npm run deploy:api`（线上变更，按 CLAUDE.md 的发布顺序）
- 线上端到端：登录、调工具、吊销

## 9. 风险与回滚

| 风险 | 处理 |
| --- | --- |
| 新增密码校验端点 | 与既有登录同一套 PBKDF2 成本；不新增 secret；建议后续给两者同时上 KV 限流（范围外） |
| MCP token 泄露 | 具名 + 可单独吊销（Bearer 自吊销或用浏览器会话按 id 吊销）+ 最长 90 天 + 不发删除权限 |
| D1 写放大（last_used_at） | 60 秒节流 |
| `image_list` 在 read scope 下写 D1 | 只 upsert 素材索引，不碰业务数据；已在 5.2 记录 |
| 列表接口撑爆上下文 | 路由层投影 + 分页，见 5.4 |
| 上传导致本地文件外泄 | 扩展名白名单 + 大小上限 + 可选的根目录白名单 |
| `must_reset` 被绕过 | 发 token 与每次 Bearer 校验都检查 `must_reset` |

回滚：迁移只新增表，可保留；代码回滚用 `wrangler rollback` 回到上一个 `blog-api` 版本，
或重新部署上一版。`blog-mcp/` 与本机配置独立，删目录即失效（token 需另行吊销）。

## 10. 实施顺序

1. 迁移 `0011_mcp_tokens.sql` + `mcp_tokens` 读写工具（`server/domain/mcp-token.ts`）
2. 从 `loginAdmin` 抽出 `verifyAdminCredentials`（行为不变）
3. `routes/api/mcp/[...path].ts`：鉴权组（含 Cookie 会话的 token 列表/吊销）→ 业务组
4. 列表投影与分页、`diary_upsert` 的 `isPublic` 默认值
5. 改密码 / 重置时吊销 MCP token
6. `scripts/check-mcp-token.mjs` + typecheck + 本地 curl 冒烟
7. `blog-mcp/` 客户端：credentials → api → tools → server → CLI
8. stdio 冒烟 + 注册到 Claude Code
9. 文档：`blog-mcp/README.md`、CLAUDE.md 补一段部署与排错

## 11. 留给实施者的空间

- 分发方式：手写 if 链 vs 小路由表——按现有风格，建议 if 链
- D1 节流的具体实现：`last_used_at` 先读后写 vs 条件 UPDATE，任选，行为需一致
- `blog-mcp` 的日志格式、CLI 参数解析（可用 `node:util.parseArgs`，零依赖）
- 冒烟脚本放哪：`blog-mcp/scripts/` 或 `nuxt-admin/scripts/`，二选一
- 后台是否要做 MCP token 管理页面：接口已具备（`GET/POST /api/mcp/tokens`），
  页面本身可留到有需要时再加，第一版用 curl 或 `blog-mcp status` 足够

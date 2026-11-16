# CLAUDE.md

本项目个人博客采用 Cloudflare Free 混合部署。**部署不再依赖 GitHub Actions 推送自动部署**，统一通过本地 Wrangler 手动发布，或通过后台「重构 nuxt-public」按钮触发公开站重建。

项目概览、编码与提交规范见 [AGENTS.MD](AGENTS.MD)，架构说明见 [README.md](README.md)。

## 部署架构（Cloudflare Free）

| 资源 | 类型 | 部署方式 |
| --- | --- | --- |
| `blog-api` | Worker（cloudflare_module，绑定 D1） | 本地 `npm run deploy:api` |
| `myblog-admin` | Pages（Direct Upload，静态 SPA） | 本地 `npm run deploy:pages` |
| `blog-router` | Worker（统一域名路由） | 本地 `npx wrangler deploy` |
| `myblogweb-cloudflarepage` | Pages（连接 Git，SSG 静态站） | Git 推送自动构建，或后台「重构 nuxt-public」按钮，或本地 `wrangler pages deploy` |
| `blog-db` | D1 SQL 数据库 | 迁移命令 `npm run db:migrate:remote` |

依赖关系：`blog-router` 通过 Service Binding 调用 `blog-api`（`BLOG_API`），并把 `/admin/api/*`、`/api/*`、`/images/*` 转发给 `blog-api`，`/admin/*` 转发给 `myblog-admin`，其余路径转发给 `myblogweb-cloudflarepage`。

## 部署顺序与命令

**发布顺序固定为**：`D1 migrations -> blog-api -> myblog-admin Pages -> blog-router -> myblogweb-cloudflarepage Pages`。

在 `nuxt-admin/` 目录执行：

```powershell
cd nuxt-admin
npm run check:free-config       # Free 配置检查
npm run check:image-api         # 图床 API 契约检查
npm run check:image-transform   # 图片变换检查
npm run db:migrate:remote       # 1. 应用 D1 迁移（必须先于 blog-api）
npm run deploy:api              # 2. 构建并部署 blog-api Worker
npm run deploy:pages            # 3. 生成并部署 myblog-admin Pages（静态 SPA）
```

发布路由分发（在 `cloudflare-worker/` 目录）：

```powershell
cd ../cloudflare-worker
npm test
npx wrangler deploy --config wrangler.toml   # 4. 部署 blog-router
```

发布公开站（在 `nuxt-public/` 目录，仅在需要绕过 Git 构建或本地发布时）：

```powershell
cd ../nuxt-public
$env:NUXT_PUBLIC_API_BASE_URL = '/api'
$env:NUXT_API_BASE_URL = 'https://wasd09090030.top/api'
$env:NUXT_PUBLIC_SITE_URL = 'https://wasd09090030.top'
npm run generate
npx wrangler pages deploy .output/public --project-name myblogweb-cloudflarepage
```

## Steam 游戏档案同步（公开站 `/games`）

数据由 `blog-api` 定时抓取并落 D1，公开页只读快照。凭证有**两条路径**，二选一或同时保留（D1 优先）：

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| 后台填写 | `/admin/gaming` → Steam 凭证 | 推荐。`steam_id` 明文、`api_key` 经 AES-GCM 加密后存 D1；保存前会用一次 Steam 调用校验 |
| `STEAM_ID` / `STEAM_API_KEY` | `wrangler.toml` `[vars]` + Worker Secret | 兜底/引导用。D1 没有可用凭证时生效 |
| `STEAM_SYNC_TOKEN` | `blog-api` 与 `blog-router` 两个 Worker Secret | 必须完全一致，router 的 cron 用它调用内部同步端点 |
| `STEAM_CREDENTIAL_KEY` | `blog-api` Worker Secret（可选） | 凭证加密密钥；不配时回退用 `SESSION_PEPPER` 做域分离派生 |

```powershell
cd nuxt-admin
npm run db:migrate:remote                                     # 应用 0007 / 0008 / 0009 / 0010 迁移
npx wrangler secret put STEAM_SYNC_TOKEN --config wrangler.toml
npx wrangler secret put STEAM_CREDENTIAL_KEY --config wrangler.toml   # 可选，建议配置
npm run deploy:api

cd ../cloudflare-worker
npx wrangler secret put STEAM_SYNC_TOKEN --config wrangler.toml
npx wrangler deploy --config wrangler.toml                    # 带 crons = ["0 21 * * *"]（= 次日 05:00 上海）
```

部署后登录后台「游戏」页填 SteamID + API Key，点保存（会自动校验），再点「立即同步」。

**安全要点**：

- API Key 只写不读，读取接口只返回 `••••后四位`；数据库导出里只有密文
- 密文带 `key_id`（主密钥指纹）与 AAD（用途绑定），换字段或篡改都会解不开
- 拥有 Worker 部署权限的人可以替换 secret 并解密，属于平台边界；不要把部署权限交给不受信任的人

**轮换加密密钥**：

1. `npx wrangler secret put STEAM_CREDENTIAL_KEY` 写入新值
2. `npx wrangler secret put STEAM_CREDENTIAL_KEY_PREVIOUS` 填入旧值
3. 重新部署 `blog-api`（新增 secret 后会重启）
4. 登录后台「游戏」页，点一次「保存并验证」让凭证用新 key 重写
5. 确认同步正常后删除旧值：`npx wrangler secret delete STEAM_CREDENTIAL_KEY_PREVIOUS`

解密时会自动按 `key_id` 匹配当前或上一把钥匙；两把都对不上时按「无法解密」处理，页面提示重新填写，不会报 500。

**为什么 cron 在 `blog-router`**：Nitro 的 `cloudflare_module` 产物只导出 `fetch`，无法接收 Cloudflare 的 `scheduled` 事件。因此定时任务挂在 `blog-router`，经 `BLOG_API` service binding 调用 `POST /api/steam/sync`。

单轮最多 40 次上游请求（Free 计划 50 次子请求上限）；库内只写**发生变化的行**，避免每天把 708 款游戏与上千条成就整表重写（D1 写额度按行计费，带索引的列还会再算一次）。成就一半名额给「近两周在玩」，一半按陈旧度轮转整个库。同步失败保留上一次成功快照，页面标注「快照过期」而不是清空。未配置凭证时 `/api/steam/overview` 返回 `status: "unconfigured"`，页面显示说明而不报错。

## 公开站重建（后台 trigger 按钮）

`myblogweb-cloudflarepage` 是 SSG 静态站，文章、画廊等**内容变更后不会自动更新**。有两种重建方式：

1. **后台「重构 nuxt-public」按钮**：登录 `https://wasd09090030.top/admin` 后，在内容工作台点击「重构 nuxt-public」或 Cloudflare Pages 卡片上的「触发重构」。该操作调用 `POST /admin/api/ops/pages/deploy-hook`，由 `blog-api` Worker 触发 Cloudflare Pages 重建（静态站会重新生成并发布，通常需要几分钟）。
2. Git 推送 `nuxt-public` 代码到 `main`：由于 `myblogweb-cloudflarepage` 连接了 Git，推送会触发 Cloudflare Pages 自动构建。

**前置条件**：后台 trigger 按钮依赖 `blog-api` 的 Worker Secret。优先配置 `PAGES_DEPLOY_HOOK_URL`（Pages Deploy Hook URL）；未配置时，`blog-api` 会回退到读取 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`PAGES_PROJECT_NAME` 三个 secret。未配置任一 secret 时该接口返回 503。Secret 设置命令：

```powershell
cd nuxt-admin
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.toml   # 推荐
# 或回退方案
npx wrangler secret put CLOUDFLARE_API_TOKEN --config wrangler.toml
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --config wrangler.toml
```

`myblog-admin`（Direct Upload）和 `blog-api`、`blog-router` 两个 Worker 没有自动构建，修改代码后必须手动按上述顺序发布。

## MCP 服务（blog-mcp）

`blog-mcp/` 是一个**本机 Node stdio 进程**，把博客后台能力包装成 13 个 MCP 工具（文章、画廊、日记、图床、AI 摘要、公开站重建），供 Claude Code / Claude Desktop 调用。它不直连 D1，所有请求都走线上 `blog-api` 的 `/api/mcp/*`。安装、注册与排错见 `blog-mcp/README.md`。

**鉴权模型**

- `/api/mcp/*` 只认 `Authorization: Bearer bmcp_...`，是实现于 `nuxt-admin/server/routes/api/mcp/[...path].ts` 与 `server/domain/mcp-token.ts` 的独立命名空间，不经过 `admin/api/[...path].ts` 的三条前置检查。
- token 存 D1 `mcp_tokens` 表（`nuxt-admin/migrations/0011_mcp_tokens.sql`），只存 `SHA-256(SESSION_PEPPER:token)`，明文仅签发时返回一次；scope 为 `mcp:read` / `mcp:write`，默认 TTL 30 天、上限 90 天，`last_used_at` 有 60 秒节流。
- **Bearer 与 Cookie 永不混用**：Bearer 路由完全不读 Cookie；`GET /api/mcp/tokens` 与 `POST /api/mcp/tokens/:id/revoke` 两条管理路由反过来只认后台 Cookie 会话，并**显式拒绝**任何 `Authorization` 头（返回 400），防止泄露的 MCP token 反向操作 token 管理本身。改这两组路由时不要放宽这条边界。
- **改密码 / 重置密码会吊销该账号的全部 MCP token**（`server/domain/auth.ts` 的 `revokeMcpTokensStatement` 接在 `changeAdminPassword` 与 `resetOrBootstrapAdmin` 的 batch 里）。`must_reset` 为 1 时签发和每次 Bearer 校验都会被拒。
- **没有删除类工具，也不要加**。`tools.js` 中 13 个工具全部为只读或写入/覆盖；服务端 `/api/mcp/*` 也没有 DELETE 分支（恒 404）。删除类端点（尤其会联动真删图床原文件的那种）属于明确非目标。
- **`diary_upsert` 的可见性默认值在路由层被翻转**：domain 的 `upsertDiaryEntry` 默认 `is_public = 1`，MCP 路由调用前用 `withDiaryPublicDefault` 补 `isPublic ?? false`。改这条会直接把模型漏填的日记发到公开站，不要"对齐"回 domain 默认值。
- **`image_list` 不是纯只读**：它在 `mcp:read` 下也会把列出的文件 upsert 进图片资源表。加工具时不要因为"看着像读接口"就把它挂到只读语义上。

**部署与变更**

- 发布顺序不变，且**迁移必须先于 Worker 部署**：`npm run db:migrate:remote` → `npm run deploy:api`。少跑迁移会让 `/api/mcp/token` 因 `mcp_tokens` 表不存在而失败。这两个命令需用户授权后执行，不要自行运行。
- `blog-router` 不需要改动：`/api` 已在 `API_PATHS` 里，`/api/mcp/*` 原样转发给 `blog-api`。
- 不新增 Worker Secret：token 哈希复用既有的 `SESSION_PEPPER`。
- 本地验证：`cd nuxt-admin && npm run check:free-config && npm run check:mcp`、`cd blog-mcp && npm run smoke`。`npm run typecheck` 在本仓库有 12 个**既有**错误（`app/pages/admin/diary|gaming/*`、`server/domain/articles|assets|diary.ts`），不是本模块的绿色门禁——判断标准是"没有新增错误"，不要声称它通过。

**修改工具时**：新增/修改任一工具必须同时改 `blog-mcp/src/tools.js`（名称、描述、schema）与 `blog-mcp/README.md` 的工具表，并更新 `blog-mcp/scripts/smoke.mjs` 里的工具清单断言。工具描述是给模型看的提示，必须与真实行为一致（写操作要写"会直接修改线上数据"、`diary_upsert` 要写"默认不公开"、`image_upload` 要写"公开可访问"）。

## 关键文件

- `nuxt-admin/wrangler.toml` — `blog-api` Worker 与 D1 配置
- `cloudflare-worker/wrangler.toml` — `blog-router` 与 Service Binding
- `nuxt-admin/DEPLOYMENT.md` — 完整迁移、冒烟与回滚清单
- `docs/Secrets-Encryption.md` — 密钥与加密存储：AES-GCM 设计、轮换步骤、故障排查、如何加密新字段
- `docs/CloudflarePages-Deploy-Guide.md` — Pages 部署说明
- `nuxt-admin/server/domain/operations.ts` — 后台 trigger 按钮（`triggerPagesDeploy`）实现

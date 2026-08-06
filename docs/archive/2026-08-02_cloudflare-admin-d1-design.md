# Cloudflare Admin 与 D1 迁移设计

## 任务目标

将 `nuxt-admin/` 从 Node SSR + PM2/Nginx + .NET API 迁移到 Cloudflare 运行时，并将博客关系数据迁移到 Cloudflare D1。迁移完成后，生产运行时不再依赖 `backend-dotnet/BlogApi/` 或独立云服务器；公开站点继续使用 Cloudflare Pages。

## 当前基线

- `nuxt-admin/` 当前使用 `nitro.preset: node-server`，SSR BFF 将登录和受保护请求转发到 .NET `/api/*`。
- `cloudflare-worker/router.js` 当前把 `/admin`、`/api`、`/images`、`/_ssr` 转发到 `SERVER_ORIGIN`。
- .NET 使用 EF Core SQLite，当前数据库约 2.45 MB：73 篇文章、3 条评论、342 条画廊记录、25 个图片元数据、2 个 beatmap set、9 个 difficulty、3 个 like。
- 密码目前在 `admin-password.enc` 文件中，refresh token 保存在进程内 `ConcurrentDictionary`；这两种状态都不能直接迁移到无状态 Worker。
- 图片实际使用 `cfimg.wasd09090030.top` 的对象路径；D1 只应保存元数据，文件应由 R2 保存或继续引用现有 R2 对象。
- Beatmap 前端入口已被移除，当前没有 `nuxt-public/` 或 `nuxt-admin/` 的调用方；历史表可保留，但不应阻塞核心迁移。

## 推荐目标架构

```text
Browser
  |
  v
blog-router Worker (统一域名、公开入口)
  |-- public paths ------------------> nuxt-public Cloudflare Pages
  |-- /admin, /api, /images, /_ssr --> Service Binding: blog-admin Worker
                                          |
                                          |-- Nuxt SSR + Nitro server routes
                                          |-- D1: BLOG_DB
                                          |-- R2: BLOG_MEDIA
                                          |-- optional KV: rate limit/cache
                                          |-- external AI API (secret only)
```

`blog-admin` 使用 Nitro `cloudflare_module` preset。保留 `/admin/*`、`/api/*`、`/images/*` 和 `/_ssr/*` 的外部路径，不再通过公网 URL 调用独立后端。`blog-router` 通过 Service Binding 调用 `blog-admin`，避免额外公网跳转和 CORS。

## 核心决策

### 1. Workers 优先，Pages 仅保留公开静态站

Nuxt/ Nitro 当前官方资料将 `cloudflare_module` 作为 Workers 推荐 preset；Pages SSR 也可用，但本任务需要统一使用 D1、R2、定时任务和内部 Service Binding，Worker 目标更直接。`nuxt-public/` 继续按现有 SSG 流程部署 Pages。

### 2. 直接在 Nuxt server routes 中实现 API

保留浏览器契约：

- 公共 `/api/*`：文章读取、画廊读取、评论读取/提交/点赞。
- 管理 `/admin/api/*`：登录、会话、文章、评论审核、画廊、媒体、AI 摘要、密码和部署操作。

Nuxt server routes 直接调用 D1 repository/service，不再保留 `backendFetch()` 到 .NET 的转发层。响应 DTO、状态码和分页参数先按现有 .NET 契约兼容，避免同时改动 `nuxt-public`。

### 3. 使用 D1 持久化 opaque session

不继续使用 JWT + 进程内 refresh token。登录成功后生成高熵 opaque session token，只把 token 放入 `__Host-admin_session` HttpOnly/Secure/SameSite=Lax/Path=/ Cookie；D1 保存 token 哈希、用户、过期时间、撤销时间和审计字段。每次受保护请求验证 D1 session，登录、注销和密码修改时轮换或撤销 session。

密码迁移使用 Worker 可用的 Web Crypto PBKDF2（盐、迭代次数和算法版本写入 D1）。旧 bcrypt 文件不打包进 Worker；切换时要求一次性重置密码，或在迁移脚本中用兼容校验完成一次升级后删除旧文件。生产不得使用历史默认密码。

### 4. D1 存关系数据，R2 存对象

D1 表建议统一为小写 snake_case：`articles`、`comments`、`likes`、`galleries`、`image_assets`、`admin_users`、`admin_sessions`、`cf_image_configs`，以及需要保留的 `beatmap_sets`、`beatmap_difficulties`。保留现有主键 ID，保证文章链接和外部引用不变。`tags`、谱面 `data_json` 等继续以 TEXT JSON 保存。

图片上传改为 Worker 流式写入 R2，图片元数据和 public ID 写入 D1；公开图片通过 Worker 解析 D1 后读取 R2，缩略图使用 Cloudflare Image Transform 或现有 R2 自定义域名。不得把二进制文件写入 D1，也不得在 Worker 中调用 `fs` 或把大文件完整读入内存。

现有 `imagebed_configs.ApiToken` 不迁入新运行时；R2 bucket、外部图片 API token 和 Cloudflare API token 统一改用 Worker Secret/Binding，并在切换时轮换旧 token。

### 5. D1 查询和事务约束

- 所有动态值使用 prepared statement，禁止拼接用户输入 SQL。
- 文章列表、评论和画廊查询必须分页并有索引，禁止无界 `SELECT *`。
- 文章/图片资产、画廊/图片资产等多表写入使用 D1 `batch()`；需要读后写一致性时使用 D1 session 的 primary 选项。
- 定期清理过期 session；登录限流可使用 KV/WAF，不能依赖 Worker 全局内存。

## 数据迁移方案

1. 备份 `backend-dotnet/BlogApi/blog.sqlite`，保留原文件和导出 SQL；记录表计数、主键最大值、关键行哈希。
2. 建立显式 D1 SQL migrations，不直接把 EF 运行时 `EnsureCreated()` 带入 Worker；处理 `Comment`/`Like` 表名、索引、外键和 `coverImageAssetId` 等历史增量字段。
3. 在 D1 staging/preview 数据库导入数据，批量校验记录数、主键、slug、外键和图片 asset 对应关系。
4. 在生产切换窗口再次导出 SQLite，暂停旧后台写入，执行最终增量导入和校验。
5. 切换入口 Worker；切换后旧 .NET 只读保留一段观察期。D1 已有新写入后不能无条件回滚到 SQLite，回滚必须通过反向同步或恢复方案处理。

## 分阶段实施

### Phase 0：确认边界

已确认本次迁移接受一次性管理员密码重置，复用现有 R2 bucket 及对象 key，退休 Beatmap API，生产以 Workers Paid 为基线，并保留后台触发 Pages 部署的能力。实施前仍需补齐 D1 database ID、R2 bucket 名称、Worker 名称和 secret 值等环境输入。

### Phase 1：D1/R2 基础设施

新增 migrations、D1/R2 wrangler 配置、环境类型和本地 `wrangler dev` 配置；完成 staging 导入与校验脚本。此阶段不改生产路由。

### Phase 2：Cloudflare API 层

在 `nuxt-admin/server/` 增加 Cloudflare binding adapter、D1 repositories、领域服务和公共 `/api/*` 路由；先实现文章、画廊、评论，再实现图片、配置、AI 和部署操作。加入契约 fixture 测试。

### Phase 3：认证与媒体

实现 D1 session、PBKDF2 密码、CSRF Origin 校验、登录限流、R2 流式上传、对象读取/缩略图和清理策略。删除对 .NET JWT、文件密码和外部 imagebed API 的运行时依赖。

### Phase 4：Nuxt Worker 化

将 `nuxt-admin/nuxt.config.ts` 切换到 `cloudflare_module`，保留 `/_ssr/` asset namespace；接入 `event.req.runtime.cloudflare.env` binding；用 `wrangler dev` 验证 SSR、Cookie、D1 和 R2。

### Phase 5：路由和 CI/CD

先部署 D1 migrations，再部署 `blog-admin`，最后部署声明 Service Binding 的 `blog-router`。公开站点构建时使用新 Worker 的完整 API URL，浏览器运行时使用相对 `/api`。更新 release workflow、smoke test 和环境变量说明。

### Phase 6：切换与退役

维护窗口内执行最终备份、只读冻结、导入校验、路由切换和登录/SSR/文章/评论/画廊/媒体冒烟测试。观察期结束后下线 PM2/Nginx 和 .NET 运行时；删除 `backend-dotnet`、旧 `nuxt` 和 beatmap 代码必须另开清理 change。

## 关键风险与处理

| 风险 | 处理 |
| --- | --- |
| D1 单库串行写入或查询过慢 | 索引、分页、batch、避免大查询；生产建议 Workers Paid。 |
| Worker CPU/请求体限制 | 生产固定使用 Workers Paid；上传采用流式 R2，不能依赖现有 200 MB `.osz` 接口。 |
| Node/.NET 专用能力无法移植 | 移除文件系统、ImageSharp、EF；图片尺寸检测改为异步/边缘兼容实现。 |
| 旧 bcrypt 文件无法直接作为 Worker 状态 | 一次性密码重置或兼容校验后升级为 PBKDF2。 |
| D1 切换后回滚造成数据分叉 | 维护窗口、最终备份、旧后端只读观察期；不承诺写入后的无损即时回滚。 |
| 外部图片 token 泄漏或继续依赖 imagebed | 迁移到 R2 binding/secret，并轮换旧 token；D1 不存第三方 secret。 |
| Beatmap 历史接口无调用方 | 不迁移上传/解析器；历史表可作为只读归档导入，活动接口明确返回 410。 |

## 已确认的产品决策

1. **密码**：接受切换窗口的一次性重置；使用 Worker Web Crypto PBKDF2 写入 D1，撤销旧会话，不迁移旧密码文件。
2. **媒体**：复用现有 R2 bucket 和对象 key；D1 只保存 `image_assets` 元数据，切换前逐项验证引用对象可读。
3. **Beatmap**：不再提供 Beatmap API、上传或解析能力；历史数据如需保留，只作为 D1 只读归档表，不参与活动路由。
4. **生产计划**：Workers Paid 作为 `blog-admin` 和 `blog-router` 的生产基线，使用 Standard usage model，并设置 CPU 上限防止异常账单。
5. **Pages 部署**：保留 `/admin/api/ops/pages/deploy-hook`；由 Worker secret 保存现有 Deploy Hook URL，管理员会话和 Origin 校验通过后发起 POST。Deploy Hook URL 不写入 D1、不返回前端。

## 验收门槛

- 生产 Worker 的动态请求不再访问 `backend-dotnet/BlogApi/`、独立服务器或外部 imagebed API；旧 .NET 仅在观察期只读保留。
- `/admin/login`、深层管理路由、`/_ssr/*` 资源、会话跨 Worker isolate、登出和密码修改均可通过手工冒烟测试。
- D1 导入保留文章 ID/slug、评论/画廊外键和图片 `public_id/storage_key`；表计数、关键行哈希和代表性 R2 对象校验通过。
- 公共 `/api/*` 响应字段、状态码、分页和查询参数与现有 `nuxt-public` 使用保持兼容；Beatmap 路由返回 410。
- 管理员可从后台触发一次 Pages Deploy Hook，并能看到成功或失败结果；secret 不出现在日志和响应中。
- CI/CD 按“D1 migrations -> blog-admin -> blog-router -> nuxt-public Pages”顺序执行，任何阶段失败都不会切换生产入口。

## 已核对来源

- Nitro Cloudflare provider：`https://github.com/nitrojs/nitro/blob/main/docs/2.deploy/20.providers/cloudflare.md`（Context7 与官方仓库，核对日期 2026-08-02）；确认 `cloudflare_module` 为 Workers preset、`event.req.runtime.cloudflare.env` binding 访问方式和 `wrangler dev/deploy` 流程。
- Workers Paid pricing：`https://developers.cloudflare.com/workers/platform/pricing/`（页面标注 2026-07-07）；确认 Paid 最低月费、10M requests/月、30M CPU ms/月，以及默认 30 秒/最高 5 分钟 CPU 限制。
- D1 limits：`https://developers.cloudflare.com/d1/platform/limits/`（页面标注 2026-04-21）；确认 Paid 单库 10 GB、单库串行处理、单次 Worker invocation 1000 queries 等约束。
- D1 indexes：`https://developers.cloudflare.com/d1/best-practices/use-indexes/`（页面标注 2026-04-21）；确认常用过滤字段应建索引并可用 `EXPLAIN QUERY PLAN` 验证。
- R2 Workers usage：`https://developers.cloudflare.com/r2/api/workers/workers-api-usage/`（页面标注 2026-07-01）；确认 R2 binding、流式 request body、条件读取和对象响应头处理。
- Service bindings：`https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/http/`（页面标注 2026-04-23）；确认前门 Worker 可通过 `binding.fetch(request)` 转发到 `blog-admin`，并需先部署被绑定 Worker。
- Pages Deploy Hooks：`https://developers.cloudflare.com/pages/configuration/deploy-hooks/`（页面标注 2026-04-21）；确认 Deploy Hook 是唯一 URL、无需额外认证，因此必须当作 secret 保存和轮换。
- Pages REST API：`https://developers.cloudflare.com/pages/configuration/api/`（页面标注 2026-04-21）；确认若改用 API 需 Pages Write 权限，本方案优先保留现有 Deploy Hook。

Context7 的 Nitro 查询成功；D1 专用库查询本轮有一次抓取失败，因此 D1 结论以 Cloudflare 官方 D1 页面和 Wrangler 文档结果交叉核对。最初尝试的旧地址 `https://developers.cloudflare.com/pages/configuration/build-hooks/` 返回 404，已改用官方 `deploy-hooks` 页面；失败地址没有作为已验证来源。

## 实施记录（2026-08-02）

本轮按已确认方案完成了迁移实现与收尾：

- `nuxt-admin` 已使用 `cloudflare_module`，server routes 直接调用 D1/R2，保留 `/_ssr/` 资源路径和 admin 私有缓存头。
- 已完成 D1 migrations、D1 查询/分页/batch 工具、文章/评论/点赞/画廊/媒体/配置/认证领域服务，以及公共 API、admin BFF、R2、AI、Pages deploy hook 和 Beatmap 410 路由。
- `cloudflare-worker` 已改用 `BLOG_ADMIN` Service Binding；GitHub Actions 顺序为 D1 migrations -> `blog-admin` -> `blog-router` -> Pages。
- `nuxt-public` 浏览器请求使用相对 `/api`，SSG 使用部署 Worker URL。
- SQLite 导出工具会对超过 D1 100 KB 单语句限制的文本字段生成短 INSERT 和 append UPDATE；导入工具按 400 KB 文件分块并校验每条语句不超过 90 KB。
- 根 README、Cloudflare 架构、Pages 指南和后台部署文档已改为 Worker/D1/R2 事实；PM2 配置已废弃并 fail closed。旧 .NET 源码和旧 `nuxt/` 未删除，仅保留观察期回滚参考。

## 验证记录

- `npm run typecheck`：通过。
- `npm run build`：通过；产物确认 Nitro preset 为 `cloudflare-module`，`/_ssr/` 和公共/admin/images/beatmap 路由均被打包。
- `npm run db:export`：完成，当前快照 458 条可导入记录，1 条无效 like 按既定规则跳过。
- `npm run db:migrate:local`：`0001_initial.sql`、`0002_legacy_beatmaps.sql` 成功应用。
- `node scripts/sqlite-d1-import.mjs --input .data/d1-import.sql --database blog-db --config wrangler.toml --chunk-size 400000`：本地 D1 五个 chunk 全部成功；此前 400 KB 仍失败的单条大正文问题已通过字段拆分解决。
- 本地 D1 foreign-key check 无结果；文章/评论/点赞/画廊/图片资产/Beatmap 历史表计数为 73/3/2/342/25/2/9，符合导出清单（1 条无效 like 按既定规则跳过）。
- `wrangler dev` 路由冒烟：`/admin/login`、session、articles、gallery 返回 200；未知图片返回 404；`/api/beatmaps/test` 返回 `410 BEATMAP_API_RETIRED`。
- 本地管理员 reset、login、opaque cookie session 与 logout 后会话失效均已验证。过程中修复了 Origin 校验错误地依赖构建时 public config 的问题，现改为读取请求级 `ADMIN_ORIGIN` Worker binding。
- 已通过 Context7/官方页面核对 Wrangler D1 命令、D1 100 KB SQL statement limit、Nitro Cloudflare preset、R2 Workers API、Service Binding 和 Pages Deploy Hook。D1 limits 页面更新时间为 2026-04-21，Wrangler commands 页面更新时间为 2026-04-23。

## 生产前置条件与未完成项

- 将 `nuxt-admin/wrangler.toml` 中的 `database_id` 和 R2 `bucket_name` 替换为生产资源；生产基线为 Workers Paid。
- 设置并轮换 `SESSION_PEPPER`、一次性 `ADMIN_RESET_TOKEN`、可选 `DEEPSEEK_API_KEY` 和 Pages deploy 凭据；工作树中已有的旧 .NET 配置曾包含敏感凭据，必须在上线前轮换，本文不记录其具体值。
- 生产 D1 导入、管理员一次性 reset、代表性 R2 对象校验、公共/admin/SSR 冒烟和维护窗口切换仍需在真实 Cloudflare 账户执行。
- 生产切换完成后保留旧 .NET/旧 `nuxt/` 只读观察期，确认无写入分叉后再另开 change 退役；本 change 不删除 legacy source。

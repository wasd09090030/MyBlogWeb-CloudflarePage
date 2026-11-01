## 1. 数据层与配置

- [x] 1.1 新增 `nuxt-admin/migrations/0007_steam_snapshots.sql`：创建 `steam_profile`、`steam_games`、`steam_achievements`、`steam_wishlist`、`steam_sync_runs`、`steam_sync_state`、`steam_showcases` 七张表及必要索引（`steam_games(minutes_total desc)`、`steam_achievements(appid, achieved)`、`steam_showcases(position)`）。
- [x] 1.2 在同一迁移中插入默认展柜配置（favorite / collector / recent / top-playtime / completionist / rarest-achievement / wishlist，共 7 个），确保空库也能直接渲染。
- [x] 1.3 定时触发改挂 `cloudflare-worker/`（实现期修正）：`router.js` 增加 `scheduled` → `ctx.waitUntil` → 通过 `BLOG_API` service binding 调 `POST /api/steam/sync`，`wrangler.toml` 增加 `crons = ["17 * * * *"]`，并注释单轮预算与滚动策略。（Nitro 的 `cloudflare_module` 只导出 `fetch`，无法直接接 Cron。）
- [x] 1.4 本地 `wrangler d1 migrations apply --local` 应用 0007，验证七张表与默认配置；`db:migrate:remote` 在部署前执行。

## 2. 同步域逻辑（blog-api）

- [x] 2.1 新增 `nuxt-admin/server/utils/steam-client.ts`：`x-webapi-key` 头、12s 超时、429/5xx/401 分类错误、请求计数与剩余预算。
- [x] 2.2 新增 `nuxt-admin/server/domain/steam/sync.ts`：单轮流程（档案 → 库 → 愿望单 → 成就轮转 → 商店元数据），带 `sync_lock` 重叠保护与 `steam_sync_runs` 记录。
- [x] 2.3 隐私探测：`GetOwnedGames` 返回空响应体时写 `visibility=privacy_blocked`，保留既有库与上次成功快照。
- [x] 2.4 成就候选按「未同步 > 最久未同步 > 近两周时长 > 总时长」排序，单轮 12 款、剩余预算 < 3 即停，状态记 `partial`。
- [x] 2.5 商店元数据为可选增强（封面/类型/发行日期/免费标记），失败静默降级，单轮最多 6 次。
- [x] 2.6 新增 `scripts/check-steam-showcases.mjs`（`node --experimental-strip-types`）：默认配置、未知类型、重复、超上限、范围外 limit、非法 sort/appid 共 9 项断言。

## 3. 展柜装配（blog-api）

- [x] 3.1 展柜类型注册表放在 `nuxt-admin/shared/steam-showcases.ts`：类型 → 默认 span / config schema / 说明，未知类型跳过。
- [x] 3.2 新增 `server/domain/steam/showcases.ts`：按 D1 顺序逐项装配，计算 `empty`，服务端完成 Top-N 与占比。
- [x] 3.3 配置校验：白名单、≤12 条、limit 范围、sort 仅列表类、appid 仅 favorite，错误带字段名。
- [x] 3.4 整表原子替换（单次 D1 batch）+ `updatedAt` 乐观并发，冲突返回 409。

## 4. Worker 路由

- [x] 4.1 新增 `server/routes/api/steam/overview.get.ts`：`{status, syncedAt, stale, profile, showcases[]}` + `s-maxage=300` 缓存头（并在 `nuxt.config.ts` 为 `/api/steam/overview` 单独加 routeRule）。
- [x] 4.2 新增 `server/routes/admin/api/steam/sync.post.ts`：会话校验 + 60 秒冷却（429 带 retry-after）。
- [x] 4.3 新增 `showcases.get.ts` / `showcases.put.ts` / `showcases/reset.post.ts` 与 `status.get.ts`，全部要求会话。
- [x] 4.4 定时入口：`server/routes/api/steam/sync.post.ts` 用 `STEAM_SYNC_TOKEN` 头做常量时间比较，由 `blog-router` 的 cron 调用。
- [x] 4.5 本地 `wrangler dev` 验证：无凭证 → `unconfigured`；有凭证无数据 → `empty`；假 key 同步 → `failed`（runId 记录、无崩溃）；未登录 admin 接口 → 401。

## 5. 后台：同步卡片与展柜管理器

- [x] 5.1 内容工作台新增「游戏档案（Steam 展柜）」入口卡片，指向 `/admin/gaming`；管理器页内含同步状态、最近同步时间、调用数与错误摘要。
- [x] 5.2 新增 `app/pages/admin/gaming/index.vue`：左侧已启用列表（上下移、显示开关、删除），右侧配置面板与可选展柜库，导航加入「游戏展柜」。
- [x] 5.3 配置面板按类型渲染：数量输入、排序选择、最爱游戏 appid。
- [x] 5.4 保存采用提交后刷新，失败显示后端字段错误；页面提示「公开页最多 5 分钟后生效」。
- [x] 5.5 边界：达到展柜位上限时禁用新增；无可选展柜时给出提示；空列表有占位说明。

## 6. 公开站页面

- [x] 6.1 `shared/api/endpoints.ts` 增加 `steam.overview`。
- [x] 6.2 新增 `app/features/steam-gaming/`：composable、容器、7 个展柜组件、`ShowcaseFrame`、`GameCover`、`ShowcaseSkeleton`、`StateNotice`、格式化工具与类型。
- [x] 6.3 容器按 `type` 分发组件、按 `span` 映射 `sg-card--hero/side/wide/narrow/full`；未知类型与 `empty` 跳过。
- [x] 6.4 新增 `pages/games.vue`，`server: false` 取数并声明 title/description/OG。
- [x] 6.5 新增 `SteamGaming.desktop.css` / `SteamGaming.mobile.css`（576/768/992），由容器 `@import`，颜色走既有变量。
- [x] 6.6 导航（桌面 + 抽屉）加入「游戏档案」，`prerender.routes` 注册 `/games`。
- [x] 6.7 加载骨架（SSR 也输出骨架，避免闪现空态）、隐私/未配置/失败提示与重试按钮已实现。

## 7. 验证与发布

- [x] 7.1 页面回归（用构建产物 + 模拟快照在浏览器实测）：1280/768/375/320 无横向滚动；成对展柜等高（314/314、418/418）；375px 起单列；`html.dark` 下卡片 #33241f、正文 #fdf5f1；`/games` 已排除侧边栏以保证 12 列宽度。
- [x] 7.2 无 JS 场景：`games.html` 静态输出标题、导语与骨架，不出现「暂无数据」误导文案。
- [x] 7.3 降级已验：假 key 同步 `failed` 且不清空旧数据；隐私/未配置/失败三种状态文案与链接就绪。
- [x] 7.4 后台回归（本地 worker + 会话实测）：登录 200、GET 7 项、PUT 重排 200 且顺序生效、旧 `updatedAt` 409、13 项 400、未知类型 400、`showcases/reset` 200 恢复默认、`status` 200。
- [x] 7.5 更新 `CLAUDE.md` 部署顺序：0007 迁移 → `STEAM_ID`/`STEAM_API_KEY`/`STEAM_SYNC_TOKEN` → blog-api → admin → blog-router（cron）→ 公开站。
- [ ] 7.6 按 `DEPLOYMENT.md` 灰度发布（需要真实凭证与生产 D1）。
- [ ] 7.7 `openspec archive add-steam-gaming-page` 前确认 specs 与实现一致。


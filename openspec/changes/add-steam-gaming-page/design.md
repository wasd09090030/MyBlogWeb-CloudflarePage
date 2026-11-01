## Context

公开站是 SSG（Cloudflare Pages），构建期没有 D1、也没有 Worker Secret；运行时 API 由 `blog-api`（同在 Cloudflare Free 计划）提供，`blog-router` 已把 `/api/*` 转发过去。因此「页面直接读 Steam」不可行：既会把 key 带进构建或浏览器，也会让每个访客触发上游调用。

同时 Free 计划有几个硬约束会直接决定架构：单个 Worker 调用最多 50 次子请求、CPU 时间很短、D1 写入需要批量。Steam 库如果有 100+ 款游戏，一轮同步不可能把所有成就都拉完，必须跨轮次滚动。

设计参考稿：`openspec/changes/add-steam-gaming-page/mockup.html`（可直接双击打开）。v2 起包含三个视图：**公开页**（展柜网格）、**就地编辑**（展柜右上角出现编辑入口）、**展柜管理器**（左侧排序 + 右侧配置）；工具条还能切换亮/暗主题与加载、空、隐私受限、请求失败四种状态。

## Goals / Non-Goals

**Goals:**

- 用一份定时快照支撑 `/games` 页面，页面只读、不接触 Steam。
- 在小预算内持续更新：每小时跑一次，单轮请求数受控，成就跨轮滚动。
- 失败、隐私受限、未配置三种异常都能被诚实呈现，绝不把空数据当实时数据。
- 公开接口只输出白名单字段，key 只存在于 Worker Secret。

**Non-Goals:**

- 不做 Nintendo / Switch 2 数据（无公开 API）。
- 不做「每日游玩曲线」：Steam 只提供累计时长与最近两周总量，没有逐日明细。
- 不做消费金额、购买历史、家庭共享库、单次会话时长。
- 不在公开站做实时刷新、WebSocket 或服务端渲染取数。
- 不改动现有文章、画廊、评论功能。

## Decisions

### 1. 快照优先，页面不直连 Steam

`blog-api` 用 Cron Trigger 抓取并落 D1，公开页只请求 `/api/steam/overview`。

- 理由：key 不进前端；命中边缘缓存，访客不消耗 Steam 配额；Steam 抖动不影响页面可用性。
- 备选：Worker 做实时透传 + 边缘缓存。被否决——首次请求延迟、限流风险、每次缓存未命中都打 Steam，且没法做隐私降级判断。
- 备选：构建期把数据写进静态 JSON。被否决——Pages 构建环境没有 D1 绑定，且每次内容更新都要重新构建。

### 2. 数据落 D1 的关系表，而不是一坨 JSON

按业务拆表（详见 Data Model）：档案单行、游戏按 appid、成就按 appid+api_name、愿望单单独一张（因为名称要额外解析并缓存）、运行日志与应用状态各一张，另加展柜配置表。

- 理由：Top-N 时长排行、成就稀有度筛选都是 SQL 一次查询；每轮只 upsert 变化的行，写入量小；运行日志便于后台展示「上次同步」。
- 备选：单表存整段 JSON。被否决——无法按字段排序、每次全量重写、diff 不可见。

### 3. 单轮请求预算 40，成就按游标滚动

一轮固定调用顺序：`GetOwnedGames`（1）→ `GetPlayerSummaries`（1）→ `GetRecentlyPlayedGames`（1，可由库内 `playtime_2weeks` 替代）→ 成就候选。成就候选排序规则：最近 90 天有游玩 > 时长 Top 20 > 其余，每轮最多处理 30 款，处理完记录游标，下一轮接着来。

- 理由：Free 计划单调用 50 次子请求，留 10 次余量给 D1 与商店接口；30 款游戏 × 2 次调用（成就 + 全局稀有度）≈ 60 次已经超预算，所以单款游戏的「成就 + 全局稀有度」拆到两轮，或全局稀有度按需懒加载。
- 备选：一次全量。被否决——直接撞上限，且大库永远同步不完。

### 4. 成就与商店元数据都是「可失败的可选增强」

成就接口对无 stats 的游戏会直接报错；商店 `appdetails` 是未公开接口、限流更严格。两者失败都只降级该游戏卡片，不影响整轮状态。

- 理由：核心价值是「时长 + 最近在玩」，成就和封面是加分项。
- 备选：商店接口作为必需依赖。被否决——未公开接口随时可能变，不能让页面因此空白。

### 5. key 走 `x-webapi-key` 头

官方文档明确支持 header 传 key（`x-webapi-key`），不发 query string。

- 理由：URL 会进日志、进浏览器历史、进错误上报；header 不会。
- 备选：`?key=` 参数。被否决——泄漏面更大。

### 6. 公开接口输出投影 + 边缘缓存

`GET /api/steam/overview` 返回固定结构：

```json
{
  "status": "ok | stale | privacy_blocked | unconfigured | error",
  "syncedAt": "2026-10-31T07:12:00Z",
  "stale": false,
  "profile": { "personaName": "WyrmKk", "avatarUrl": "...", "level": 42,
               "gameCount": 128, "totalMinutes": 77040, "minutes2Weeks": 372,
               "achievementsUnlocked": 1024, "achievementsTotal": 5120 },
  "showcases": [
    { "type": "collector", "span": 6, "config": { "recentCount": 4 }, "data": { "gameCount": 128, "totalMinutes": 77040, "recentAddedAt": "..." } },
    { "type": "top-playtime", "span": 6, "config": { "limit": 6 }, "empty": false,
      "data": [{ "appid": 730, "name": "CS2", "headerUrl": "...", "minutesTotal": 18230, "share": 0.24 }] },
    { "type": "rarest-achievement", "span": 12, "config": { "limit": 3 }, "empty": false,
      "data": [{ "appid": 2379780, "game": "Balatro", "achievement": "一千万", "percent": 1.8, "unlockedAt": "..." }] }
  ],
  "freshnessWindowMinutes": 180
}
```

- 结构：`profile` 固定在最上方；其余全部走 `showcases[]`，顺序即展示顺序，`typeof span` 决定栅格宽度（4/6/12）。
- 每个元素带 `empty`：服务端已经判断过该展柜有没有内容（如 `completionist` 一款 100% 都没有），前端遇到 `empty` 直接跳过，不渲染空壳。
- 缓存头：`Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=3600`。
- 白名单：不含 `steamid`、好友、`loccountrycode`、原始 payload。
- 备选：一次返回全部 100+ 款游戏。被否决——首屏体积和渲染成本都不划算，Top-N 在服务端切好即可。

### 7. 页面：静态壳 + 客户端取数 + 固定高度骨架

`/games` 进 `prerender:routes`，页面用 `useAsyncData`（`server: false`）请求快照。骨架块按最终尺寸预留高度，避免数据到达时的布局跳动。

- 理由：SSG 环境拿不到私密数据；骨架固定高度是 CLS 最小的做法。
- 备选：把摘要写进构建期 JSON 再水合。被否决——需要额外构建管线，收益仅是首屏数字，而摘要数字本身会过期。

### 8. 样式沿用桌面/移动物理拆分

新增 `SteamGaming.desktop.css` 与 `SteamGaming.mobile.css`，断点只用 576/768/992；颜色全部走既有 CSS 变量（`--bg-primary`、`--accent-primary`、`--card-bg`），自动继承亮/暗主题。数据条用 `width: %` + `transform: scaleX()` 入场，`prefers-reduced-motion` 下禁用。

### 9. 图片直接用 Steam CDN

`https://cdn.cloudflare.steamstatic.com/steam/apps/{appid}/header.jpg`，`loading="lazy"` + `referrerpolicy="no-referrer"`，加载失败回退到渐变占位。

- 理由：省 R2 存储与带宽，Steam CDN 稳定。
- 备选：抓取到 R2。被否决——收益低、成本高，且需要处理版权与更新。

### 10. 展柜系统：配置驱动，而不是写死区块

参考 Steam 个人资料的展柜（showcase）模型——每个展柜是一个独立模块，用户决定放哪些、什么顺序。Steam 客户端 `EProfileCustomizationType` 共 24 种，我们只实现「数据真的拿得到」的那部分：

| Steam 展柜类型 | 本项目 | 数据来源 |
|---|---|---|
| `GameCollector` | `collector` ✅ | 库总数、总时长、最近入库 |
| `FavoriteGame` | `favorite` ✅ | 指定 1 款，取时长 + 成就进度 |
| `Achievements` | `top-playtime`/`recent` ✅ | 库内时长与两周时长 |
| `AchievementsCompletionist` | `completionist` ✅ | `achievements_unlocked = achievements_total` 的游戏 |
| `RareAchievementShowcase` | `rarest-achievement` ✅ | 成就 + `GetGlobalAchievementPercentagesForApp` |
| `Badges` | `badges` ✅ | `GetBadges` / `GetSteamLevel` |
| `Recommendation` | `review-quote` ⏳ | 关联站内「游戏评测」文章，不调 Steam |
| `Replay` | `annual-review` ❌ | 需要先把每日快照累积起来，属于后续变更 |
| `ScreenshotShowcase` / `CustomText` | 已移除 | 截图已由 `/gallery` 承载，手记属于写作内容，不放进游戏页；两者都不进类型白名单 |
| `ItemShowcase` / `TradeShowcase` / `WorkshopItem` / `ArtworkShowcase` / `VideoShowcase` / `Guides` / `Greenlight` / `Salien` / `LoyaltyRewardReactions` | 不实现 | Web API 拿不到，或与博客无关 |

实现要点：

- **布局**：12 列网格，按「主次配对」排版而不是逐行铺满——`favorite`(7) + `collector`(5) 组成开篇主视觉；`recent` 整行；`top-playtime`(8) + `completionist`(4) 形成列表与窄栏的对比；`rarest-achievement` 与 `wishlist` 各占整行收尾。移动端全部塌成 12，同一行的两个展柜等高（`align-items: stretch` + 内部 `margin-top: auto` 推底）。
- **展柜位**：模仿 Steam 的槽位概念，上限 12 个；`profile` 档案条固定在首位、不可删除，其余可增删。
- **配置**：`steam_showcases` 表存 `type / position / visible / config`，`config` 是按类型校验的 JSON（如 `top-playtime` 的 `limit` 与排序方式、`favorite` 的 `appid`）。服务端校验类型白名单、数量上限和字段范围，整表原子替换（`PUT`），带 `updated_at` 做乐观并发。
- **组装在服务端**：公开接口按配置顺序输出 `showcases[]`，每个元素带 `type / config / data / empty`。前端只负责渲染，未知类型直接跳过（保证老前端遇到新类型不白屏），`empty: true` 的展柜不渲染空壳。
- **后台交互**：第一版用「上移 / 下移 + 显示开关 + 右侧配置面板」，不做拖拽——HTML5 拖拽对触屏和键盘都不友好，用按钮更稳；拖拽作为后续增强。保存采用乐观更新，失败回滚并提示。

## Data Model

七张表：`steam_profile`（单行）、`steam_games`（appid 主键）、`steam_achievements`（appid + api_name）、`steam_wishlist`（愿望单缓存）、`steam_sync_runs`（运行日志）、`steam_sync_state`（锁与游标）、`steam_showcases`（展柜配置）。

| 表 | 关键字段 | 说明 |
|---|---|---|
| `steam_profile` | `id=1, steamid, persona_name, avatar_url, profile_url, level, game_count, total_minutes, minutes_2weeks, achievements_unlocked, achievements_total, visibility, synced_at` | 单行快照，`visibility` ∈ public/private/unknown |
| `steam_games` | `appid PK, name, header_url, icon_url, minutes_total, minutes_2weeks, last_played_at, release_date, genres, is_free, achievements_total, achievements_unlocked, achievement_synced_at, is_visible, updated_at` | `is_visible=0` 表示已从库中消失但保留历史 |
| `steam_achievements` | `appid, api_name, display_name, description, icon_url, hidden, global_percent, achieved, unlocked_at, updated_at` | 联合主键 `(appid, api_name)` |
| `steam_sync_runs` | `id, started_at, finished_at, status, trigger, api_calls, games_upserted, error_code, error_message` | status ∈ success/partial/failed/skipped；保留最近 50 条 |
| `steam_sync_state` | `key, value` | 存 `achievement_cursor`、`sync_lock`、`manual_sync_at` 等游标 |
| `steam_wishlist` | `appid PK, date_added, position, name, header_url, resolved_at, updated_at` | 愿望单接口只返回 appid，名称/封面按需用商店接口补齐并缓存 |
| `steam_showcases` | `id, type, position, visible, config, updated_at` | 展柜配置；`type` 走白名单，`config` 为按类型校验的 JSON，`position` 唯一递增 |

迁移文件：`nuxt-admin/migrations/0007_steam_snapshots.sql`（0006 已被画廊指纹占用）。

### 11. 定时触发放在 `blog-router`（实现期修正）

Nitro 的 `cloudflare_module` preset 只生成 `export default { fetch }`，没有 `scheduled` 导出；`nitro.scheduledTasks` 只声明任务，不会把 Cron 事件接上。因此 Cron 挂在已有的 `blog-router` 上：`scheduled` → `ctx.waitUntil()` → 通过现有 `BLOG_API` service binding 调 `POST /api/steam/sync`，用 `STEAM_SYNC_TOKEN` 头做鉴权。

- 理由：不引入第二个 Worker、不改 Nitro 产物、复用既有绑定与路由。
- 备选：自建 wrapper 入口包装 Nitro 产物（要改构建脚本，升级易碎）；备选：只用「访问触发」的惰性同步（无人访问就永远不同步）。
- 代价：`blog-api` 多一个只能由 token 调用的内部端点；`wrangler.toml` 的 cron 也因此不在 `nuxt-admin` 里。

## Risks / Trade-offs

- **隐私开关被改** → 用「空响应 ≠ 有效快照」判定，标记 `privacy_blocked`，页面给解释而不是 0。
- **429 / 5xx** → 整轮失败即停，保留上次成功快照，指数退避到下一轮；页面显示 stale 而不是报错。
- **Free 计划 50 次子请求上限** → 单轮预算 40，成就滚动，超预算即 `partial`。
- **成就接口对部分游戏报错** → 单款失败不影响整轮，保留旧成就并标记未同步。
- **商店接口未公开** → 只当可选增强，失败静默降级为渐变占位。
- **D1 行数增长** → 成就只在候选池内同步，`is_visible=0` 的行定期清理（保留 90 天）。
- **两周长时长会滚动覆盖** → 本期不做趋势图；若以后要做，需要每轮追加一条历史记录，属于后续变更。

## Migration / Rollback

发布顺序：`0007` 迁移 → 配置 `STEAM_API_KEY` → 部署 `blog-api`（含 cron）→ 部署 Admin Pages（同步卡片）→ 部署公开站（`/games`）。

回滚：删除 `wrangler.toml` 的 cron 段并重新部署 `blog-api`，页面即停止更新；`/games` 路由可随公开站回滚消失；新增表可保留（不影响既有功能）。手动同步入口与同步逻辑解耦，可在不改表的情况下关闭。

## Open Questions

- 时长榜默认 Top 6 还是 Top 8（当前设计稿按半宽两列排布，取 6；移动端一屏高度实现时再定）。
- 成就是否要展示「最近解锁」时间线（需要额外按 `unlocked_at` 排序的查询，本期先只做稀有度 Top 3）。
- 是否需要 `/games/:appid` 详情页承接「游戏评测」文章（本期不做，留接口字段）。
- 后台在第一版用「上移/下移」按钮，拖拽排序是否值得作为后续增强（触屏与键盘成本较高）。
- `review-quote` 展柜要不要自动拉取站内「游戏评测」文章的摘要（涉及文章 API 的复用，本期先留占位）。

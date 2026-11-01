## Why

博客已经有「游戏评测」分类和游戏截图画廊，但游玩数据全靠手写：时长、最近在玩、成就进度没有可信来源，也无法长期维护。Steam Web API 能稳定提供个人库、游玩时长、成就与商店元数据，把这份数据固化成定时快照，可以让「游戏」这条内容线拥有可自动更新、可追溯的数据底座。

本次只接 Steam，不包含 Nintendo Switch 2 数据（任天堂无公开 API，非官方链路存在账号风险，明确排除）。

## What Changes

- 新增 Steam 快照同步：`blog-router` 的 Cron Trigger 经 service binding 触发 `blog-api`，抓取个人库、最近游玩、成就、愿望单与档案，规范化后写入 D1；每轮受调用预算约束，失败不覆盖上一次成功快照。
- 新增后台手动刷新：内容工作台展示最近同步时间、状态与错误摘要，并支持受会话保护的「立即同步」。
- 新增公开只读接口 `/api/steam/overview`：只输出白名单字段（不含 SteamID、好友、地区），带边缘缓存头。
- 公开站新增 `/games` 页面（静态壳 + 客户端读取快照）：以 **Steam 个人资料式展柜**组织内容——最爱游戏、游戏收藏家、最近在玩、时长榜、完美通关、最稀有成就、愿望单，顺序与宽度由后台配置。
- 新增后台「展柜管理器」：仿 Steam 展柜槽位，可增删展柜、上下移、开关显示、配置数量与内容，整表原子保存。
- 新增 `STEAM_API_KEY` Worker Secret、`0007` D1 迁移与部署文档更新；导航加入「游戏」入口。
- 隐私不可用（资料私密、接口返回空）时按「未配置」处理并给出明确说明，不展示陈旧数据冒充实时数据。

## Capabilities

### New Capabilities
- `steam-library-sync`: 定时抓取、规范化存储、调用预算、隐私探测与失败降级、后台手动刷新。
- `steam-gaming-page`: `/games` 页面的数据契约、展柜网格布局、加载/空/错误态、响应式与可访问性。
- `steam-showcase-manager`: 展柜配置的存储与校验、默认配置、公开投影组装、后台管理交互。

### Modified Capabilities

无。不改动 `game-screenshot-gallery` 的展示逻辑，也不改动文章分类与归档行为。

## Impact

- `nuxt-admin/`：新增 `server/routes/api/steam/overview.get.ts`、`server/routes/admin/api/steam/sync.post.ts`、`server/routes/admin/api/steam/showcases.get.ts|put.ts`、`server/domain/steam/*`、`server/utils/steam*.ts`、`migrations/0007_steam_snapshots.sql`、内容工作台入口卡片与展柜管理器页面。
- `nuxt-public/`：新增 `app/pages/games.vue`、`app/features/steam-gaming/*`（含按展柜类型拆分的组件）、`shared/api/endpoints.ts` 条目、导航入口、`prerender:routes` 注册，样式按 desktop/mobile 拆分。
- `cloudflare-worker/`：无改动，`/api/*` 已转发至 `blog-api`。
- 依赖与配置：不新增运行时依赖（只用 `fetch`；后台排序用按钮而非拖拽库）；新增 Secret `STEAM_API_KEY`、`STEAM_SYNC_TOKEN` 与变量 `STEAM_ID`；`cloudflare-worker/` 增加 `scheduled` 与 cron triggers；新增 D1 表 7 张。
- 风险：Steam 隐私开关可能被改动、Web API 限流（429）、成就接口对部分游戏不可用；页面为客户端取数，首屏需要静态摘要兜底。


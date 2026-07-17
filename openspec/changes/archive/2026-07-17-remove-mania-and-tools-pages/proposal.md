# 删除 mania 与 tools 公开页面

## Why

`nuxt/`（SSR 后台站）当前仍承载两个公开业务页面：`/tools`（工具箱，6 个 vue：markdown-converter、image-processor、base64-converter、password-generator、text-diff、index）与 `/mania`（osu!mania 音游：谱面列表 + 难度页 + KeyBindingModal 组件）。这两个产品线已不在用户维护计划中（`nuxt/` 的目标已收敛为 admin-only 后台，公开页全部由 `nuxt-public/` 静态站承载）。

两个进行中的 change（`nuxt-ssr-tailwind-v4-upgrade` 与 `nuxt-ssr-nuxt-ui-v4-migration`）的"附录：范围决策"都把 `pages/tools/` 与 `pages/mania/` 列为**本次不处理、留待后续清理**的项：

> 删除公开页 `pages/`（`tools/`、`mania/[id].vue`）

本次 change 即执行这个被推迟的清理，让 `nuxt/` 的范围与"admin-only"定位一致；并同步移除跨项目导航、Worker 路由、CI/CD 注释、文档与 `.memory` 中的相关引用。

**用户决策（2026-07-17 确认）**：

- 后端 Beatmap API（`BeatmapsController`、7 个 BeatmapService、`Models/BeatmapSet`/`BeatmapDifficulty`、DbContext 实体）**保留**——避免误删历史数据与未来可能复用，仅前端页面删除。
- 导航外链（`nuxt-public` 顶部「工具箱」「音游」菜单）**全部删除**——不留死链。
- 配置/注释/文档/记忆**同步更新**——保持配置与实际路由一致。

## What Changes

### 删除（Frontend SSR 页面与组件）

- `nuxt/app/pages/tools/index.vue`
- `nuxt/app/pages/tools/markdown-converter.vue`
- `nuxt/app/pages/tools/image-processor.vue`
- `nuxt/app/pages/tools/base64-converter.vue`
- `nuxt/app/pages/tools/password-generator.vue`
- `nuxt/app/pages/tools/text-diff.vue`
- `nuxt/app/pages/mania/index.vue`
- `nuxt/app/pages/mania/[id].vue`
- `nuxt/app/components/mania/KeyBindingModal.vue`（整个 `components/mania/` 目录）
- `nuxt/app/pages/admin/beatmaps/index.vue`（admin 谱面管理——无 `/mania/{id}` 跳转后失去意义）
- `nuxt/app/pages/admin/index.vue` 第 153 行（dashboard 入口「谱面管理」按钮）
- `nuxt/app/layouts/admin.vue` 第 95 行（侧边栏「谱面管理」项）

### 删除（共享组件，仅当 nuxt 中无其他使用方时）

- `nuxt/app/components/ImageProcessor.vue`（被 `pages/tools/image-processor.vue` 引用，删除该页后整组件失用）
- `nuxt/app/components/MarkdownConverter.vue`（同上，被 `pages/tools/markdown-converter.vue` 引用）
- 保留 `MarkdownRenderer.vue`（被 `article-detail` 等使用）
- 保留 `MdEditorWrapper.client.vue`（admin 文章编辑器使用）
- 保留 `CommentSection.vue` / `SideBar.vue` / `WelcomeSection.vue` / `SkeletonLoader.vue` / `LoadingBar.vue` / `LoadingSpinner.vue` / `GalleryLoadingAnimation.vue` / `IconMarquee.vue`（仍被其他页面使用）

### 修改（前端引用清理）

- `nuxt/app/layouts/default.vue`：
  - 移除第 22 行 `<NuxtLink to="/tools">` 与第 39 行 `<NuxtLink to="/mania">` 菜单
  - 移除 `mobileMenuOptions` 数组中第 257-260、271-275 行（工具箱、音游项）
  - 移除 `localRoutes` 映射（`tools`、`mania` 键）
  - 移除 `isToolsRoute`、`isManiaRoute` 计算属性
  - 简化 `showSidebar` 计算属性（移除 `!isToolsRoute.value && !isManiaRoute.value`）
- `nuxt-public/app/layouts/default.vue`：
  - 移除第 23 行 `<a href="/tools">` 顶部导航
  - 移除第 40 行 `<a href="/mania">`「其他」下拉项
  - 移除第 84 行 `<a href="/tools">` 移动端抽屉项
  - 移除第 90 行 `<a href="/mania">` 移动端抽屉项

### 修改（路由分发与部署配置）

- `cloudflare-worker/router.js` 第 14 行 `SERVER_ROUTES` 移除 `'/tools'` 与 `'/mania'`（Worker 不再转发这两个前缀，请求落到 Cloudflare Pages → 404）
- `nuxt/NuxtNginx.txt`：
  - 顶部注释 `/admin/*, /tools/*, /mania/*` → `/admin/*`
  - 157 行注释 `Worker 只会转发 /admin/*, /tools/*, /mania/*` → `Worker 只会转发 /admin/*`
- `.github/workflows/release.yml`：
  - 第 27 行注释 `/admin, /tools, /mania` → `/admin`
  - 第 83 行 release notes 路由描述 `/admin/*, /tools/*, /mania/*` → `/admin/*`
  - 第 95 行 release notes 动态页描述「后台/工具箱/音游」→「后台」

### 修改（文档与记忆）

- `README.md`：架构总览与跨项目导航章节移除 `/tools`、`/mania` 引用
- `docs/Hybrid-Architecture.md`：移除相关章节
- `docs/CloudflarePages-Deploy-Guide.md`：移除相关引用
- `.memory/memory.md`：当前架构索引移除 `/tools`、`/mania`
- `.memory/progress/current.md`：本 change 完成后追加条目「删除 mania/tools 公开页」

### 不删除（用户决策 1）

- **后端**：`backend-dotnet/BlogApi/Controllers/BeatmapsController.cs`、`Services/BeatmapService.cs`、`Services/Beatmaps/*`（7 个文件）、`Models/BeatmapSet.cs`、`Models/BeatmapDifficulty.cs`、`DTOs/BeatmapDto.cs`、`DTOs/BeatmapImportDto.cs`、`Data/BlogDbContext.cs` 第 20-21、142-174 行
- **SQLite 表**：`BeatmapSets` / `BeatmapDifficulties` 数据保留
- 理由：后端 API 仍可独立运行（admin 端可用 API 直接 CRUD，公众端通过 404 路由拦截）；未来如要复活 `/mania` 页面，代码可零成本还原。

## Capabilities

### Removed Capabilities

- `mania-public-pages`: osu!mania 音游公开页（谱面列表 + 难度播放页 + KeyBindingModal）
- `tools-public-pages`: 工具箱（6 个工具页面 + 索引页）

## Impact

- **破坏性**：访问 `wasd09090030.top/tools` 与 `wasd09090030.top/mania`（及其子路径）将返回 404（Cloudflare Pages 处理）。Worker 已不再转发到云服务器 SSR。
- **影响面**：约 17 个文件删除、6 个文件修改、5 个文档/记忆文件修改。
- **不涉及**：Tailwind v4 升级、Naive UI → Nuxt UI v4 迁移（这两个 change 独立推进；`admin/beatmaps/index.vue` 已被本 change 删除，下游 Nuxt UI 迁移 task 3.6 自动失效）。
- **CI/CD**：release.yml 注释更新，构建逻辑本身不变。
- **数据**：SQLite 数据库表结构不变，BeatmapSets / BeatmapDifficulties 历史数据保留。
- **本地键位设置**：用户 `localStorage` 中的 `mania-keybindings` 残留数据无害（不读取即可）；不在本 change 范围做主动清理。

## 执行顺序建议

1. 先应用本 change（删除公开页、清理引用）
2. 再应用 `nuxt-ssr-nuxt-ui-v4-migration`（其 task 3.6 `admin/beatmaps/index.vue` 已被本 change 删除，任务清单需调整）
3. 最后应用 `nuxt-ssr-tailwind-v4-upgrade`（admin-only 升级，与本 change 无冲突）

如需调整顺序，可在本 change 末尾追加 "下游 change 任务调整" 任务。

# mania 公开页（osu!mania 音游）— REMOVED 规格增量

> **状态**: 2026-07-17 由 `remove-mania-and-tools-pages` change 引入并完成。
> 本 spec 在 apply 前定义"此能力 SHALL NOT 存在"的契约；apply 后归档至 `openspec/specs/archive/`。

## REMOVED Requirements

### Requirement: mania 公开路由 SHALL NOT 存在

`nuxt/` SSR 后台站 SHALL **NOT** 包含以下页面文件，且 `wasd09090030.top/mania` 与 `wasd09090030.top/mania/*` 路径 SHALL 返回 HTTP 404（由 Cloudflare Pages 在 SSR 不再处理的情况下处理）：

- `nuxt/app/pages/mania/index.vue`（谱面列表页）
- `nuxt/app/pages/mania/[id].vue`（单谱面难度播放页）

#### Scenario: 公开路由文件不存在

- **WHEN** 检查 `nuxt/app/pages/`
- **THEN** 该目录 SHALL NOT 包含 `mania/` 子目录

#### Scenario: HTTP 404 行为

- **WHEN** 浏览器访问 `wasd09090030.top/mania` 或 `wasd09090030.top/mania/{id}`
- **THEN** 响应 SHALL 为 HTTP 404（由 Cloudflare Pages 处理，因 Worker 已不转发）

### Requirement: mania 游戏引擎组件 SHALL NOT 存在

`nuxt/` SHALL **NOT** 包含 `nuxt/app/components/mania/` 目录下的任何文件（包括但不限于 `KeyBindingModal.vue`、`ManiaGame.vue`、`ManiaGameTextured.vue`、`NotePlane.ts`、`GameResultModal.vue`）。任何依赖 KeyBinding 状态（`localStorage` 键 `mania-keybindings`）的前端模块 SHALL NOT 存在。

#### Scenario: 组件目录不存在

- **WHEN** 检查 `nuxt/app/components/mania/`
- **THEN** 该目录 SHALL NOT 存在

#### Scenario: localStorage 键不读取

- **WHEN** 浏览器加载 `nuxt/` 任意页面
- **THEN** 客户端代码 SHALL NOT 读取 `localStorage.getItem('mania-keybindings')`（代码已删除）

### Requirement: 导航 SHALL NOT 引用 mania 入口

前端 layout 布局 SHALL NOT 包含指向 `/mania` 的导航项：

- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `<NuxtLink to="/mania">`、`<a href="/mania">` 或 `key: 'mania'` 等引用
- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `isManiaRoute` 计算属性
- `nuxt/app/layouts/default.vue` 的 `mobileMenuOptions` SHALL NOT 包含「音游」菜单项
- `nuxt-public/app/layouts/default.vue` SHALL NOT 包含 `<a href="/mania">` 导航项（桌面端顶部与移动端抽屉均 SHALL NOT）

#### Scenario: nuxt 布局无 mania 引用

- **WHEN** 在 `nuxt/app/layouts/default.vue` 中 grep `mania`
- **THEN** 命中数 SHALL 为 0

#### Scenario: nuxt-public 布局无 mania 引用

- **WHEN** 在 `nuxt-public/app/layouts/default.vue` 中 grep `mania`
- **THEN** 命中数 SHALL 为 0

### Requirement: admin 入口 SHALL NOT 引用谱面管理

manic 公开页下线后，admin 谱面管理失去 `/mania/{id}` 跳转目标。`nuxt/` SHALL NOT 包含以下 admin 谱面管理入口：

- `nuxt/app/pages/admin/beatmaps/index.vue` SHALL NOT 存在
- `nuxt/app/pages/admin/index.vue` SHALL NOT 包含 `/admin/beatmaps` dashboard 入口按钮
- `nuxt/app/layouts/admin.vue` 的 `menuItems` 数组 SHALL NOT 包含 `path: '/admin/beatmaps'` 侧边栏项

#### Scenario: admin/beatmaps 目录不存在

- **WHEN** 检查 `nuxt/app/pages/admin/beatmaps/`
- **THEN** 该目录 SHALL NOT 存在

#### Scenario: admin 入口与侧边栏无 beatmaps 引用

- **WHEN** 在 `nuxt/app/pages/admin/index.vue` 与 `nuxt/app/layouts/admin.vue` 中 grep `beatmaps`
- **THEN** 命中数 SHALL 为 0

### Requirement: 路由分发 SHALL NOT 转发 /mania

部署配置 SHALL NOT 将 `/mania` 路径转发到云服务器 SSR：

- `cloudflare-worker/router.js` 的 `SERVER_ROUTES` 数组 SHALL NOT 包含 `'/mania'` 前缀
- `nuxt/NuxtNginx.txt` 注释 SHALL NOT 包含 `/mania` 路径示例
- `.github/workflows/release.yml` 注释与 release notes SHALL NOT 提及 `/mania` 路由

#### Scenario: Worker SERVER_ROUTES 配置

- **WHEN** 检查 `cloudflare-worker/router.js` 的 `SERVER_ROUTES` 常量
- **THEN** 该数组 SHALL NOT 包含字符串 `'/mania'`

#### Scenario: CI/CD 与部署文档无 mania 路径

- **WHEN** 在 `.github/workflows/release.yml` 与 `nuxt/NuxtNginx.txt` 中 grep `mania`
- **THEN** 命中数 SHALL 为 0

### Requirement: 后端 Beatmap API 不在本 spec 范围

> **明确划出范围**：本 spec 仅约束前端页面与用户可见入口。后端 `BeatmapsController`、`BeatmapService`、`Models/BeatmapSet`/`BeatmapDifficulty`、`BlogDbContext` 中 Beatmap 相关 DbSet **保留**（用户决策 2026-07-17），不在本 spec 禁止。
>
> 理由：后端 API 仍可独立运行，未来如要复活 `/mania` 页面可零成本还原；SQLite 表数据保留。

#### Scenario: 后端代码未删除

- **WHEN** 检查 `backend-dotnet/BlogApi/`
- **THEN** `Controllers/BeatmapsController.cs`、`Services/BeatmapService.cs`、`Services/Beatmaps/*`、`Models/BeatmapSet.cs`、`Models/BeatmapDifficulty.cs` 与 `Data/BlogDbContext.cs` 中的 Beatmap DbSet **均 SHALL 仍存在**

## 不变

- 浏览器 `localStorage` 中残留的 `mania-keybindings` 键无需主动清理（不影响其他功能）
- admin 用户可继续调用 `/api/beatmaps/*` 直接 CRUD 谱面数据（API 仍可用，仅无 UI 入口）

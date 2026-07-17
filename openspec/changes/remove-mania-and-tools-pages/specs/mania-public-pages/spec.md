# Spec: mania 公开页（osu!mania 音游）— REMOVED

> **状态**: 2026-07-17 由 `remove-mania-and-tools-pages` change 引入。
> 本 spec 在 apply 前定义"此能力 SHALL NOT 存在"的契约；apply 后归档至 `openspec/specs/archive/`。

## REMOVED Requirements

### 概览

`nuxt/`（SSR 后台站）SHALL **NOT** 承载任何 osu!mania 音游公开页面。所有 mania 相关用户可见入口 SHALL 不可访问或不存在。

### R-MANIA-1: 公开路由 SHALL NOT 存在（已迁移/移除）

`nuxt/` SHALL **NOT** 包含以下页面：

- `nuxt/app/pages/mania/index.vue`（谱面列表页）
- `nuxt/app/pages/mania/[id].vue`（单谱面难度播放页）

`wasd09090030.top/mania` 与 `wasd09090030.top/mania/*` 路径 SHALL 返回 HTTP 404（由 Cloudflare Pages 在 SSR 不再处理的情况下处理）。

### R-MANIA-2: 组件 SHALL NOT 存在

`nuxt/` SHALL **NOT** 包含：

- `nuxt/app/components/mania/` 目录（含 `KeyBindingModal.vue`）
- 任何依赖 KeyBinding 状态（`localStorage` 键 `mania-keybindings`）的前端模块

### R-MANIA-3: 导航 SHALL NOT 引用 mania 入口

- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `<NuxtLink to="/mania">`、`<a href="/mania">` 或 `key: 'mania'` 等引用
- `nuxt/app/layouts/default.vue` SHALL NOT 包含 `isManiaRoute` / `localRoutes` 中 `mania` 键
- `nuxt-public/app/layouts/default.vue` SHALL NOT 包含 `<a href="/mania">` 导航项

### R-MANIA-4: admin 入口 SHALL NOT 引用谱面管理

- `nuxt/app/pages/admin/beatmaps/` 目录 SHALL NOT 存在
- `nuxt/app/pages/admin/index.vue` SHALL NOT 包含 `/admin/beatmaps` 入口按钮
- `nuxt/app/layouts/admin.vue` SHALL NOT 包含 `path: '/admin/beatmaps'` 侧边栏项

### R-MANIA-5: 路由分发 SHALL NOT 转发 /mania

- `cloudflare-worker/router.js` 的 `SERVER_ROUTES` SHALL NOT 包含 `'/mania'` 前缀
- `nuxt/NuxtNginx.txt` 注释 SHALL NOT 包含 `/mania` 路径示例

### R-MANIA-6: 后端 Beatmap API 不在本 spec 范围

> ⚠️ **明确划出范围**：本 spec 仅约束前端页面与用户可见入口。后端 `BeatmapsController`、`BeatmapService`、`Models/BeatmapSet`/`BeatmapDifficulty`、`BlogDbContext` 中 Beatmap 相关 DbSet **保留**（用户决策 2026-07-17），不在本 spec 禁止。
>
> 理由：后端 API 仍可独立运行，未来如要复活 `/mania` 页面可零成本还原；SQLite 表数据保留。

## 不变

- 浏览器 `localStorage` 中残留的 `mania-keybindings` 键无需主动清理（不影响其他功能）
- admin 用户可继续调用 `/api/beatmaps/*` 直接 CRUD（无 UI 入口，但 API 可用）

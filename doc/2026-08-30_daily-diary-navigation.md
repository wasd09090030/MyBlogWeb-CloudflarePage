# Task Record: 每日日记独立导航与功能检查

## Date

- Local date: 2026-08-30 (UTC+8)

## Goal

- 将公开站的每日日记从归档内部功能提升为独立导航栏选项。
- 检查日记公开展示、筛选、管理后台和 API 链路是否正常。

## Agreed Design

- 导航文案统一为“每日日记”，链接到 `/archive/diary`。
- 桌面导航和移动端抽屉导航都增加该入口，并使用精确激活样式，避免与“归档”同时高亮。
- 归档页与日记页共享二级 Tab；日记页面继续使用已有的公开 API 和运行时数据加载。
- 日记 UI 的桌面、移动样式分别放在成对的 `.desktop.css` / `.mobile.css` 文件中。

## Stages

### Stage 1

- Scope: 公开站导航和归档页面入口。
- Changes: 增加 `/archive/diary` 导航、共享归档 Tab、归档布局路由识别和日记页面入口。
- Review result: 桌面、移动导航均包含入口；`exact-active-class` 与 NuxtLink 官方行为一致。

### Stage 2

- Scope: 日记数据与管理链路。
- Changes: 接入公开日记 API、公开站 composable、管理后台日记页面/API、领域逻辑及 D1 migration。
- Review result: 公开接口可访问，管理端请求保持同源 `/admin/api/*`；生产环境需确认已执行 migration `0005_diary_entries.sql`。

### Stage 3

- Scope: 样式规范、构建和最终回归。
- Changes: 将 `DiaryPageContainer.vue` 内联样式拆分至桌面与移动 CSS 文件，并重新生成静态站。
- Review result: 构建产出包含 `/archive/diary`；未发现新增构建错误或差异格式问题。

## Files Changed

- `nuxt-public/app/layouts/default.vue`: 增加桌面和移动“每日日记”导航入口。
- `nuxt-public/app/pages/archive.vue`: 接入归档二级导航。
- `nuxt-public/app/pages/archive/diary.vue`: 新增日记公开路由页面。
- `nuxt-public/app/shared/ui/ArchiveSectionTabs.vue`: 共享“文章归档 / 每日日记”二级 Tab。
- `nuxt-public/app/features/diary/`: 公开站日记容器和数据 composable。
- `nuxt-public/app/assets/css/components/ArchiveSectionTabs.*.css`: 归档 Tab 响应式样式。
- `nuxt-public/app/assets/css/components/DiaryPageContainer.*.css`: 日记容器桌面、移动样式。
- `nuxt-public/app/shared/api/endpoints.ts`: 日记公开 API endpoint 定义。
- `nuxt-public/nuxt.config.ts`: 预加载日记导航图标。
- `nuxt-admin/app/layouts/admin.vue`: 增加后台日记入口。
- `nuxt-admin/app/pages/admin/diary/index.vue`: 日记管理页面。
- `nuxt-admin/app/types/admin.ts`: 日记管理类型。
- `nuxt-admin/server/routes/admin/api/[...path].ts`: 管理日记 API 分发。
- `nuxt-admin/server/routes/api/diary/index.get.ts`: 公开日记 API。
- `nuxt-admin/server/domain/diary.ts`: 日记领域查询、保存和删除逻辑。
- `nuxt-admin/migrations/0005_diary_entries.sql`: `diary_entries` 表和索引。

## Sources Checked

- Context7:
  - Library `/websites/nuxt_4_x`，查询 Nuxt 4 `NuxtLink` 的 `exact-active-class` 支持，2026-08-30。
  - 官方来源：https://nuxt.com/docs/4.x/api/components/nuxt-link
- Fetch:
  - 本轮未额外使用 fetch；NuxtLink 行为已由 Context7 官方文档覆盖。

## Validation

- `nuxt-public`: `npm run generate` 通过，Nuxt 4.3.1 完成客户端、SSR 和静态预渲染。
- 静态产物检查通过：`.output/public/archive.html` 和 `.output/public/archive/diary.html` 均存在；日记页包含“每日日记”，归档页包含 `/archive/diary` 链接。
- `nuxt-public`: `npm run lint:icons` 通过，检查 80 个图标引用。
- `git diff --check` 通过。
- 线上只读检查：`https://wasd09090030.top/archive/diary` 返回 `200`；`https://wasd09090030.top/api/diary` 返回 `200 []`。
- 构建期间存在项目既有 link-checker 无障碍 warning（空链接文本），未产生 error，且不由本次日记导航改动引入。

## Risks and Follow-Up

- 当前公开 API 返回空数组，表示生产库暂无公开日记记录，不是接口故障。
- 部署管理后台前必须确认 Cloudflare D1 已执行 `nuxt-admin/migrations/0005_diary_entries.sql`，否则保存日记时表可能不存在。
- Nuxt 静态生成期间的既有 link-checker warning 可另行治理，本次不扩大范围。

# Design: nuxt-public UI 库迁移

> **状态**: ✅ **已实施完成**（2026-07-13）— 5 阶段渐进式迁移全部走完，Phase 8 修复了 ArticlePagination 的 prop 语义误用。详见各 Phase 段。

## Context

> 以下 Context 段记录**迁移前**的现状，作为历史背景。实际落地后的当前状态：见 `tasks.md` 各 `[x]` 勾选项与本文件后续 Phase 段记录。

- **运行栈**：Nuxt 4.3 + Vue 3.4 + Tailwind CSS v4（已升级）+ Nitro `preset: 'static'` 部署到 Cloudflare Pages。
- **原组件库（迁移前）**：NaiveUI（vue 组件），通过 `@bg-dev/nuxt-naiveui` 模块注入全局 API（如 `useMessage`、`useLoadingBar`）。
- **现组件库（迁移后）**：Nuxt UI v3，搭配 `@nuxtjs/color-mode` 提供亮暗主题；主题 token 通过 `app.config.ts` 的 `ui.colors` 与 `app/assets/css/main.css` 的 Tailwind v4 `@theme` 块双重注入。
- **NaiveUI 真实使用面**（迁移前已 grep 摸排，作为决策依据）：
  - 全局入口：`app/layouts/default.vue`（`<n-config-provider :theme-overrides>` + `<n-message-provider>`）、`app/layouts/blank.vue`（`<n-message-provider>`）、`app.vue`（无 provider，但有 NuxtLoadingIndicator）。
  - 叶子组件：`MarkdownRenderer.vue`、`LoadingSpinner.vue`、`StateLoading.vue`、`GalleryLoadingAnimation.vue`、`LinkCard.vue`、`Steps.vue`、`StarRating.vue`、`RelatedArticles.vue`、`CodePlayground.vue`、`SearchBar.vue`、`CommentSection.vue`。
  - 容器组件：`ArticleDetailPageContainer.vue`、`ArticleListPageContainer.vue`、`ArchivePageContainer.vue`、`ArticlePagination.vue`。
  - Detail 子组件：`Content.vue`、`Header.vue`、`Toc.vue`。
  - 死代码：`LoadingBar.vue`（grep 全 `app/` 无任何引用，仅自身引用）。
- **命令式 API 强耦合**：`CommentSection.vue` 调用 `useMessage().success/warning/error` 共 4 处。
- **暗色模式**：`app/composables/useTheme.ts` 已使用 Nuxt `useState` 管理 `isDarkMode`，并在 `<html>` 上同步 `.dark` class（同时保留 legacy `.dark-theme`/`.light-theme`/`data-theme`）。Nuxt UI 官方机制就是 `.dark` class（来源：`ui.nuxt.com` Theme / CSS Variables 文档），可零成本对接。
- **darkTheme 与 themeOverrides**：来自 `default.vue` 的 `<n-config-provider :theme="darkTheme">` 与 `themeOverrides` 计算属性，覆盖 `common.primaryColor` (`#0d6efd`) 和 `Dropdown.borderRadius` (`12px`)。迁移目标：在 `app.config.ts` 用 `ui.colors.primary = 'blue'` 等价映射，圆角用 `@theme` 覆盖 `--radius`。

## Goals / Non-Goals

**Goals**

1. `nuxt-public/` 依赖中**不再**包含 `naive-ui` 或 `@bg-dev/nuxt-naiveui`。
2. 所有 NaiveUI 组件实例替换为 Nuxt UI v3 对应组件；无 `<n-xxx>` 残留。
3. 主题系统从 `<n-config-provider :theme-overrides>` 迁移到 `app.config.ts` + Tailwind v4 `@theme`。
4. dark mode 实现统一使用 `<html class="dark">`（保留现有 `useTheme`，废弃 legacy 多 class 标记）。
5. 评论表单使用 `valibot` schema 校验。
6. `nuxt.config.ts` 中所有 naiveui 相关配置一并清理。
7. 5 阶段渐进式落地，每阶段独立可 build & 手动回归。

**Non-Goals**

- 不迁移 `nuxt/`（SSR）项目；保持 NaiveUI 作为已知技术债。
- 不引入新功能、不重做视觉（保留现有配色与间距，仅做 1:1 替换）。
- 不重写 `useTheme.ts` 的状态管理逻辑（仅清理 legacy class 标记）。
- 不动后端 / CI/CD / Cloudflare Worker / 路由分发。
- 不清理全站 `.dark-theme` / `.light-theme` legacy class（`default.vue` 内部替换为 `.dark` 即可；其他文件留待独立 change）。

## Decisions

1. **Nuxt UI v3（非 v4 alpha）**：v4 仍在 alpha，要求 Nuxt 4 完美对齐；v3 已稳定且与项目栈完全兼容。来源：Context7 `/llmstxt/ui_nuxt_llms-full_txt` 与官方 `ui.nuxt.com` 文档。
2. **`UApp` 放在 `app.vue`**：官方推荐 root 模板写法，且 Toast/Tooltip/Programmatic Overlay 依赖其注入。`default.vue` 与 `blank.vue` 不再包裹 provider。
3. **保留 `useTheme` 不重写**：现有逻辑已经把 `.dark` 同步到 `<html>`，与 Nuxt UI 官方机制一致；只删除 `applyTheme` 中的 `dark-theme` / `light-theme` / `data-theme` / `colorScheme` 四处副作用（`colorScheme` 保留以便浏览器原生 UI 适配）。消费点（`default.vue` + `GalleryLoadingAnimation.vue`）不变。
4. **主题色映射到 `ui.colors`**：原 `primaryColor: #0d6efd`（蓝）→ `ui.colors.primary = 'blue'`；`primaryColorHover/Pressed` 由 Nuxt UI 默认色阶自动处理（hover=400，active=600）。`Dropdown.borderRadius` 迁移到 `@theme` 覆盖 `--radius`。
5. **`useToast` 替代 `useMessage`**：API 形态相似（`add()` 接收 `title/description/color`），但 Nuxt UI 用 `color: 'success'` 而非 NaiveUI 的 `type: 'success'`。CommentSection 中 4 处调用点改造。
6. **valibot schema 替代 rules 对象**：`<UForm :schema :state>` + `<UFormField name>` 通过 `name` 自动匹配错误。等价映射：`{ required: true, message, trigger: 'blur-sm' }` → `v.pipe(v.string(), v.minLength(1, message))` + `validate-on="blur"`。
7. **`UPagination` 保持组件 emit API 不变**：`ArticlePagination.vue` 对外仍 emit `update:page`，内部把 `:page :page-count` 改为 `v-model:page :total :sibling-count`。**不引入 `:to` 函数**，路由同步仍由父容器 `ArticleListPageContainer.vue` 的 `goToPage` / `syncPageFromQuery` 完成（避免过度重构）。
8. **`StarRating` 自实现**：在 `app/shared/ui/StarRating.vue` 创建独立组件，内部用 `UButton` + lucide star icon，支持只读（展示）与可交互两种模式。Nuxt UI 无评分组件，参照"约定俗成"的实现模式。
9. **`LoadingBar.vue` 直接删除**：经 grep 全 `app/` 确认无任何 layout/page/component 引用，仅自身引用。是孤儿死代码。`app.vue` 已有 `<NuxtLoadingIndicator>`（Nuxt 内建）承担进度条职责。
10. **`manualChunks` 调整**：删除 `if (id.includes('node_modules/naive-ui'))` 分支；新增 `if (id.includes('node_modules/@nuxt/ui'))` 归入 `vendor-ui`（保留 chunk 名避免监控基线漂移）。
11. **`inlineSSRStyles: false` 保留**：`tailwind-v4-upgrade` 已验证必须关闭以保 CSS layer 语义正确，本次不动。
12. **Naive UI 的 `n-space` 直接删除**：Nuxt UI 不需要间距组件，直接用 Tailwind `flex gap-*`。多处源码可同步精简。

## Risks / Trade-offs

- **[R1 视觉回退]** 颜色 token 重新映射可能产生色差。**缓解**：Phase 4 后逐页对比；如发现显著差异，按页面记录差异点（而非全局回滚），用 Nuxt UI 的 `:ui` prop 微调覆盖。
- **[R2 dark mode 闪烁]** 切换瞬间 NaiveUI 残留 class（如 `.dark-theme`）与 `.dark` 选择器叠加可能闪烁。**缓解**：Phase 4 内同步将 `default.vue` 中 `:global(.dark-theme)` 改为 `:global(.dark)`，最大化一致性。
- **[R3 表单校验语义]** valibot schema 的 trigger 时机与原 `rules` 不完全等价。**缓解**：设置 `<UForm validate-on="blur">` 保留原 blur 触发时机；CommentSection 是单文件改造集中可控。
- **[R4 分页 URL 行为]** `UPagination` 的 `:to` 函数若误启用会改变 URL 生成方式。**缓解**：组件内部明确**不传** `:to`，所有路由同步逻辑仍在父容器。
- **[R5 构建体积]** `vendor-ui` chunk 改名可能影响缓存命中率。**缓解**：chunk 名仍用 `vendor-ui`（只在分支判定里换 id 匹配），缓存键稳定。
- **[R6 UApp 嵌套]** layout 不能再有 provider。**缓解**：Phase 4 一次性删除所有 layout 内 provider。
- **[R7 SSG 与 Toast]** `useToast` 官方未明文 SSG 行为（来源：Context7 调研）。**缓解**：所有 toast 调用都在事件回调内（按钮点击、表单提交），天然 client-side；无需 `<ClientOnly>` 包裹。
- **[R8 评论表单 client-only]** Nuxt UI 的表单校验依赖 schema 计算，SSG 阶段不会执行（仅渲染空表单）。**缓解**：当前评论表单本就 `onMounted` 才加载数据，行为无变化。
- **[回滚]** 单分支工作区内 `git restore` 即可；无数据/接口/CI 变更。

## Migration Plan

### Phase 0：预研与并行安装（0.5 天）

1. 创建 `feature/nuxt-ui-migration` 分支。
2. `npm install @nuxt/ui valibot`（peer deps 检查）。
3. 创建 `app/app.config.ts`，写入 `ui.colors` 基础映射。
4. 创建 `app/assets/css/main.css`，加入 `@import "tailwindcss";` + `@import "@nuxt/ui";` + `@theme` 块（先放占位 token）。
5. 在 `nuxt.config.ts` 的 `css: []` 加入 `~/assets/css/main.css`，`modules` 加入 `'@nuxt/ui'`。
6. **不删除** naiveui 相关配置 —— 本阶段目标是不破坏现有 build（NaiveUI 与 Nuxt UI 共存）。

### Phase 1：叶子组件（1.5 天）

按依赖深度从浅到深：
- `MarkdownRenderer.vue`（n-alert / n-empty）
- `LoadingSpinner.vue`、`StateLoading.vue`、`GalleryLoadingAnimation.vue`（n-spin / n-progress）
- `LinkCard.vue`、`Steps.vue`、`RelatedArticles.vue`（n-button / n-steps / n-space）
- `StarRating.vue` → 创建自实现 `app/shared/ui/StarRating.vue`，删除原文件
- `CodePlayground.vue`（n-card / n-space / n-tag / n-button）
- `SearchBar.vue`（n-modal / n-input / n-tag / n-button）

每文件改完单独 `npm run dev` 验证页面渲染。

### Phase 2：容器组件 + 表单（2 天）

- 安装 valibot（如 Phase 0 未装）
- `CommentSection.vue`（核心表单）：n-form / n-form-item / n-input / n-button / n-alert / n-spin / n-avatar / useMessage 全部替换
- `ArticlePagination.vue`：n-pagination → UPagination（保持 emit API）
- `ArticleListPageContainer.vue`：n-alert / n-empty / n-spin / n-button + 接入 UPagination 验证
- `ArticleDetailPageContainer.vue`：n-alert / n-empty / n-spin / n-button
- `ArchivePageContainer.vue`：n-alert / n-empty

### Phase 3：Article Detail 子组件（0.5 天）

- `Content.vue`：n-button → UButton
- `Header.vue`：n-tag / n-button → UBadge / UButton
- `Toc.vue`：n-tooltip → UTooltip

### Phase 4：全局 provider + 主题重构（1.5 天）

- `app/app.vue`：根模板加 `<UApp>` 包裹
- `default.vue`：删除 `<n-config-provider>` + `<n-message-provider>`；`themeOverrides` 计算属性删除；`<script setup>` 移除 `import { darkTheme } from 'naive-ui'`；scoped CSS 内 `:global(.dark-theme)` → `:global(.dark)`
- `blank.vue`：删除 `<n-message-provider>`；移除 `import { NMessageProvider } from 'naive-ui'`（即便未使用，也清理）
- `useTheme.ts`：删除 `dark-theme` / `light-theme` / `data-theme` 三处同步，保留 `colorScheme`
- `app.config.ts`：补全 `ui.colors`（primary=blue 等）+ `ui.theme.defaultVariants`（按需）
- `main.css`：`@theme` 块补全 radius、spacing 等设计 token
- 验证：所有页面 dark/light 切换 + 视觉对比

### Phase 5：清理验收（1 天）

- `nuxt.config.ts`：删除 `naiveui` 配置块；`build.transpile` 删除 `'naive-ui'`；`vite.optimizeDeps.include` 删除 `'naive-ui'`；`manualChunks` 内 naiveui 分支替换为 `@nuxt/ui`
- 删除 `app/components/LoadingBar.vue`
- `package.json`：移除 `naive-ui`、`@bg-dev/nuxt-naiveui`
- 全站视觉回归（桌面 + 移动）
- `npm run generate` 构建通过
- 产物体积对比：监控 `vendor-ui` chunk 与总和变化

## Open Questions

- 是否有页面/组件当前依赖 `<html class="dark-theme">` 触发的样式？grep `app/` 全面排查后填入 Phase 4 验收清单。
- Nuxt UI 的 `Toast` 默认 duration 是否需要按页面调优？默认 5s 是否过长待定。
- 自实现 `StarRating` 是否需要支持键盘交互？仅只读展示还是可点击？由 Phase 1 实现时确认（如未指定，默认只读）。
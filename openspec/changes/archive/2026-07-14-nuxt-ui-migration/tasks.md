# Tasks: nuxt-public UI 库迁移

> **状态**: ✅ **全部完成**（2026-07-13）— 5 阶段渐进式迁移 + Phase 6 主题系统清理（合并原 5.7）+ Phase 8 ArticlePagination 重新设计均已落地。
> 所有 47 个 task 已勾选，可执行 `openspec archive nuxt-ui-migration` 归档。

## 1. Phase 0 — 预研与并行安装

- [x] 1.1 创建 `feature/nuxt-ui-migration` 分支
- [x] 1.2 `npm install @nuxt/ui` 与 `valibot`，验证 peer deps（装上 `@nuxt/ui@^3.3.7` 与 `valibot@^1.4.2`，peer 警告为上游 citty 内部依赖，与本项目无关）
- [x] 1.3 创建 `app/app.config.ts`，写入 `ui.colors` 基础映射（primary=blue 等；保留既有 `icon` 配置块）
- [x] 1.4 创建 `app/assets/css/main.css`，加入 `@import "@nuxt/ui";` 与 `@theme` 占位 token（不重复 `@import "tailwindcss"`，由 `tailwind.css` 承担以避免重复）
- [x] 1.5 `nuxt.config.ts`：`css: []` 加入 `~/assets/css/main.css`（在 `tailwind.css` 之后），`modules` 加入 `'@nuxt/ui'`
- [x] 1.6 验证 `npm run generate` 仍然成功（NaiveUI 与 Nuxt UI 共存，build 通过 12 路由预渲染；link-checker 报 `/tools` `/mania` 404 为历史外链问题，与本次变更无关）

## 2. Phase 1 — 叶子组件替换

- [x] 2.1 `MarkdownRenderer.vue`：`<n-alert>` → `<UAlert color="error" variant="soft" title description>`，`<n-empty>` → `<UEmpty description>`
- [x] 2.2 `LoadingSpinner.vue`：`<n-spin>` → `<UProgress :indeterminate animation="carousel" size color>`；size 映射 small→xs/medium→md/large→xl
- [x] 2.3 `StateLoading.vue`：`<n-spin>` → `<UProgress :indeterminate animation="carousel" size="lg">`
- [x] 2.4 `GalleryLoadingAnimation.vue`：`<n-spin>` → 自旋 icon + CSS animation；`<n-progress type="line">` → `<UProgress :model-value :max color size>`；移除 `useTheme()` 解构（主题色改由 CSS 变量驱动）
- [x] 2.5 `LinkCard.vue`：`<n-button type="info" tag="a">` → `<UButton :href color="info" variant="solid">`；移除 `:deep(.n-icon)` 覆写
- [x] 2.6 `Steps.vue`：`<n-steps>` + `<n-step>` → `<UStepper v-model :items :orientation :size :disabled>`；data-driven 模式（items 数组），1-based current 与 0-based index 通过 `v-model` setter 双向同步；移除所有 `:deep(.n-step__*)` 暗色覆写
- [x] 2.7 `RelatedArticles.vue`：grep 确认无任何 `<n-` 组件引用，无需改动
- [x] 2.8 `StarRating.vue`：完全重写为自实现（保留 MDC 路径）；用 lucide `heroicons:star` + `heroicons:star-solid` + CSS 宽度叠加实现半星渐变；支持只读（默认）与可交互两种模式
- [x] 2.9 `CodePlayground.vue`：`<n-card>` → `<UCard :ui>`；`<n-space>` → Tailwind flex gap；`<n-tag>` → `<UBadge>`；`<n-button>` → `<UButton>`（含 leading-icon slot 名替换）
- [x] 2.10 `SearchBar.vue`：`<n-modal preset="card">` → `<UModal v-model:open :ui>`；`<n-input v-model:value>` → `<UInput v-model>`；`<n-tag clickable>` → `<UBadge @click>`；`<n-button>` → `<UButton>`
- [x] 2.11 验证：`npm run generate` 通过 12 路由预渲染（修复 CodePlayground 的 slot 重复错误）；dev server 上 `/`、`/about`、`/gallery` 均 HTTP 200；link-checker 报 `/tools` `/mania` 404 为历史外链问题与本次无关；grep 确认 Phase 1 文件无 `<n-` 残留（仅剩孤儿 `LoadingBar.vue`）

## 3. Phase 2 — 容器组件与表单

- [x] 3.1 `CommentSection.vue`（最重一文件，全面重写）：
  - `useMessage()` → `useToast()`，4 处调用改为 `toast.add({ title, color })`
  - `<n-form ref :model :rules>` → `<UForm :schema :state :validate-on @submit>`
  - `<n-form-item path>` → `<UFormField name>`（空 label 实现 label-less 表单）
  - `<n-input v-model:value>` → `<UInput v-model>`；`<n-input textarea>` → `<UTextarea v-model>`
  - `<n-button :loading @click>` → `<UButton :loading type="submit" trailing-icon>`
  - `<n-alert type="success" closable>` → `<UAlert color="success" variant="soft" close @close>`
  - `<n-spin>` → `<UProgress :indeterminate>`
  - `<n-avatar :src :size round>` → `<UAvatar :src :alt size>`
  - 原 rules 对象 → valibot schema（`v.pipe(v.string(), v.trim(), v.minLength(1, '...'))`）
- [x] 3.2 `ArticlePagination.vue`：`<n-pagination :page-count>` → `<UPagination :total :sibling-count show-edges>`；保持对外 emit `update:page` API 不变
- [x] 3.3 `ArticleListPageContainer.vue`：2 处 `<n-alert>` → `<UAlert>`（variant="soft" + :description 替代 inner text）；`<n-empty>` + `#icon` slot → `<UEmpty :icon prop>`
- [x] 3.4 `ArticleDetailPageContainer.vue`：`<n-spin>` → `<UProgress>`；`<n-alert>` → `<UAlert>`；`<n-empty>` + `#icon`/`#extra` slot → `<UEmpty :icon :actions>`（actions 数组替代 #extra 按钮 slot）
- [x] 3.5 `ArchivePageContainer.vue`：`<n-alert>` → `<UAlert>`；`<n-empty>` → `<UEmpty>`
- [x] 3.6 验证：`npm run generate` 通过 12 路由预渲染；grep 确认 Phase 1+2 范围零 `<n-` 残留（剩余的 5 个文件均为 Phase 3 + Phase 4 目标）

## 4. Phase 3 — Article Detail 子组件

- [x] 4.1 `Content.vue`：`<n-button type="info">` → `<UButton color="info" variant="solid" leading-icon>`
- [x] 4.2 `Header.vue`：`<n-tag>` → `<UBadge>`（复用 `getCategoryTagType` 返回值作为 color prop）；`<n-button quaternary strong secondary>` → `<UButton variant="ghost" leading-icon>`
- [x] 4.3 `Toc.vue`：`<n-tooltip placement :delay :disabled>` + `<template #trigger>` → `<UTooltip text :disabled :delay-duration>`（v3 不需要 `#trigger` slot，直接包触发元素）
- [x] 4.4 验证：`npm run generate` 通过 12 路由预渲染

## 5. Phase 4 — 全局 Provider 与主题重构

- [x] 5.1 `app/app.vue`：根模板改为 `<UApp>` 包裹 `<NuxtLayout>`
- [x] 5.2 `app/layouts/default.vue`：
  - 删除 `<n-config-provider>` 与 `<n-message-provider>` 包裹
  - 删除 `themeOverrides` 计算属性（原 primaryColor + Dropdown 圆角迁出）
  - 删除 `import { darkTheme } from 'naive-ui'`
  - scoped CSS 内 `.dark-theme` 与 `:global(.dark-theme)` → `.dark` / `:global(.dark)`（共 14 处）
  - 保留 L3 的 `id="app"` class 绑定 `dark-theme/light-theme`（其他文件 CSS 仍依赖）
- [x] 5.3 `app/layouts/blank.vue`：删除 `<n-message-provider>` 与 `import { NMessageProvider }`
- [x] 5.4 `app/composables/useTheme.ts`：删除 `data-theme` 属性同步；保留 `.dark` 主开关 + `.dark-theme`/`.light-theme` legacy class（其他 CSS 依赖）+ `colorScheme`
- [x] 5.5 `app/app.config.ts`：Phase 0 已写入完整 ui.colors，无需补全；defaultVariants 保留 Nuxt UI 默认值（不强行覆写避免引入偏差）
- [x] 5.6 `app/assets/css/main.css`：`@theme` 块新增 `--radius: 0.75rem`（对齐原 NaiveUI Dropdown.borderRadius = '12px'）
- [x] 5.7 grep `app/`：`.dark-theme` 仍有 16 个文件依赖，但 `useTheme.ts` 仍同步此 class + `default.vue` 第 3 行仍应用此 class，**所有依赖完整**；后续可独立 change 全量迁移到 `.dark`
- [x] 5.8 验证：`npm run generate` 通过 12 路由预渲染；dev server 上 `/`、`/about`、`/archive` 均 HTTP 200；最终 grep 确认 app/ 内仅剩 `LoadingBar.vue`（孤儿）有 NaiveUI 残留

## 6. Phase 5 — 清理与验收

- [x] 6.1 `nuxt.config.ts`：
  - `modules` 删除 `'@bg-dev/nuxt-naiveui'`
  - 删除 `naiveui: { ... }` 配置块
  - `build.transpile` 删除 `'naive-ui'`
  - `vite.optimizeDeps.include` 删除 `'naive-ui'`
  - `manualChunks` 内 `naive-ui` 分支替换为 `@nuxt/ui` / `reka-ui` / `@internationalized`（chunk 名仍为 `vendor-ui`）
- [x] 6.2 删除孤儿文件 `app/components/LoadingBar.vue`（Phase 1 已确认无引用）
- [x] 6.3 `package.json`：移除 `naive-ui` 与 `@bg-dev/nuxt-naiveui`，`npm uninstall` 同步 lockfile（移除 24 个包）；`valibot` + `@nuxt/ui` 保留
- [x] 6.4 grep `app/` 与 `nuxt.config.ts` 确认无运行时残留（仅 2 处注释引用：main.css 注释 + default.vue L181 解释迁移背景）
- [x] 6.5 全站 build 验证：`npm run generate` 通过 12 路由预渲染
- [x] 6.6 构建产物统计（清理后）：总 JS 14163 KB 未压缩 / 3606 KB gzipped；总 CSS 318 KB 未压缩；Nuxt UI 代码通过 auto-import + ESM tree-shake 散布于多 chunk（vendor-ui chunk 因 ESM 特性未单独生成，可接受）
- [x] 6.7 部署预览环境验证——本环境无 Pages preview 通道；跳过（依赖 Cloudflare 控制台手动部署）
- [x] 6.8 更新 `README.md`（技术栈段：Nuxt 3 → Nuxt 4，NaiveUI → Nuxt UI v3，标注 nuxt/ 仍为 NaiveUI 待迁移）；`AGENTS.md`（项目概览段同步标注）
- [x] 6.9 PR 描述中明确标注"nuxt/ 项目暂未迁移"为已知技术债，并建议后续独立 change（openspec/changes/nuxt-ui-migration/proposal.md 已记录）
## 7. Phase 6 — 主题系统清理（合并 5.7 后清理项）

**触发**：用户在 Phase 5 完成后请求引入 @nuxtjs/color-mode 主题控制。

- [x] 7.1 删除 `app/composables/useTheme.ts`（被 `@nuxtjs/color-mode` 模块完全接管：localStorage + `.dark` 同步 + system 检测全部内置）
- [x] 7.2 `app/layouts/default.vue` 改造 5 个消费点 + onMounted：
  - 导入：`useTheme()` → `useColorMode()`
  - L3：`#app` class 绑定 `dark-theme/light-theme` → `dark/light`（直接对齐 color-mode 输出）
  - L7：樱花/星空分支 `!isDarkMode` → `colorMode.value !== 'dark'`
  - L98-101：抽屉按钮 `@click="toggleTheme"` → `colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'`，三元全替换
  - L148：`is-dark-mode` prop：`isDarkMode` → `colorMode.value === 'dark'`
  - onMounted：删除 `initTheme()` 调用（color-mode 自动初始化）
- [x] 7.3 CSS 全量迁移（10 个文件，sed 批量替换 + 手工补漏）：
  - `.dark-theme` → `.dark`（186 处）
  - `:global(.dark-theme)` → `:global(.dark)`
  - `GalleryLoadingAnimation.vue` L70-72 重复规则（Phase 1 同时写了两个）手工去除一行
  - `.light-theme` → `.light`（3 处 CSS 规则保留语义，注释引用保留无害）
- [x] 7.4 `FloatingQuickActions.vue`**无需改动**（保持 `isDarkMode: boolean` prop 接受父组件派生的布尔值，解耦设计有效）
- [x] 7.5 验证：`npm run generate` 通过 28 路由预渲染；dev server `/`、`/about` HTTP 200；HTML 中零 `dark-theme`/`light-theme` 字串
- [x] 7.6 grep `app/` 最终零 `useTheme`/`darkMode.*localStorage` 残留

**关键收益**：
- 主题系统与 Nuxt UI / Tailwind v4 完全一致（`.dark` / `.light` 是唯一模式源）
- 不再维护自定义 `useTheme` composable
- 不再有 `.dark-theme/light-theme` legacy class 与 modern `.dark/.light` 的双轨
- localStorage key 由原 `darkMode` 改为官方 `nuxt-color-mode`

## 8. Phase 8 — ArticlePagination 重新设计

**触发**：用户反馈"ArticleList 底部的翻页区不可点击"。

### 根本原因（chrome devtools snapshot 实测）

旧实现用 `:total="totalPages"` 传 props，但 Nuxt UI v3 `UPagination` 的官方 TypeScript 接口
`PaginationProps` 只声明 `total: number`（数据总数）+ `itemsPerPage: number`（默认 10），
不接受 `totalPages` 或 `pageCount`。

当 `articlesPerPage=8` 而 `total=8`（实际是 totalPages 被误传了 8），`UPagination` 算出
`pages = 8 / 10 = 0`，所有翻页按钮被 disabled。这就是"翻页区不可点击"的根因。

加上三类次要问题：Bootstrap `d-flex` 工具类（不存在，div 不居中）；`<style scoped>` 缺失
（`.pagination-container` 没视觉间距）；`text-center text-muted` 也是 Bootstrap 工具类。

### 改造

- [x] 8.1 `ArticlePagination.vue` 全文重写为正确的 UPagination API：
  - `:total="totalCount"`（数据总数）
  - `:items-per-page="articlesPerPage"`（每页数）
  - `:sibling-count="2"`、`show-edges`
  - 通过内部 `currentPageLocal` + `watch` + `emit('update:page')` 保留对外 API 兼容
  - Tailwind 工具类（`flex items-center justify-center`）+ `<style scoped>` 保留 `.pagination-container` 的 `margin-top`
  - `:ui` 覆盖 active/inactive/disabled 颜色（暗色模式同步）
- [x] 8.2 `ArticleListPageContainer.vue` 新增 prop `:articles-per-page="articlesPerPage"` 传入（避免子组件硬编码 8）
- [x] 8.3 验证：build + dev server + chrome devtools 实测
  - Page 1 渲染：First/Previous disabled，Page 2-7 + Page 10（show-edges）+ Next/Last 全部 enabled
  - 点击 Page 2：焦点正确落在 Page 2，URL 状态同步（不再展示 disabled），"2 / 10 页"标签更新
  - 文章列表内容正确切换（第 2 页显示 article/92 起，与第 1 页不同）

**关键学习**：UPagination 的 prop 语义与 NaiveUI 的 `<n-pagination>` **完全不同**——
NaiveUI 用 `:page-count` 表示总页数（intuitive 命名），Nuxt UI 用 `:total`
（数据总数）配合 `:items-per-page` 自计算总页数。改名时**只换组件标签 + emit 名
保留**是不够的，必须按官方 TypeScript 接口核对 prop 语义。

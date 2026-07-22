> **⚠️ 实施状态：路径 C（仅范围收缩），UI 迁移延后**
>
> 2026-07-22 实施中发现 Nuxt UI v3/v4 与 Tailwind v3 互斥，UI 迁移部分延后。本 design 文档作为**未来 change 蓝图**保留，路径 C 实施已完成范围 1（删除公共模块）+ 范围 3 部分（nuxt.config.ts 清理公共配置）。

## Context

- **当前状态**：`nuxt/` 是 Nuxt 4.3 SSR 项目，部署在云服务器（PM2 + Nginx），通过 Cloudflare Worker 路由分发处理 `/admin/*`、`/api/*`、`/images/*`、`/_ssr/*`。UI 栈是 **NaiveUI 2.43** + `@bg-dev/nuxt-naiveui` 模块 + Tailwind v3 + 手写 `theme-variables.css` CSS 变量 + Pinia + `@nuxtjs/mdc`。
- **已完成参考**：`nuxt-public/` 已迁移到 Nuxt UI v4（见 `openspec/changes/archive/2026-07-14-nuxt-ui-migration` 与 `2026-07-15-upgrade-nuxt-ui-v4-public`），5 阶段渐进式落地经验可直接复用。已建立的设计 token / 主题层 / 表单 valibot 化 / `UApp` 全局包裹等模式在 `nuxt/` 同样适用。
- **架构真相**：`nuxt/` 当前公共浏览职责（首页、文章、画廊、教程、关于）**实际由 `nuxt-public/` 静态站承担**（`server.wasd09090030.top` 上对应路径已 301 跳到 `wasd09090030.top`）。`nuxt/` 内的对应页面、features、layout 是冗余代码，技术债分裂。
- **依赖图（已通过 `bg_999d29ea` explore 验证）**：
  - 17 个删除候选中**全部可安全删除**（admin 无任何 import 依赖）
  - 唯一例外：`components/MarkdownRenderer.vue` 被 `AdminArticleEditorContainer.vue:190` 引用 → **必须保留**
  - `useTheme.ts` 仅 `default.vue` + `GalleryLoadingAnimation.vue` 引用 → 可删（admin 内 `isDarkMode` 由 `layouts/admin.vue` 内 `useState('isDarkMode')` 直接管理）
  - `stores/auth.ts` + `middleware/admin-auth.ts` **纯 admin 专用**，保留
  - 9 个 admin 页面**全部**已 `definePageMeta({ layout: 'admin' })`（其中 `login.vue` 用 `layout: false`），删除 `default.vue` 无 layout 解析风险
  - `pages/admin/imagebed/index.vue` **缺 `ssr: false`**（其他 8 个都有），需补
- **NaiveUI 在 admin 内的真实使用面**：**20 个文件** / 85+ 个 `<n-*>` 实例 / 34 种组件类型 / 4 处 `n-form + rules` 表单 / 8 处 `useMessage()` / 6 处 `n-modal` / 3 处 `n-data-table` / 1 处 `useDialog()`。完整清单：
  - layouts：2 个（`admin.vue` + `blank.vue`）
  - admin 页面：6 个（`pages/admin/{index, login, password, articles/index, comments/index, imagebed/index}.vue`）
  - admin 容器：2 个（`AdminArticleEditorContainer.vue` + `AdminGalleryPageContainer.vue`）
  - admin gallery 子组件：6 个（`features/gallery-admin/components/{imagebed/{FileArea, UploadArea, Toolbar, PreviewModal}, gallery/{FilterBar, EditModal, CardGrid}}`，**含 ImagebedToolbar.vue**）
  - admin composable：1 个（`features/gallery-admin/composables/useAdminImagebedPage.ts`，使用 `useMessage` + `useDialog`）
  - Markdown 相关：2 个（`MarkdownRenderer.vue` + `MdEditorWrapper.client.vue`，后者是 `md-editor-v3` 的 NaiveUI 风格工具栏包装，含 `n-button-group`×3 + 15+ `n-button` + `n-modal` + `n-menu`）
- **重要纠正**：用户最初假设 `nuxt/app/pages/mania/*`、`nuxt/app/components/mania/*` 存在——**经 explore 确认均不存在**（pixi.js 12MB 是孤悬依赖，可能有隐藏引用，Phase 0 需先 grep 确认）。
- **用户决策**：
  - 彻底收缩为纯 admin（删除 `pages/mania/*`、`pages/tools/*` 等非 admin 路径——因不存在，无操作）
  - Tailwind v3 → v4 不同步（独立排期）
  - 复用 nuxt-public 5 阶段经验
  - 不修改后端 / CI/CD / Cloudflare Worker / 路由分发
- **关键约束**：
  - `MarkdownRenderer.vue`、`md-editor-v3`、`mermaid`、`katex`、`keen-slider`、`pixi.js` 在 admin 内仍被使用，**不得删除**
  - `app.vue` 已有 `useAuthStore` 调用、SEO meta、loading indicator —— admin 需继续保留
  - 主题色与圆角 token 复用 `nuxt-public/` 的 `app.config.ts` + `main.css` 模式
  - `app.buildAssetsDir: '/_ssr/'` 保留（避免与 Cloudflare Pages `/_nuxt/` 冲突）

## Goals / Non-Goals

**Goals**

1. `nuxt/` 部署后**仅**响应 `/admin/*`、`/api/*`、`/images/*`、`/_ssr/*` 路径，不再有 `/`、`/article/*`、`/gallery`、`/tutorials`、`/about` 路由
2. 17 个删除候选文件全部安全删除，admin 关键路径 build 与回归通过
3. admin 范围 85+ 个 `<n-*>` 全部替换为 Nuxt UI v4 对应组件，无残留
4. 主题系统从 NaiveUI `<n-config-provider>` 迁移到 `app.config.ts` + Tailwind v4 `@theme` 模式（与 `nuxt-public/` 完全对齐）
5. dark mode 切换统一使用 `<html class="dark">`，与 Nuxt UI 官方机制零成本对接
6. 4 处 `n-form + rules` 表单改为 `UForm + valibot schema + UFormField`，行为等价
7. `nuxt/nuxt.config.ts` 中所有 NaiveUI 相关配置一并清理（`naiveui` 块、`@bg-dev/nuxt-naiveui` 模块、`transpile`、`optimizeDeps.include`、sitemap、prerender）
8. 5 阶段渐进式落地，每阶段独立可 build & 手动回归
9. `pages/admin/imagebed/index.vue` 补 `ssr: false` 避免 hydration mismatch

**Non-Goals**

- 不迁移 `nuxt-public/`（已迁移）
- 不引入新功能、不重做视觉（仅 1:1 替换 + 主题系统重构）
- 不动后端 / CI/CD / Cloudflare Worker / Worker 路由配置
- 不升级 Tailwind v3 → v4（独立 change 排期）
- 不重写 `useAuthStore` 状态管理逻辑（仅清理 `app.vue` 中非 admin 死代码）
- 不清理 `theme-variables.css`（admin 大量使用，保留与 Nuxt UI token 并存）
- 不处理 `MarkdownRenderer.vue` 内部实现（仅作为依赖保留）
- 不修改 Pinia store / middleware 接口
- 不引入 `Inspira UI` 等额外组件库

## Decisions

### D1. 先删后迁（5 阶段拆分为"删 + 迁"两大块）

**决策**：将 nuxt-public 的 5 阶段拆分为两大执行块：
- **执行块 A（Phase 1-2，删除）**：先删除非 admin 模块（公共 features/pages/layouts/composables/components），确保 admin 在无 NaiveUI 依赖图干净状态下 build 通过
- **执行块 B（Phase 3-7，迁移）**：复用 nuxt-public 5 阶段模板（叶子→容器+表单→详情子组件→全局 provider+主题→清理验收）

**理由**：
- nuxt-public 经验是"共存→替换"路径，但本项目"先删公共"后可**让迁移范围更聚焦**（无公共页面干扰）
- 删除后 admin 20 个文件（含 1 个 composable + 1 个 client-only wrapper）+ nuxt.config.ts + package.json + app.vue 即可一次成型
- 风险面更小：先验证"删了 admin 不破"，再分阶段迁

**替代方案**：
- (a) 完全照搬 nuxt-public 5 阶段（先共存再分阶段替换）—— 拒绝：本次同步做删除 + 迁移，分阶段共存无意义
- (b) 一次性大爆炸 —— 拒绝：违反"小步可回滚"原则，admin 编辑器是 591 行的复杂组件，盲改会失控

### D2. UApp 放在 `app.vue`，admin/blank layout 简化

**决策**：`app/app.vue` 根模板加 `<UApp>` 包裹 `<NuxtLayout>`；`layouts/admin.vue` 删除 `<n-config-provider>` + `<n-message-provider>` + `<n-dialog-provider>`；`layouts/blank.vue` 删除 `<n-message-provider>`（login.vue 用 `layout: false`，不受影响）。

**理由**：与 nuxt-public Phase 4 完全一致；`useToast()` / `<UTooltip>` 依赖 provider 注入；layout 内嵌套 provider 会引发依赖路径分裂。

**替代方案**：
- (a) 在 `layouts/admin.vue` 内放 `<UApp>` —— 拒绝：admin/blank 各自一份 provider 树，会破坏 login 的 `useToast` 调用
- (b) 保留 `n-config-provider` 兼容过渡 —— 拒绝：拒绝维护双套主题

### D3. 主题色映射策略

**决策**：复用 nuxt-public 已建立的 `app.config.ts` + `main.css` 模式：
- `app.config.ts` 新增 `ui.colors` 块（primary = 'blue' 等），与 `icon.aliases` 并存
- `app/assets/css/main.css` 新建：包含 `@import '@nuxt/ui';` + `@theme` 块（先放占位 token，按 admin 实际视觉迭代）
- `nuxt.config.ts` `css: []` 数组中 `main.css` 加在 `tailwind.css` 之后
- 保留 `theme-variables.css`（admin 大量手写 CSS 引用 `--text-primary` 等），不强行替换为 `@theme` token

**理由**：
- `theme-variables.css` 是历史手写 token，与 Nuxt UI v4 的 Tailwind v4 `@theme` 是**两套不同设计语言**，强行替换会破坏 admin 视觉一致性
- 保留两套并存是务实选择，admin 内部用 `--text-primary`、Nuxt UI 组件用 Tailwind 类，互不污染
- `main.css` 引入 `@import '@nuxt/ui'` 是 Nuxt UI v4 必备（v4 改用 Tailwind v4 `@theme` 而非 v3 的 SCSS 变量）

**替代方案**：
- (a) 完全替换 `theme-variables.css` 为 Nuxt UI token —— 拒绝：admin 大量 CSS 引用 `var(--text-primary)`，重写工作量大、风险高，与本次"1:1 替换"原则冲突
- (b) 暂不引入 `main.css`，仅 `app.config.ts` 配 `ui.colors` —— 拒绝：Nuxt UI v4 必须 `@import '@nuxt/ui'` 才能加载组件样式

### D4. 主题切换到 `@nuxtjs/color-mode`

**决策**：admin 范围内 dark mode 切换改用 Nuxt UI v4 官方推荐机制：
- 引入 `@nuxtjs/color-mode` 模块
- `layouts/admin.vue` 内 `useState('isDarkMode')` 替换为 `useColorMode()`（来自 `@nuxtjs/color-mode`）
- 删除 `composables/useTheme.ts`（仅 default.vue 引用，admin 内不依赖）
- `<html>` 上保留 `.dark` class（Nuxt UI 官方机制），删除 `dark-theme` / `light-theme` / `data-theme` 等历史标记

**理由**：
- `@nuxtjs/color-mode` 是 Nuxt UI v4 推荐的 color mode 方案，自动同步 `<html>` class + localStorage 持久化
- admin 原 `useState('isDarkMode')` 是手写实现，与 Nuxt UI 切换行为不完全对齐（无 system 偏好支持、无平滑过渡）

**替代方案**：
- (a) 保留 `useTheme` 不重写 —— 拒绝：与 Nuxt UI 切换机制分裂，长期维护成本高
- (b) 完全用 `useColorMode` + 删除 `useTheme` —— 接受：本次 change 内执行

### D5. 表单校验统一 valibot

**决策**：4 处 admin 表单（login、password、imagebed 配置、AdminGalleryPageContainer 配置）全部改为 `<UForm :schema :state> + <UFormField name>` 模式：
- `n-form + rules` 数组 → valibot schema 对象
- 触发时机：`<UForm validate-on="blur">` 保留原 blur 行为
- 错误信息：valibot `v.pipe(v.string(), v.minLength(1, '请输入...'))` 第二参数

**理由**：与 nuxt-public CommentSection 改造完全对齐；valibot 体积小（< 5KB gzipped），无外部依赖；Nuxt UI Form 官方支持。

**替代方案**：
- (a) 用 zod —— 拒绝：nuxt-public 已选 valibot，全项目统一
- (b) 保留 n-form 模式 —— 拒绝：UI 库都迁移了，校验机制分裂

### D6. 分页组件 emit API 保持不变

**决策**：`UPagination` 替换 `n-pagination`，**保持组件对外 `update:page` emit API 不变**；不引入 `:to` 函数；路由同步逻辑由各 admin 容器内部 `goToPage` / `syncPageFromQuery` 负责。

**理由**：与 nuxt-public ArticlePagination 改造完全对齐；避免破坏父容器路由同步逻辑。

### D7. 状态管理无侵入

**决策**：`stores/auth.ts` + `middleware/admin-auth.ts` **完全不动**（admin 专用，无公共页面 state 泄漏）；Pinia store 内部 `useState` 调用、`$fetch` 配置、`localStorage` 持久化全部保留。

**理由**：admin auth 是核心依赖，迁移 UI 库不能牵连 auth 逻辑。

### D8. 数据表与树形组件

**决策**：
- `n-data-table` → `UTable`（admin 文章列表、画廊管理列表）
- `n-tree` 在 admin 内**不存在**（仅 public `default.vue` 用过）
- 排序、筛选、分页通过 `UTable` 的 column prop 暴露

**理由**：`UTable` 基于 Reka UI，原生支持排序/筛选/分页；`n-data-table` 复杂的 `:columns` 配置可 1:1 映射到 `UTable` 的 `columns` prop。

### D9. `app.vue` 清理范围

**决策**：
- 保留：`useSeoMeta`（admin 局部覆盖）、`useHead`、`<NuxtLoadingIndicator>`、`useAuthStore.initialize()`、`<UApp>` 包裹
- 删除：`router.afterEach` 中 gallery 滚动恢复守卫（72-84 行，gallery 路由删除后为死代码）
- 简化：SEO meta 中只保留 admin 基础 meta（title / description / theme-color），公共页面相关 og:image / twitter card 可后续按需添加

**理由**：
- `useSeoMeta` 是 Nuxt 内置（`@unhead/vue`），不依赖 `@nuxtjs/seo` 模块
- admin 是 SSR 运行时 + 私域，公共 SEO 元数据可大幅简化
- gallery 守卫删除是纯减法，零风险

**替代方案**：
- (a) 保留 `@nuxtjs/seo` 仅为 `useSeoMeta` —— 拒绝：`useSeoMeta` 是 Nuxt 内置；`@nuxtjs/seo` 主要价值在 sitemap/robots/schema.org，admin 都不需要

### D10. `pixi.js` 依赖状态需 Phase 0 确认

**决策**：Phase 0 必须先 grep 全 `nuxt/app/` 确认 `pixi.js` 引用情况：
- 如果**仅** `package.json` 引用，无代码引用 → 卸
- 如果 `pages/mania/*` 隐藏存在 → 保留 `pixi.js`
- 如果 `gallery-admin` 用了 pixi.js 做图片处理 → 保留

**理由**：`pages/mania/*` 不存在是已确认事实，但 `pixi.js` 12MB 是否真在 admin 内被使用未确认；探索报告未涉及此点，必须 Phase 0 摸排。

## Risks / Trade-offs

- **[R1 删除顺序错误]** 如果 Phase 1 先删 `default.vue` 但 admin 内某处未声明 `layout: 'admin'`，会导致 admin 页面无 layout → 整页崩溃。**缓解**：Phase 1 实施前先 `grep -r "definePageMeta" nuxt/app/pages/admin/` 全量确认；删 default.vue 后立即 `npm run build` 验证。
- **[R2 MarkdownRenderer 误删]** MarkdownRenderer 是 admin 文章编辑器预览依赖，误删会导致 admin 编辑器 markdown 预览失效。**缓解**：依赖图已通过 explore `bg_999d29ea` 验证 `AdminArticleEditorContainer.vue:190` 引用；删除清单中明确标注"必须保留"。
- **[R3 useMessage 顶层调用 SSR 失败]** `useMessage()` 是 NaiveUI 注入式 composable，admin composable 顶层调用，SSR 阶段会失败（admin 页面有 `ssr: false` 保护，但 imagebed 缺）。**缓解**：Phase 1 第一步就是补 `pages/admin/imagebed/index.vue` 的 `ssr: false`；Phase 3 迁移时 `useMessage` → `useToast` 同样顶层调用，Nuxt UI v4 已通过 `UApp` + `useColorMode` 模式支持。
- **[R4 主题切换闪烁]** 迁移瞬间 NuiveUI 主题与 Nuxt UI `.dark` 切换行为不同步，可能闪烁。**缓解**：在 Phase 4 一次性替换 `useTheme` 为 `useColorMode` + 删除所有 `dark-theme` / `light-theme` class 同步代码；Phase 4 后立即 dark/light 切换回归。
- **[R5 NaiveUI chunk 残留]** `manualChunks` 内 `naive-ui` 分支未删会导致构建产物包含 NaiveUI 代码。**缓解**：Phase 7 清理验收阶段必须 `grep -r "naive-ui" nuxt/.output/` 验证产物零残留；`vendor-ui` chunk 命名保持稳定以利缓存命中。
- **[R6 gallery 守卫删除遗漏]** `app.vue` gallery 守卫删除是显式操作，遗漏会导致控制台 warning（guard 永不触发但逻辑仍在）。**缓解**：Phase 1 实施时用 git diff 验证 72-84 行删除完成。
- **[R7 主题色映射色差]** 原 NaiveUI 主题色 `#0d6efd` 与 Nuxt UI `blue-500` (`#3b82f6`) 不完全一致。**缓解**：admin 范围内色差属于"1:1 替换"的允许偏差；如视觉回归发现显著差异，按 `app.config.ts` 的 `ui.colors` 字段细调（`primary: 'sky'` 等）。
- **[R8 Nuxt UI v4 SSR 兼容性]** Nuxt UI v4 主要在 SSG 场景验证（nuxt-public），SSR 长期稳定性未在本项目验证。**缓解**：Phase 4 后立即 admin 关键路径（登录、文章编辑、画廊管理、图床、评论管理）的 SSR 渲染回归；如发现 hydration mismatch，按页加 `ssr: false` 兜底。
- **[R9 公共路径 routeRules 删除后兼容]** 删除 `/`、`/article/**` 等 routeRules 后，Nginx/Worker 转发层（指向云服务器的路径）仍可能命中这些路径返回 404。**缓解**：本次 change 范围限定在 `nuxt/` 项目内；Nginx/Worker 配置是独立运维资产，由用户在部署前同步更新（PR 中标注为外部协调项）。
- **[R10 pixi.js 误留]** `pixi.js` 12MB 误留会显著拖慢 admin 首屏。**缓解**：Phase 0 必须 grep 确认无引用后从 `package.json` 卸除；如保留需在 `vite.optimizeDeps.exclude` 排除避免预构建。
- **[R11 `keen-slider` 误留]** 探索报告未明说 admin 是否用 slider。**缓解**：Phase 0 grep `keen-slider` 在 admin 内的引用；如无引用则从 `package.json` + `optimizeDeps.include` 卸除。
- **[R12 MarkdownRenderer 与 MdEditorWrapper 内部含 n- 组件]** MarkdownRenderer.vue 与 MdEditorWrapper.client.vue 是 admin 文章编辑器依赖（前者预览、后者工具栏），两者内部都可能用了 `<n-xxx>`（来自历史 public 共用 + md-editor-v3 包装）。**缓解**：Phase 0 任务 1.3 同时审计两个文件；Phase 3 任务 4.6 迁移 MarkdownRenderer；Phase 3 新增任务 4.8 迁移 MdEditorWrapper；如 MdEditorWrapper 内部依赖复杂（如 `n-menu` 自定义 slot 嵌套），可拆为 Phase 3.5 单独子任务。
- **[回滚]** 单分支工作区 `git restore` 即可；无数据/接口/CI 变更。Nuxt SSR 部署回滚需 PM2 重新加载旧 build 产物。

## Migration Plan

### 执行块 A：删除（Phase 1-2）

#### Phase 0：预研与依赖摸排（0.5 天）

1. 验证 explore `bg_999d29ea` 报告的依赖图：grep `pixi.js`、`keen-slider` 在 `nuxt/app/` 内的引用，决定是否卸除
2. grep `MarkdownRenderer.vue` 内部使用的组件（可能含 n- 组件），评估 Phase 2 迁移工作量
3. grep `pages/admin/*` 全量确认 `definePageMeta({ layout: 'admin' })` 已声明
4. 新建 `feature/nuxt-shrink-to-pure-admin` 分支
5. `npm install @nuxt/ui@^4.9 valibot @vueuse/motion @nuxtjs/color-mode`（peer deps 检查；`@nuxtjs/color-mode` 应已在 `@nuxt/ui` 的依赖树内，验证版本兼容）
6. 创建 `app/app.config.ts`，写入 `ui.colors` 基础映射（primary = 'blue' 等）
7. 创建 `app/assets/css/main.css`，加入 `@import "tailwindcss";` + `@import "@nuxt/ui";` + `@theme` 块（先放占位 token）
8. `nuxt.config.ts` 的 `css: []` 加入 `~/assets/css/main.css`，`modules` 加入 `'@nuxt/ui'`、`'@nuxtjs/color-mode'`
9. **不删除** NaiveUI 相关配置 —— 本阶段目标是不破坏现有 build（NaiveUI 与 Nuxt UI 共存）

#### Phase 1：删除公共模块（1 天）

按依赖深度从浅到深：

**1.1 叶子组件清理**
- 删除 `app/components/CommentSection.vue`（仅 article-detail 引用）
- 删除 `app/components/LoadingBar.vue`（已死代码）
- 删除 `app/composables/useTheme.ts`（仅 default.vue 引用，admin 改用 `useColorMode`）
- 删除 `app/plugins/naive-ui.client.ts`（Phase 0 后已无意义；可推迟到 Phase 7 一并删）

**1.2 公共 layout 清理**
- 删除 `app/layouts/default.vue`（9 个 admin 页面已显式 `layout: 'admin'`，login 用 `layout: false`）
- **注意**：`app.vue` 中 `useAuthStore.initialize()` 等全局初始化逻辑保留

**1.3 公共 features + pages 清理**
- 删除 `app/features/home/`、`article-list/`、`article-detail/`、`gallery-public/`、`tutorials/`
- 删除 `app/pages/index.vue`、可能的 `about.vue`、`article/[id].vue`、`gallery.vue`、`tutorials.vue`
- 验证：`grep -r "from.*features/(home|article-list|article-detail|gallery-public|tutorials)" nuxt/app/` 应无业务引用

**1.4 app.vue 清理**
- 删除 `router.afterEach` 中 gallery 滚动恢复守卫（72-84 行）
- 简化 `useSeoMeta` 中公共页面专属 meta（保留 admin 基础 meta）
- 验证：`grep "gallery" app.vue` 应无残留

**1.5 验证**
- `npm run build` 必须成功
- `npm run dev` 启动后访问 `/admin/login` 必须渲染登录页（不依赖 default layout）

#### Phase 2：admin SSR 修正（0.5 天）

1. 补 `app/pages/admin/imagebed/index.vue` 的 `definePageMeta({ ssr: false })`
2. 验证：`grep "definePageMeta" nuxt/app/pages/admin/imagebed/index.vue` 含 `ssr: false`
3. 验证：`npm run dev` 访问 `/admin/imagebed` 无 hydration warning

### 执行块 B：迁移（Phase 3-7，复用 nuxt-public 5 阶段）

#### Phase 3：admin 叶子组件迁移（1.5 天）

按依赖深度从浅到深：
- `layouts/admin.vue`（n-config-provider + n-message-provider + n-dialog-provider + 1 n-button）
- `layouts/blank.vue`（n-message-provider）
- `pages/admin/login.vue`（n-form + n-form-item + n-input + n-alert + n-button + n-card）
- `pages/admin/password.vue`（n-form + n-form-item + n-input + n-alert + n-button + n-card）
- `pages/admin/imagebed/index.vue`（轻量 n- 组件 + n-form + n-tabs + n-tab-pane + n-tag）
- `MarkdownRenderer.vue`（如含 n- 组件，按需迁移）

每文件改完单独 `npm run dev` 验证页面渲染。

#### Phase 4：admin 容器组件 + 表单迁移（2 天）

- 安装 valibot（如 Phase 0 未装）
- `pages/admin/articles/index.vue`（n-data-table + n-pagination + n-modal + n-input + n-select + n-spin + n-button + n-card）
- `pages/admin/comments/index.vue`（n-data-table 替代 + n-tag + n-modal + n-button-group + n-badge + n-button + n-spin + n-card）
- `pages/admin/index.vue`（n-data-table 替代 + n-card + n-skeleton + n-spin + n-button）
- `features/article-admin/containers/AdminArticleEditorContainer.vue`（核心表单：n-form + n-form-item + n-input + n-select + n-tag + n-dynamic-tags + n-divider + n-button + n-spin + n-card）
- `features/gallery-admin/containers/AdminGalleryPageContainer.vue`（最重：n-form + 13 n-form-item + n-input + n-input-number + n-select + n-modal + n-switch + n-checkbox + n-button + n-tag + n-spin + n-card + n-alert）
- `features/gallery-admin/components/imagebed/ImagebedFileArea.vue`（n-spin + n-popconfirm + n-button + n-checkbox + n-image + n-data-table + n-pagination）
- `features/gallery-admin/components/imagebed/ImagebedUploadArea.vue`（n-upload + n-upload-dragger + n-input + n-button + n-data-table）
- `features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue`（n-modal → UModal）
- `features/gallery-admin/components/gallery/GalleryFilterBar.vue`（n-tabs + n-tab-pane + n-select + n-alert）
- `features/gallery-admin/components/gallery/GalleryEditModal.vue`（n-modal + n-form + n-form-item + n-input + n-input-number + n-switch + n-checkbox + n-date-picker）
- `features/gallery-admin/components/gallery/GalleryCardGrid.vue`（n-card + n-button + n-tag）

#### Phase 5：全局 provider + 主题重构（1 天）

- `app/app.vue`：根模板加 `<UApp>` 包裹 `<NuxtLayout>`；`useToast` 替换 `useMessage` 在 app.vue 内的引用（如有）
- `layouts/admin.vue`：删除 `<n-config-provider>` + `<n-message-provider>` + `<n-dialog-provider>`；`useColorMode` 替换 `useState('isDarkMode')`；scoped CSS 内 `:global(.dark-theme)` → `:global(.dark)`
- `layouts/blank.vue`：删除 `<n-message-provider>`
- `app/app.config.ts`：补全 `ui.colors`（primary=blue 等）+ `ui.theme.defaultVariants`（按需）
- `main.css`：`@theme` 块补全 radius、spacing 等设计 token
- 验证：所有 admin 页面 dark/light 切换 + 视觉对比

#### Phase 6：dark mode 切换机制迁移（0.5 天）

- `useColorMode` 替换所有 `useState('isDarkMode')` 调用点
- 验证：admin 布局 dark/light 切换按钮与 `useColorMode()` 联动
- 验证：跨刷新保持（`localStorage` 由 `@nuxtjs/color-mode` 自动管理）

#### Phase 7：清理验收（1 天）

- `nuxt.config.ts`：删除 `naiveui` 块；`build.transpile` 删除 `'naive-ui'`；`vite.optimizeDeps.include` 删除 `'naive-ui'`；`manualChunks` 内 naiveui 分支替换为 `@nuxt/ui` 归入 `vendor-ui` chunk
- 删除 `app/plugins/naive-ui.client.ts`
- 公共路径的 `routeRules`（`/`、`/article/**`、`/gallery`、`/tutorials`、`/about`）删除
- `sitemap` 块与 `prerender` 块删除
- `@nuxtjs/seo` 模块从 `modules: []` 移除
- 评估 `pixi.js` 与 `keen-slider` 引用情况（Phase 0 已确认），按需从 `package.json` 卸除
- `package.json`：移除 `naive-ui`、`@bg-dev/nuxt-naiveui`、`@nuxtjs/seo`（如已卸）
- 全站视觉回归（admin 关键路径：登录、文章管理、文章编辑、画廊管理、图床管理、评论管理）
- `npm run build` 通过
- 产物体积对比：监控 `vendor-ui` chunk 与总和变化（预期 NaiveUI 移除带来净减小）
- 验证：`grep -r "naive-ui\|n-message\|useMessage\|n-config-provider\|n-dialog-provider" nuxt/app/` 应无业务代码命中
- 验证：`grep -r "naive-ui" nuxt/.output/` 应无构建产物命中

### 总时长估计

约 **7-8 工作日**（假设单人）。

## Open Questions

1. **pixi.js 实际使用情况**：Phase 0 摸排结果决定是否卸除（影响 -12MB 构建体积 + 数十个间接依赖）
2. **keen-slider 在 admin 内引用情况**：Phase 0 摸排结果决定是否卸除
3. **MarkdownRenderer 与 MdEditorWrapper 内部 NaiveUI 使用面**：影响 Phase 3 工作量（任务 1.3 / 4.6 / 4.8）
4. **`@nuxtjs/seo` 是否真的零依赖**：`useSeoMeta` 是 Nuxt 内置（@unhead/vue）已确认；但如有意外发现 SEO 模块在 admin 路径下还有隐性价值，需保留
5. **Nginx/Worker 路由配置是否同步更新**：本次 change 范围限定在 `nuxt/` 项目内，Nginx 配置 / Worker 路由配置是外部协调项；用户在部署前需同步更新，否则 `/`、`/article/*` 等路径在云服务器侧仍返回（404 来自 SSR 但路径未配置路由）—— PR 中需明确标注
6. **是否需要 dark mode system 偏好支持**：`@nuxtjs/color-mode` 默认 `preference: 'system'`，但 admin 原 `useState('isDarkMode')` 是手写 toggle；如需保留 system 偏好行为需显式配置 `colorMode.preference`

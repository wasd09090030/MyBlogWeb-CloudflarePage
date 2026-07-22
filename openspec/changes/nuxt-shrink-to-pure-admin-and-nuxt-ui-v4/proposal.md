> **⚠️ 实施状态：路径 C（仅范围收缩），UI 迁移延后**
>
> **2026-07-22 实施中**：发现架构冲突 —— 所有 Nuxt UI v3/v4 版本（`@nuxt/ui@3.0.0` / `3.3.7`）均把 `@tailwindcss/vite@4.3.3` 作为**传递依赖**拉入，与用户"tailwind 暂不同步"决策互斥。
>
> **实施范围（路径 C）**：
> - ✅ 范围 1（删除公共模块 + nuxt.config.ts 清理 + MarkdownRenderer 修复）— **已实施，build 验证通过**
> - ⏸ 范围 2（admin NaiveUI → Nuxt UI v4 迁移）— **延后**，待 Tailwind v3→v4 升级联动做
>
> **OpenSpec change 元数据**：specs/ui-library 的 delta spec（扩展到 nuxt/）已不再适用；UI 迁移相关 tasks.md 阶段未执行；范围收缩相关 tasks.md 阶段已全部完成。

## Why

`nuxt/` 当前既承担公开浏览（首页/文章/画廊/教程/关于）又承担 admin 后台，所有 UI 都基于 NaiveUI。这造成两个长期技术债：(1) 与 `nuxt-public/`（已迁移到 Nuxt UI v4）UI 栈分裂，主题/表单/弹窗等重复维护；(2) `nuxt/` 实际是 admin-only 项目，公共浏览职责由 `nuxt-public/` 静态站承担——`nuxt/` 的公开页面（/、/article/*、/gallery、/tutorials、/about）是冗余职责。本次 change 同步推进两件事：把 `nuxt/` 彻底收缩为纯 admin 容器，并把 admin 的 NaiveUI 完整迁移到 Nuxt UI v4，使两个前端项目的 UI 库与设计系统统一。

## What Changes

- **BREAKING（项目边界）**：删除 `nuxt/app/pages/index.vue`、可能的 `about.vue`、`article/*`、`gallery/*`、`tutorials/*`；删除 `nuxt/app/features/home/`、`article-list/`、`article-detail/`、`gallery-public/`、`tutorials/`；删除 `nuxt/app/layouts/default.vue`（公共 layout）。`nuxt/` 项目从此**仅服务 `/admin/*` 路由**。
- **BREAKING（公共组件）**：删除 `nuxt/app/components/CommentSection.vue`（仅 `article-detail` 引用，admin 评论管理通过 `useAdminCommentsFeature` composable 实现，**不依赖此组件**）、`nuxt/app/components/LoadingBar.vue`（已死代码）。`MarkdownRenderer.vue` 与 `MdEditorWrapper.client.vue` **保留**——前者被 `AdminArticleEditorContainer.vue:190` 模板内使用，后者是 `md-editor-v3` 的 NaiveUI 风格工具栏包装（admin 文章编辑器工具栏依赖，组件内部含 `n-button-group` + 15+ `n-button` + `n-modal` + `n-menu`）。
- **BREAKING（依赖）**：`nuxt/package.json` 移除 `naive-ui`、`@bg-dev/nuxt-naiveui`、`@nuxtjs/seo`（sitemap 已 disabled，`useSeoMeta` 是 Nuxt 内置不依赖此模块，admin 无公共 SEO 需求）；新增 `@nuxt/ui@^4.9`、`valibot`、`@vueuse/motion`。
- **BREAKING（主题层）**：`nuxt/app/layouts/admin.vue` 与 `blank.vue` 删除 `<n-config-provider>`、`<n-message-provider>`、`<n-dialog-provider>`；`app.vue` 根模板加 `<UApp>` 包裹；主题色与圆角 token 迁出到 `app.config.ts` 的 `ui.colors` 与 `app/assets/css/main.css` 的 `@theme` 指令。
- **破坏性替换（20 个文件，17 .vue + 1 .client.vue + 1 composable.ts + 1 layout.vue 补全）**：所有 admin 范围内的 `<n-xxx>` 替换为 `<Uxxx>`；`useMessage()` 替换为 `useToast()`；`useDialog()` 替换为 `<UModal v-model:open>` 或 `useConfirm()`；`n-form + rules` 替换为 `UForm + valibot schema + UFormField`；`n-data-table` 替换为 `UTable`；`n-modal` 替换为 `UModal`；`n-pagination` 替换为 `UPagination`（保持组件对外 emit API）。完整文件清单见 `design.md` Migration Plan 与 `tasks.md` Phase 3-4。
- **新增 capability**：`admin-only-ssr` —— 记录"`nuxt/` 收缩为纯 admin 容器"的边界与契约。
- **修改 capability**：`ui-library` —— 把 `nuxt/` 也纳入"UI 组件库统一来源"约束（通过 delta spec，与 `nuxt-public/` 共享同一套规范）。
- **清理**：`nuxt/nuxt.config.ts` 删除 `naiveui` 块、`@bg-dev/nuxt-naiveui` 模块、`build.transpile` 中的 `'naive-ui'`、`vite.optimizeDeps.include` 中的 `'naive-ui'`；公共路径的 `routeRules`（`/`、`/article/**`、`/gallery`、`/tutorials`、`/about`）删除；`sitemap` 块与 `prerender` 块删除；`vite.build.rollupOptions.output.manualChunks` 内 `mermaid` 分支按需保留（admin 文章编辑器用 mermaid 块）；`manualChunks` 内替换 `naive-ui` 分支为 `@nuxt/ui` 归入 `vendor-ui` chunk。
- **app.vue 清理**：删除 `router.afterEach` 中 gallery 滚动恢复守卫（72-84 行，gallery 路由删除后为死代码）；删除公共页面 SEO meta（admin 走 `useSeoMeta` 局部控制）。
- **SSR 修正**：`nuxt/app/pages/admin/imagebed/index.vue` 补 `definePageMeta({ ssr: false })`（其他 8 个 admin 页面都设了，此页缺）。

## Capabilities

### New Capabilities

- `admin-only-ssr`: `nuxt/` 项目收缩为纯 admin 容器的边界契约——定义项目唯一职责（管理后台）、保留/删除范围、SSR 运行时配置、admin 必备基建（auth store、admin-auth middleware、MarkdownRenderer、md-editor-v3、mermaid、katex、keen-slider、pixi.js）。明确**禁止**任何公共浏览功能（首页/文章/画廊/教程/关于）回退到 `nuxt/`。

### Modified Capabilities

- `ui-library`: 把"UI 组件库统一来源"约束从 `nuxt-public/` 扩展到 `nuxt-public/ + nuxt/` 双项目。`nuxt/package.json` SHALL NOT 声明 `naive-ui` 或 `@bg-dev/nuxt-naiveui`；`nuxt/nuxt.config.ts` 的 `modules` 数组 SHALL NOT 包含 `'@bg-dev/nuxt-naiveui'`；`nuxt/app/` 下 SHALL NOT 出现 `<n-xxx>` 组件实例、`useMessage()` / `useDialog()` / `useNotification()` 调用；admin 范围内 SHALL 使用 `@nuxt/ui` v4 组件、`useToast()` 替代 `useMessage()`、`<UForm>` + `valibot` schema 替代 `n-form + rules`。通过 delta spec 实现，保留 `nuxt-public/` 全部已有 requirements。

## Impact

- **依赖变更**：
  - 新增：`@nuxt/ui@^4.9`、`valibot@^1.x`、`@vueuse/motion`（admin 动效）
  - 移除：`naive-ui`、`@bg-dev/nuxt-naiveui`、`@nuxtjs/seo`
  - 保留：`tailwindcss@^3.4`（v3 暂不同步 v4）、`@tailwindcss/typography`、`@nuxt/fonts`、`@nuxt/icon`、`@nuxtjs/mdc`、`@pinia/nuxt`、`nuxt-vitalizer`
- **文件改动**：
  - 删除：~10 个 features/pages 文件 + 3 个 components + 1 个 composable + 1 个 layout + 1 个 plugin
  - 新增：`app/app.config.ts`（扩展 `ui.colors`）、`app/assets/css/main.css`（`@import '@nuxt/ui'` + `@theme`）
  - 修改：`app/app.vue`（加 `<UApp>`、清理 gallery 守卫）、`app/layouts/admin.vue` + `blank.vue`（删除 provider）、`nuxt.config.ts`、`package.json`
  - 替换：~14 个 admin 文件的 NaiveUI 组件实例
- **行为变化**：
  - `useAuthStore` 不变（admin 专用，无公共页面 state 泄漏）
  - `middleware/admin-auth.ts` 不变（仅守护 `/admin/*`）
  - `useTheme.ts` 整体删除（仅 default.vue 引用，admin 内的 `isDarkMode` 由 `layouts/admin.vue` 内 `useState('isDarkMode')` 直接管理，迁移到 Nuxt UI 后改用 `useColorMode`）
  - dark mode 切换：迁移到 `@nuxtjs/color-mode`（`<html>.dark`/`.light`），与 `nuxt-public/` 保持一致
  - 表单提交：admin 登录、密码修改、画廊配置、图床配置 4 处表单由 `n-form + rules` 改为 `UForm + valibot`，行为等价
  - 分页：组件对外 emit API 保持不变（`update:page`）
- **SSR 与构建**：
  - `nuxt/nitro.preset` 仍为 `node-server`（admin 运行时 SSR）
  - `app.buildAssetsDir: '/_ssr/'` 保留
  - `pages/admin/imagebed/index.vue` 补 `ssr: false` 避免 hydration mismatch
  - 构建体积：移除 NaiveUI（~300KB gzipped）后增加 Nuxt UI v4（~150KB gzipped），整体下降
- **浏览器底线**：与 `nuxt-public/` 一致（Safari 16.4+ / Chrome 111+ / Firefox 128+），无新增要求
- **技术债清理**：
  - 删除 `components/LoadingBar.vue`（已死代码）
  - 删除 `components/CommentSection.vue`（仅 article-detail 引用，admin 不依赖）
  - 删除 `composables/useTheme.ts`（仅 default.vue 引用）
  - 删除 `app/plugins/naive-ui.client.ts`（Phase 4 整体删除）
  - 删除 `app.vue` 中 gallery 滚动守卫（72-84 行）
- **公开行为变化**：
  - 公共浏览入口（/、/article/*、/gallery、/tutorials、/about）**全部由 `nuxt-public/` 提供**
  - `nuxt/` 部署后**仅**响应 `/admin/*`、`/api/*`、`/images/*`、`/_ssr/*` 路径
  - 跨项目导航规则不变（admin 跳公开用 `<a>` 跨站跳转，admin 内部用 `NuxtLink`）
- **风险**：
  - 删除 `default.vue` 后 9 个 admin 页面已显式 `definePageMeta({ layout: 'admin' })`，**无 layout 解析风险**
  - `pages/admin/login.vue` 用 `layout: false` 直接渲染自定义 UI，不依赖 layout 级 provider
  - `MarkdownRenderer.vue` 必须保留（admin 文章编辑器预览依赖）
  - `keen-slider`、`mermaid`、`md-editor-v3`、`pixi.js` 在 admin 内仍被使用，**不得删除**
  - `pixi.js` 12MB 仅 mania 音游使用——但 mania 路径**不存在**（用户假设错误），需在 Phase 0 确认是否有隐藏引用，否则 pixi.js 也可卸
- **回滚**：单分支工作区 `git restore` 即可；无数据/接口/CI 变更。

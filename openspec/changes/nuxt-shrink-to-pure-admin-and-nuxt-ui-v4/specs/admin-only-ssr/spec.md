# admin-only-ssr Specification

## Purpose
定义 `nuxt/` 项目作为"纯 admin 容器"的范围、边界与运行时契约。本 spec 明确 `nuxt/` 部署后**仅**响应 admin 相关路径（`/admin/*`、`/api/*`、`/images/*`、`/_ssr/*`），禁止任何公共浏览功能（首页、文章、画廊、教程、关于）回退到 `nuxt/`。

## Requirements

### Requirement: 路由职责单一

`nuxt/` SHALL 仅作为 `WyrmKk` 博客系统的 **admin 管理后台** 运行时容器。`nuxt/app/pages/` 下的路由 SHALL 仅包含 `/admin/*` 子树，不存在 `/`、`/article/*`、`/gallery`、`/tutorials`、`/about` 等公共浏览路由。

#### Scenario: 公共浏览路由不存在

- **WHEN** 检查 `nuxt/app/pages/` 目录结构
- **THEN** 目录树仅包含 `admin/` 子目录（与必要的 `index.vue` / `login.vue` 兜底），无 `index.vue`、`article/`、`gallery.vue`、`tutorials.vue`、`about.vue`

#### Scenario: 公共浏览 features 不存在

- **WHEN** 检查 `nuxt/app/features/` 目录结构
- **THEN** 目录树仅包含 `article-admin/`、`gallery-admin/` 等 admin 专用子目录，无 `home/`、`article-list/`、`article-detail/`、`gallery-public/`、`tutorials/`

### Requirement: 公共组件清理

`nuxt/app/components/CommentSection.vue`、`LoadingBar.vue`、`composables/useTheme.ts` SHALL NOT 存在（公共浏览职责移除后无引用）。`components/MarkdownRenderer.vue` SHALL 保留（被 `AdminArticleEditorContainer.vue` 引用，admin 文章编辑器预览依赖）。

#### Scenario: 死代码清理

- **WHEN** 检查 `nuxt/app/components/CommentSection.vue` 与 `nuxt/app/components/LoadingBar.vue` 是否存在
- **THEN** 文件均不存在

#### Scenario: MarkdownRenderer 保留

- **WHEN** 检查 `nuxt/app/components/MarkdownRenderer.vue` 是否存在
- **THEN** 文件存在且被 admin 文章编辑器容器引用

#### Scenario: useTheme 清理

- **WHEN** 检查 `nuxt/app/composables/useTheme.ts` 是否存在
- **THEN** 文件不存在（admin 改用 `useColorMode` 来自 `@nuxtjs/color-mode`）

### Requirement: 公共 layout 清理

`nuxt/app/layouts/default.vue` SHALL NOT 存在。所有 admin 页面 SHALL 通过 `definePageMeta({ layout: 'admin' })` 显式声明使用 `admin.vue` 布局；登录页面 SHALL 通过 `definePageMeta({ layout: false })` 跳过 layout 包裹。

#### Scenario: default layout 不存在

- **WHEN** 检查 `nuxt/app/layouts/` 目录
- **THEN** 仅存在 `admin.vue` 与 `blank.vue`

#### Scenario: admin 页面显式声明 layout

- **WHEN** 检查 `nuxt/app/pages/admin/**` 下每个页面文件
- **THEN** 每个文件都包含 `definePageMeta({ layout: 'admin' })` 或 `definePageMeta({ layout: false })`（login 用 false）

#### Scenario: 删除 default.vue 后 admin build 通过

- **WHEN** `nuxt/app/layouts/default.vue` 被删除
- **THEN** `npm run build` 成功，admin 关键路径（`/admin/login`、`/admin/index`、`/admin/articles`）可访问

### Requirement: app.vue 死代码清理

`nuxt/app/app.vue` SHALL NOT 包含对已删除公共路由的引用代码。`router.afterEach` 中针对 `gallery` 路由的滚动恢复守卫 SHALL NOT 存在。

#### Scenario: gallery 守卫清理

- **WHEN** 检查 `nuxt/app/app.vue` 中 `router.afterEach` 守卫
- **THEN** 守卫不引用 `from.name === 'gallery'` 等已删除路由名

#### Scenario: useSeoMeta 简化

- **WHEN** 检查 `nuxt/app/app.vue` 中 `useSeoMeta` 调用
- **THEN** 仅保留 admin 基础 meta（title、description、theme-color），无 og:image / twitter card 等公共浏览专属元数据

### Requirement: SSR 路由保护

所有 admin 页面 SHALL 在客户端渲染（`definePageMeta({ ssr: false })`），避免 NaiveUI → Nuxt UI 迁移期间 SSR hydration mismatch。

#### Scenario: admin 页面 ssr: false

- **WHEN** 检查 `nuxt/app/pages/admin/**` 下每个页面文件
- **THEN** 每个文件都包含 `definePageMeta({ ssr: false })` 或由 layout 级 ssr: false 继承

#### Scenario: imagebed 页 ssr: false 补齐

- **WHEN** 检查 `nuxt/app/pages/admin/imagebed/index.vue` 的 `definePageMeta` 调用
- **THEN** 包含 `ssr: false`（与 admin 其他页面一致）

### Requirement: nuxt.config.ts 配置收敛

`nuxt/nuxt.config.ts` SHALL NOT 包含公共浏览专属配置：sitemap 块、prerender 块、针对公共路径的 `routeRules`（`/`、`/article/**`、`/gallery`、`/about`、`/tutorials`）、`@bg-dev/nuxt-naiveui` 模块、`naiveui` 顶层配置块、`@nuxtjs/seo` 模块。

#### Scenario: 公共路径 routeRules 不存在

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `routeRules` 块
- **THEN** 不包含 `'/'`、`'/article/**'`、`'/gallery'`、`'/about'`、`'/tutorials'` 键

#### Scenario: NaiveUI 模块与配置不存在

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `modules` 数组与顶层配置
- **THEN** `modules` 不含 `'@bg-dev/nuxt-naiveui'`，顶层不含 `naiveui` 块

#### Scenario: 公共 SEO 块不存在

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `sitemap` 与 `prerender` 块
- **THEN** 两个块均不存在或 `sitemap.enabled === false`（admin 仍可保留 robots.txt 兜底）

### Requirement: 运行时配置保留

`nuxt/nuxt.config.ts` SHALL 保留 `runtimeConfig`（含 `apiSecret`、`apiBaseServer`、`public.apiBase`、`public.siteUrl`），admin 通过这些配置访问后端 API。

#### Scenario: apiBase 保留

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `runtimeConfig.public.apiBase`
- **THEN** 字段存在且指向 `/api` 或 `http://127.0.0.1:5000/api`（生产/开发环境）

#### Scenario: apiSecret 保留

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `runtimeConfig.apiSecret`
- **THEN** 字段存在且从 `process.env.API_SECRET` 读取（admin 后端认证用）

### Requirement: admin 基建完整保留

`nuxt/app/stores/auth.ts`、`nuxt/app/middleware/admin-auth.ts` SHALL 保留（admin 认证与路由守卫核心）。`layouts/admin.vue` 与 `blank.vue` SHALL 保留（admin 主布局与登录布局）。

#### Scenario: auth store 保留

- **WHEN** 检查 `nuxt/app/stores/auth.ts` 是否存在
- **THEN** 文件存在且导出 `useAuthStore` composable

#### Scenario: admin-auth middleware 保留

- **WHEN** 检查 `nuxt/app/middleware/admin-auth.ts` 是否存在
- **THEN** 文件存在且在所有 `/admin/*` 页面 `definePageMeta` 中被声明为 `middleware: ['admin-auth']`

### Requirement: Markdown 渲染管线保留

`nuxt/nuxt.config.ts` 的 `modules` 数组 SHALL 包含 `'@nuxtjs/mdc'`（admin 文章编辑器 Markdown 预览依赖）且 SHALL NOT 包含 `'@nuxtjs/seo'`（admin 无公共 SEO 需求）。`nuxt.config.ts` 的 `css` 数组 SHALL 包含 `'katex/dist/katex.min.css'`（admin 文章编辑器数学公式渲染依赖）。

#### Scenario: MDC 模块保留

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `modules` 数组
- **THEN** 包含 `'@nuxtjs/mdc'`，不包含 `'@nuxtjs/seo'`

#### Scenario: katex 样式保留

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `css` 数组
- **THEN** 包含 `'katex/dist/katex.min.css'`（admin 文章编辑器数学公式渲染依赖）

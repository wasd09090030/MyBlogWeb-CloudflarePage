# ui-library-nuxt-ssr 规格增量（admin-only）

> **状态**: 🟡 待执行 — 依赖 OpenSpec change `nuxt-ssr-tailwind-v4-upgrade` 已合并。
> 本 spec 作为 `nuxt/` 后台 SSR 站 admin 部分的 UI 库长期契约。`nuxt/` 公开页由 `nuxt-public/` SSG 静态站承载，不在本 spec 范围。
> 原始 capability 见 nuxt-public change `archive/2026-07-14-nuxt-ui-migration/specs/ui-library/spec.md`；本 spec 在其基础上扩展 nuxt/ admin 特有的 Pinia、md-editor-v3 豁免等约束。

## ADDED Requirements

### Requirement: UI 组件库统一来源（admin 范围）

`nuxt/` 后台 SSR 站的 **admin 部分** SHALL 使用 `@nuxt/ui`（v4 稳定版，^4.9.0）作为唯一组件库来源。`package.json` SHALL NOT 声明 `naive-ui` 或 `@bg-dev/nuxt-naiveui` 作为依赖；`nuxt.config.ts` 的 `modules` 数组 SHALL NOT 包含 `'@bg-dev/nuxt-naiveui'`；admin 范围（`pages/admin/*`、`features/article-admin/*`、`features/gallery-admin/*`、`layouts/admin.vue`、`layouts/blank.vue`、`components/MdEditorWrapper.client.vue` 内部允许豁免）下 SHALL NOT 出现 `<n-xxx>` 组件实例、`useMessage()` / `useDialog()` / `useNotification()` / `useLoadingBar()` 调用。

#### Scenario: 依赖检查

- **WHEN** 检查 `nuxt/package.json`
- **THEN** 依赖列表中**不包含** `naive-ui` 与 `@bg-dev/nuxt-naiveui`，且**包含** `@nuxt/ui`（^4.9.0）

#### Scenario: admin 范围源码残留检查

- **WHEN** 在 admin 范围 grep `n-[a-z]` 或 `from 'naive-ui'` 或 `useMessage` 或 `useDialog`
- **THEN** 仅 `MdEditorWrapper.client.vue` 内部允许保留 md-editor-v3 自带 toolbar 的 `<n-*>` 引用（待 Phase B.3 显式清理）；其他业务代码无命中

#### Scenario: 公开页范围不在本 spec 范围

- **WHEN** 在 `nuxt/app/pages/{index,gallery,article,about,tutorials,tools,mania}/` 或 `layouts/default.vue` 或公开页 `components/`、`features/` 中 grep `<n-*>` 或 `naive-ui`
- **THEN** 命中不视为本 spec violation（公开页由 `nuxt-public/` 承载；后续独立 cleanup change 处理）

### Requirement: 豁免的特殊组件（admin 范围）

下列特殊组件 SHALL 保留其原有专业库依赖，不被 Nuxt UI 替换：

- `nuxt/app/components/MdEditorWrapper.client.vue`：使用 `md-editor-v3` 富文本编辑器；Nuxt UI 无等价。仅豁免本文件内的 md-editor-v3 自带 toolbar 与编辑器核心 API；外层 admin 编辑器（`AdminArticleEditorContainer.vue`）的 `<n-*>` 引用仍需替换。

#### Scenario: 豁免组件存在

- **WHEN** 检查 `nuxt/app/components/MdEditorWrapper.client.vue`
- **THEN** 文件存在并继续 import `md-editor-v3`

#### Scenario: 豁免组件核心不受污染

- **WHEN** 检查 `MdEditorWrapper.client.vue` 的核心编辑器 API 调用（如 `MdEditor` 组件、`MdEditor.previewOnly` 等）
- **THEN** 这些调用未被 Nuxt UI 替换；组件继续作为 admin 文章编辑器的富文本入口

### Requirement: UApp 全局包裹

`nuxt/app/app.vue` SHALL 用 `<UApp>` 组件作为根模板包裹 `<NuxtLayout>`。`nuxt/app/layouts/*.vue` 的 `<script setup>` SHALL NOT 导入 `naive-ui` 的 provider 类（`NConfigProvider`、`NMessageProvider`、`NDialogProvider`、`useMessage`、`useDialog` 等）。

#### Scenario: 根模板渲染

- **WHEN** 浏览器加载任何 `nuxt/` 页面（admin 或公开页）
- **THEN** DOM 根结构包含 `<UApp>` 标识节点，并内嵌 `<NuxtLayout>` 内容

#### Scenario: Toast/Tooltip 全局可用

- **WHEN** admin 任意组件调用 `useToast().add(...)` 或使用 `<UTooltip>`
- **THEN** 调用不抛"missing provider"错误，toast 正常显示在 `<body>`，tooltip 正常跟随鼠标

### Requirement: 主题配置通过 app.config.ts + main.css

主题色 SHALL 通过 `nuxt/app/app.config.ts` 的 `ui.colors` 配置；自定义设计 token（如 border radius）SHALL 通过 `nuxt/app/assets/css/main.css` 的 Tailwind v4 `@theme` 指令定义。`admin.vue` 与 `blank.vue` SHALL NOT 维护 `themeOverrides` 计算属性或 `import { darkTheme } from 'naive-ui'`。

#### Scenario: primary 色生效

- **WHEN** `app.config.ts` 中 `ui.colors.primary = 'blue'`
- **THEN** admin `<UButton color="primary">` 渲染为蓝色（与 Tailwind `blue-500` 一致），hover 态为 `blue-400`

#### Scenario: Dropdown 圆角生效

- **WHEN** `main.css` 的 `@theme` 块设置 `--radius-md: 0.5rem`
- **THEN** admin `<UDropdownMenu>` 与 `<UModal>` 容器应用该圆角值

### Requirement: 暗色模式 class 策略（admin 范围）

admin dark mode SHALL 通过 `<html>` 元素上的 `.dark` class 驱动。admin `useTheme` composable SHALL 仅同步 `.dark` class 与 `colorScheme` 样式属性；SHALL NOT 维护 `.dark-theme` / `.light-theme` / `data-theme` 等冗余标记（admin layout 范围内）。

#### Scenario: 主题切换

- **WHEN** admin 用户点击主题切换按钮调用 `useTheme().toggleTheme()` 或 `useColorMode().preference = 'dark'`
- **THEN** `<html>` 元素的 `class` 列表切换包含或不包含 `dark`；admin Nuxt UI 组件的 `dark:` 变体立即生效

#### Scenario: 跨刷新保持

- **WHEN** admin 用户刷新页面
- **THEN** `useTheme().initTheme()` 或 `@nuxtjs/color-mode` 从 localStorage 读取偏好并恢复 `.dark` class

### Requirement: admin 表单使用 valibot schema

admin `<UForm>` 组件 SHALL 接收 `:schema` prop 为 `valibot` schema 对象（不是 rules 数组）；每个输入字段 SHALL 用 `<UFormField name>` 包裹，`name` 与 schema 字段名一致。错误信息 SHALL 通过 schema 的 `v.pipe` 第二参数定义。

适用范围：admin/login、admin/password、admin/articles、AdminArticleEditorContainer。

#### Scenario: 必填校验

- **WHEN** admin 用户提交登录表单且 username 为空
- **THEN** `<UFormField name="username">` 自动显示 schema 中定义的错误信息（不依赖父组件手动控制）

#### Scenario: 校验触发时机

- **WHEN** `<UForm validate-on="blur">` 配置
- **THEN** 字段失焦时校验，与 NaiveUI `trigger: 'blur'` 等价

### Requirement: Pinia store 内 useToast 调用规范

admin Pinia store 内 SHALL NOT 在 `$fetch` 回调、异步函数或条件分支中调用 `useToast()`。`useToast()` SHALL 在 store factory 函数的 `setup()` 顶层同步调用，并保留到闭包中供 action 使用。

#### Scenario: store action 内 toast

- **WHEN** `useArticleStore().create(data)` 执行成功
- **THEN** toast 显示 "创建成功"；调用不抛 "composable invoked without active context" 错误

### Requirement: admin 表格使用 UTable

admin 列表页（admin/articles、admin/comments、admin/gallery）SHALL 使用 `<UTable>` 渲染数据表。`<UTable>` SHALL 配合手动分页/筛选（若 Nuxt UI v4 早期版本功能不完整），不应回退到 `<n-data-table>`。

#### Scenario: admin 列表渲染

- **WHEN** 浏览器访问 `/admin/articles`
- **THEN** 表格渲染与 Phase B.3 启动前的 PoC 基线一致；分页、筛选、排序操作可用

### Requirement: admin 上传使用 UFileUpload

admin 图床（admin/imagebed）SHALL 使用 `<UFileUpload>` 组件替换 `<n-upload>`。文件压缩 SHALL 仍由 `browser-image-compression` 兜底（在 `<UFileUpload>` 的 `@change` 回调中调用）。

#### Scenario: 图床拖拽上传

- **WHEN** 用户在 `/admin/imagebed` 拖拽图片到上传区域
- **THEN** `<UFileUpload>` 触发 `@change`；`browser-image-compression` 压缩；上传成功后显示 toast 与新文件项

### Requirement: 构建配置无 NaiveUI 残留

`nuxt/nuxt.config.ts` SHALL NOT 包含以下字段：

- `naiveui` 顶层配置块
- `build.transpile` 中的 `'naive-ui'`
- `vite.optimizeDeps.include` 中的 `'naive-ui'`
- `vite.build.rollupOptions.output.manualChunks` 中 `node_modules/naive-ui` 分支

`vite.build.rollupOptions.output.manualChunks` SHALL 将 `@nuxt/ui` 包归入 `vendor-ui` chunk（命名保持稳定以利于缓存）。

#### Scenario: 构建成功

- **WHEN** 执行 `pnpm build`
- **THEN** 构建无 NaiveUI 相关警告或错误；`vendor-ui` chunk 存在且包含 `@nuxt/ui` 模块

### Requirement: 模态与抽屉 API 对齐（admin 范围）

admin `<UModal>` 与 `<UDrawer>` SHALL 使用 `v-model:open` 双向绑定（不是 NaiveUI 的 `v-model:show`）。`<UModal>` 的操作按钮 SHALL 放在 `<template #footer>` 插槽。

#### Scenario: admin 弹窗关闭

- **WHEN** admin 用户关闭文章删除确认模态
- **THEN** `<UModal v-model:open="deleteConfirmOpen">` 状态变 false；按钮 `<UButton @click="deleteConfirmOpen = false">` 与 footer 插槽正常工作

### Requirement: 浏览器支持底线

`nuxt/` SHALL 维持 Safari 16.4+ / Chrome 111+ / Firefox 128+ 浏览器支持底线（与 Tailwind v4 升级保持一致）。

#### Scenario: 浏览器基线

- **WHEN** CI 或 README 文档记录浏览器支持
- **THEN** 上述三个浏览器及其以上版本被明确列出

### Requirement: SSR 产物不含 NaiveUI 代码

`nuxt/.output/server/` 的 SSR 构建产物 SHALL NOT 包含 `naive-ui` 相关的 JavaScript bundle（chunk 名 `vendor-ui` 内仅含 `@nuxt/ui` 依赖）。

#### Scenario: 构建产物审计

- **WHEN** 检查 `.output/server/chunks/` 与 `.output/public/_nuxt/*.js` 文件名与内容
- **THEN** 无文件包含字符串 `"naive-ui"` 或 `"useMessage"` 的运行时实现

### Requirement: CSS 审计脚本持续通过

`nuxt/package.json` 的 `css:audit` 与 `css:imports:audit` 脚本 SHALL 在所有 Phase（B.1-B.4）完成后保持 0 violation。

#### Scenario: 硬约束保持

- **WHEN** 执行 `pnpm css:audit && pnpm css:imports:audit`
- **THEN** 退出码为 0，无 violation 报告

### Requirement: 公开页文件保留不动

本 change SHALL NOT 删除 `nuxt/` 中的公开页文件（详见 `nuxt-ssr-tailwind-v4-upgrade` change 的 `Requirement: 公开页文件保留不动`）。公开页由 `nuxt-public/` 承载；公开页清理留后续独立 cleanup change。

> **2026-07-17 同步**：原 `nuxt/` 中的 `pages/tools/`、`pages/mania/`、`components/ImageProcessor.vue`、`components/MarkdownConverter.vue`、`components/mania/*` 等公开页文件已由前置 change `remove-mania-and-tools-pages` 删除。剩余公开页文件继续由本 spec 与 `nuxt-ssr-tailwind-v4-upgrade` 共同约束。

#### Scenario: 剩余公开页文件保留

- **WHEN** Phase B 完成后检查 `nuxt/app/` 目录
- **THEN** 剩余公开页文件（`pages/index.vue`、`pages/gallery.vue`、`pages/about.vue`、`pages/tutorials.vue`、`pages/article/`、`layouts/default.vue`、`components/MarkdownRenderer.vue`、`components/CommentSection.vue`、`components/SideBar.vue`、`components/WelcomeSection.vue`、`components/Effects/*`、`components/content/*`、`features/home/`、`features/article-list/`、`features/article-detail/`、`features/gallery-public/`、`features/tutorials/`）全部保留存在；除前置 change 已删的外，未被本次 change 删除
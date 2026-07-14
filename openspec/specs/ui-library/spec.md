# ui-library Specification

## Purpose
TBD - created by archiving change nuxt-ui-migration. Update Purpose after archive.
## Requirements
### Requirement: UI 组件库统一来源

`nuxt-public/` SHALL 使用 `@nuxt/ui`（v3 稳定版）作为唯一组件库来源。`package.json` SHALL NOT 声明 `naive-ui` 或 `@bg-dev/nuxt-naiveui` 作为依赖；`nuxt.config.ts` 的 `modules` 数组 SHALL NOT 包含 `'@bg-dev/nuxt-naiveui'`；`app/` 下 SHALL NOT 出现 `<n-xxx>` 组件实例、`useMessage()` / `useDialog()` / `useNotification()` / `useLoadingBar()` 调用。

#### Scenario: 依赖检查

- **WHEN** 检查 `nuxt-public/package.json`
- **THEN** 依赖列表中**不包含** `naive-ui` 与 `@bg-dev/nuxt-naiveui`，且**包含** `@nuxt/ui`

#### Scenario: 源码残留检查

- **WHEN** 在 `nuxt-public/app/` 全局 grep `n-[a-z]` 或 `naive-ui` 或 `useMessage`
- **THEN** 无业务代码命中（仅允许注释或文档字符串提及历史）

### Requirement: UApp 全局包裹

`app/app.vue` SHALL 用 `<UApp>` 组件作为根模板包裹 `<NuxtPage />`（或 `<NuxtLayout>`）。`app/layouts/*.vue` 的 `<script setup>` SHALL NOT 导入 `naive-ui` 的 provider 类。

#### Scenario: 根模板渲染

- **WHEN** 浏览器加载任何 `nuxt-public/` 页面
- **THEN** DOM 根结构包含 `<UApp>`（编译后为 `data-slot="app"` 标识节点），并内嵌 `<NuxtPage>` 内容

#### Scenario: Toast/Tooltip 全局可用

- **WHEN** 任意组件调用 `useToast().add(...)` 或使用 `<UTooltip>`
- **THEN** 调用不抛"missing provider"错误，toast 正常显示在 `<body>`，tooltip 正常跟随鼠标

### Requirement: 主题配置通过 app.config.ts

主题色 SHALL 通过 `app/app.config.ts` 的 `ui.colors` 配置；自定义设计 token（如 border radius）SHALL 通过 `app/assets/css/main.css` 的 Tailwind v4 `@theme` 指令定义。`default.vue` SHALL NOT 维护 `themeOverrides` 计算属性。

#### Scenario: primary 色生效

- **WHEN** `app.config.ts` 中 `ui.colors.primary = 'blue'`
- **THEN** `<UButton color="primary">` 渲染为蓝色（与 Tailwind `blue-500` 一致），hover 态为 `blue-400`

#### Scenario: Dropdown 圆角生效

- **WHEN** `main.css` 的 `@theme` 块设置 `--radius: 0.75rem`
- **THEN** `<UDropdownMenu>` 容器应用该圆角值

### Requirement: 暗色模式 class 策略

dark mode SHALL 通过 `<html>` 元素上的 `.dark` class 驱动。`useTheme` composable SHALL 仅同步 `.dark` class 与 `colorScheme` 样式属性；SHALL NOT 维护 `.dark-theme` / `.light-theme` / `data-theme` 等冗余标记。

#### Scenario: 主题切换

- **WHEN** 用户点击主题切换按钮调用 `useTheme().toggleTheme()`
- **THEN** `<html>` 元素的 `class` 列表切换包含或不包含 `dark`；Nuxt UI 组件的 `dark:` 变体立即生效

#### Scenario: 跨刷新保持

- **WHEN** 用户刷新页面
- **THEN** `useTheme().initTheme()` 从 `localStorage.darkMode` 读取偏好并恢复 `.dark` class

### Requirement: 表单使用 valibot schema

`<UForm>` 组件 SHALL 接收 `:schema` prop 为 `valibot` schema 对象（不是 rules 数组）；每个输入字段 SHALL 用 `<UFormField name>` 包裹，`name` 与 schema 字段名一致。错误信息 SHALL 通过 schema 的 `v.pipe` 第二参数定义。

#### Scenario: 必填校验

- **WHEN** 用户提交评论且 author 为空
- **THEN** `<UFormField name="author">` 自动显示 schema 中定义的错误信息（不依赖父组件手动控制）

#### Scenario: 校验触发时机

- **WHEN** `<UForm validate-on="blur">` 配置
- **THEN** 字段失焦时校验，与 NaiveUI `trigger: 'blur'` 等价

### Requirement: 构建配置无 NaiveUI 残留

`nuxt.config.ts` SHALL NOT 包含以下字段：
- `naiveui` 顶层配置块
- `build.transpile` 中的 `'naive-ui'`
- `vite.optimizeDeps.include` 中的 `'naive-ui'`

`vite.build.rollupOptions.output.manualChunks` SHALL 将 `@nuxt/ui` 包归入 `vendor-ui` chunk（命名保持稳定以利于缓存）。

#### Scenario: 构建成功

- **WHEN** 执行 `npm run generate`
- **THEN** 构建无 NaiveUI 相关警告或错误；`vendor-ui` chunk 存在且包含 `@nuxt/ui` 模块

### Requirement: 无 Loading Bar Provider

`app/components/LoadingBar.vue` SHALL NOT 存在；`app/` SHALL NOT 引用 `<n-loading-bar-provider>` 或 NaiveUI 的 `useLoadingBar`。路由进度条由 `app.vue` 中的 `<NuxtLoadingIndicator>`（Nuxt 内建）提供。

#### Scenario: 死代码清理

- **WHEN** 检查 `app/components/LoadingBar.vue` 是否存在
- **THEN** 文件不存在（已被删除）

### Requirement: 静态生成产物不含运行时 NaiveUI 代码

`nuxt-public/.output/public/` 的静态资源 SHALL NOT 包含 `naive-ui` 相关的 JavaScript bundle（chunk 名 `vendor-ui` 内仅含 `@nuxt/ui` 依赖）。

#### Scenario: 构建产物审计

- **WHEN** 检查 `.output/public/_nuxt/*.js` 文件名与内容
- **THEN** 无文件包含字符串 `"naive-ui"` 或 `"useMessage"` 的运行时实现

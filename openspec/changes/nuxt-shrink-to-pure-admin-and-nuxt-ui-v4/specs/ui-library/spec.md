> **⚠️ 实施状态：路径 C（仅范围收缩），本 delta spec 不再适用**
>
> 2026-07-22 实施中：Nuxt UI v3/v4 与 Tailwind v3 互斥，UI 迁移延后。本 spec 描述的"把 ui-library 约束扩展到 nuxt/"**不实施**，作为**未来 change 蓝图**保留。
>
> 当前 `nuxt/` 仍依赖 NaiveUI，`naive-ui` / `@bg-dev/nuxt-naiveui` / `<n-xxx>` / `useMessage()` 仍存在于 `nuxt/app/`。本 spec 的 SHALL NOT 约束需在**未来 Tailwind v4 升级 + Nuxt UI v4 迁移** change 中重新启用。

## MODIFIED Requirements

### Requirement: UI 组件库统一来源

`nuxt-public/` 与 `nuxt/` SHALL 使用 `@nuxt/ui`（v4 稳定版）作为唯一组件库来源。两个项目的 `package.json` SHALL NOT 声明 `naive-ui` 或 `@bg-dev/nuxt-naiveui` 作为依赖；两个项目的 `nuxt.config.ts` 的 `modules` 数组 SHALL NOT 包含 `'@bg-dev/nuxt-naiveui'`；两个项目的 `app/` 下 SHALL NOT 出现 `<n-xxx>` 组件实例、`useMessage()` / `useDialog()` / `useNotification()` / `useLoadingBar()` 调用。

#### Scenario: 依赖检查（双项目）

- **WHEN** 检查 `nuxt-public/package.json` 与 `nuxt/package.json`
- **THEN** 两个项目的依赖列表中**均不包含** `naive-ui` 与 `@bg-dev/nuxt-naiveui`，且**均包含** `@nuxt/ui` v4

#### Scenario: 源码残留检查（双项目）

- **WHEN** 在 `nuxt-public/app/` 与 `nuxt/app/` 全局 grep `n-[a-z]` 或 `naive-ui` 或 `useMessage` 或 `useDialog` 或 `useNotification`
- **THEN** 无业务代码命中（仅允许注释或文档字符串提及历史）

#### Scenario: 模块配置检查（双项目）

- **WHEN** 检查 `nuxt-public/nuxt.config.ts` 与 `nuxt/nuxt.config.ts` 的 `modules` 数组
- **THEN** 两个项目均不包含 `'@bg-dev/nuxt-naiveui'`

## ADDED Requirements

### Requirement: admin 范围内 valibot 表单

`nuxt/app/pages/admin/**` 与 `nuxt/app/features/article-admin/**`、`nuxt/app/features/gallery-admin/**` 内的所有 `<UForm>` 组件 SHALL 接收 `:schema` prop 为 `valibot` schema 对象（不是 NaiveUI rules 数组）。每个输入字段 SHALL 用 `<UFormField name>` 包裹，`name` 与 schema 字段名一致。错误信息 SHALL 通过 valibot `v.pipe` 第二参数定义。

#### Scenario: admin 登录表单必填校验

- **WHEN** 用户访问 `/admin/login` 且提交时 username 为空
- **THEN** `<UFormField name="username">` 自动显示 valibot schema 中定义的错误信息（不依赖父组件手动控制）

#### Scenario: admin 密码修改表单校验

- **WHEN** 用户在 `/admin/password` 修改密码且新密码长度不足
- **THEN** `<UFormField name="newPassword">` 显示 valibot minLength 校验错误

#### Scenario: 校验触发时机

- **WHEN** admin 表单 `<UForm validate-on="blur">` 配置
- **THEN** 字段失焦时校验，与 NaiveUI `trigger: 'blur'` 等价

### Requirement: admin 范围内 Toast API 统一

`nuxt/app/` 内 SHALL 使用 `useToast()`（来自 `@nuxt/ui`）替代 NaiveUI 的 `useMessage()`。所有 admin composable（如 `useAdminCommentsFeature`、`useAdminImagebedPage`）内的成功/警告/错误反馈 SHALL 通过 `useToast().add({ title, description, color })` 触发。

#### Scenario: 成功反馈

- **WHEN** admin 保存文章成功
- **THEN** `useToast().add({ title: '保存成功', color: 'success' })` 触发 toast 显示，不调用 `useMessage().success`

#### Scenario: 错误反馈

- **WHEN** admin 删除评论失败
- **THEN** `useToast().add({ title: '删除失败', description: error.message, color: 'error' })` 触发 toast，不调用 `useMessage().error`

### Requirement: admin 范围内 Dialog API 统一

`nuxt/app/` 内 SHALL 使用 Nuxt UI v4 的 `<UModal v-model:open>` 或 `useConfirm()`（来自 `@nuxt/ui`）替代 NaiveUI 的 `useDialog()`。所有 admin composable（如 `useAdminImagebedPage`）内的确认对话框与模态交互 SHALL 通过 Nuxt UI 组件实现，SHALL NOT 调用 `useDialog()` 或引用 `naive-ui` 的 `NDialogProvider`。

#### Scenario: admin 确认对话框

- **WHEN** admin composable 需要显示确认对话框（如批量删除图床文件）
- **THEN** 使用 `<UModal v-model:open>` 控制显示或 `useConfirm()` 触发确认，不调用 `useDialog()`

#### Scenario: 残留检查

- **WHEN** 在 `nuxt/app/` 全局 grep `useDialog` 或 `NDialogProvider`
- **THEN** 无业务代码命中

### Requirement: admin 范围内 Modal 与 Table 组件

admin 范围内的模态对话框 SHALL 使用 `<UModal>` 替代 `<n-modal>`；数据列表展示 SHALL 使用 `<UTable>` 替代 `<n-data-table>`；分页 SHALL 使用 `<UPagination>` 替代 `<n-pagination>` 且组件对外 emit `update:page` API 保持不变。

#### Scenario: 文章管理数据表

- **WHEN** admin 访问 `/admin/articles`
- **THEN** 列表用 `<UTable :rows :columns>` 渲染，列定义、排序、筛选行为与原 `<n-data-table>` 等价

#### Scenario: 画廊编辑模态

- **WHEN** admin 在画廊管理页点击"编辑图片"
- **THEN** `<UModal v-model:open>` 显示，原 `<n-modal :show>` 行为保留

#### Scenario: 分页组件 emit API

- **WHEN** admin 文章列表父容器监听 `update:page` 事件
- **THEN** `<UPagination>` 触发的事件签名（`update:page` + page 数字）与原 `<n-pagination>` 一致，父容器 `goToPage` / `syncPageFromQuery` 逻辑无需修改

### Requirement: admin 全局 UApp 包裹

`nuxt/app/app.vue` SHALL 用 `<UApp>` 组件作为根模板包裹 `<NuxtLayout>`（或 `<NuxtPage>`）。`nuxt/app/layouts/admin.vue` 与 `nuxt/app/layouts/blank.vue` 的 `<script setup>` SHALL NOT 导入 `naive-ui` 的 provider 类（`NConfigProvider`、`NMessageProvider`、`NDialogProvider`）。

#### Scenario: 根模板渲染

- **WHEN** 浏览器加载任何 `nuxt/admin/*` 页面
- **THEN** DOM 根结构包含 `<UApp>`（编译后为 `data-slot="app"` 标识节点），并内嵌 `<NuxtLayout>` 内容

#### Scenario: Toast/Tooltip 全局可用

- **WHEN** 任意 admin 组件调用 `useToast().add(...)` 或使用 `<UTooltip>`
- **THEN** 调用不抛"missing provider"错误，toast 正常显示在 `<body>`，tooltip 正常跟随鼠标

### Requirement: admin 范围 dark mode 切换

`nuxt/app/` SHALL 使用 `@nuxtjs/color-mode` 管理 dark mode（与 `nuxt-public/` 一致）。`<html>` 元素上的 `.dark` class SHALL 驱动所有 dark mode 样式。admin 范围内的 dark mode 切换组件 SHALL 调用 `useColorMode()`（来自 `@nuxtjs/color-mode`）替代手写 `useState('isDarkMode')`。

#### Scenario: 主题切换

- **WHEN** admin 用户点击布局内的主题切换按钮
- **THEN** `<html>` 元素的 `class` 列表切换包含或不包含 `dark`；Nuxt UI 组件的 `dark:` 变体立即生效

#### Scenario: 跨刷新保持

- **WHEN** admin 用户刷新页面
- **THEN** `useColorMode()` 从 `localStorage` 读取偏好并恢复 `.dark` class（由 `@nuxtjs/color-mode` 自动管理）

### Requirement: 构建产物不含 NaiveUI

`nuxt/.output/` 的 SSR 资源 SHALL NOT 包含 `naive-ui` 相关的 JavaScript bundle（chunk 名 `vendor-ui` 内仅含 `@nuxt/ui` 依赖）。

#### Scenario: 构建产物审计

- **WHEN** 检查 `nuxt/.output/server/**` 与 `nuxt/.output/public/_ssr/*.js` 文件名与内容
- **THEN** 无文件包含字符串 `"naive-ui"` 或 `"useMessage"` 的运行时实现

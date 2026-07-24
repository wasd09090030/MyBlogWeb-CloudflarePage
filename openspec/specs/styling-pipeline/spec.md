# styling-pipeline Specification

## Purpose
TBD - created by archiving change tailwind-v4-upgrade. Update Purpose after archive.
## Requirements
### Requirement: Tailwind v4 构建集成

nuxt-public 的样式管线 SHALL 使用 Tailwind CSS 4.x，并通过 `@tailwindcss/vite` 插件集成到 Nuxt 的 Vite 构建中；构建管线 SHALL NOT 依赖独立的 tailwindcss/autoprefixer PostCSS 插件链。

#### Scenario: 静态构建成功

- **WHEN** 执行 `npm run generate`
- **THEN** 构建成功完成，产物 CSS 中包含由 v4 引擎生成的工具类（如 `shadow-sm`、`rounded-sm` 新语义）

#### Scenario: 无 JS 配置残留

- **WHEN** 检查 nuxt-public 根目录
- **THEN** 不存在生效的 `tailwind.config.js`，Tailwind 定制全部位于 CSS 入口文件中

### Requirement: class 策略暗色模式保持

`dark:` 变体 SHALL 继续由根元素上的 `.dark` class 驱动（`@custom-variant dark (&:is(.dark *))`），与自建 `useTheme` 组合式的切换行为兼容。

#### Scenario: 手动切换暗色

- **WHEN** 用户通过主题开关切换（useTheme 在 `<html>` 上切 `.dark`）
- **THEN** 所有 `dark:` 工具类样式立即生效，与升级前行为一致（不跟随系统 prefers-color-scheme）

### Requirement: typography 定制以 CSS 承载

文章 prose 样式定制（`--tw-prose-*` 颜色变量、代码/引用/表格/图片元素样式、`prose-lg` 尺寸覆盖）SHALL 以 CSS 形式定义，且 `@tailwindcss/typography` 插件 SHALL 通过 CSS `@plugin` 指令加载。

#### Scenario: 文章详情渲染

- **WHEN** 访问文章详情页（MarkdownRenderer 输出 `prose prose-lg prose-pink dark:prose-invert`）
- **THEN** 正文颜色、链接粉色系、行内代码底色、引用块左边框、表格表头底色与升级前一致，明暗两态均成立

### Requirement: v3 视觉兼容基线

升级后 SHALL 提供 v3 兼容基础样式：未显式指定颜色的边框默认 gray-200、按钮 cursor 为 pointer，避免 v4 默认值变化（currentColor / cursor:default）造成的静默视觉回归。

#### Scenario: 未指定颜色的边框

- **WHEN** 模板或手写 CSS 使用 `border` 类而未指定 `border-{color}`
- **THEN** 边框颜色呈现 gray-200（与 v3 默认一致），而非继承文字颜色

### Requirement: nuxt/ 后台 SSR 站 admin-only 使用 Tailwind v4

`nuxt/` 后台 SSR 站 SHALL 使用 Tailwind CSS v4.x。`package.json` SHALL 声明 `tailwindcss@^4.x` 与 `@tailwindcss/vite` 作为依赖；SHALL NOT 声明 `tailwindcss@^3.x`、`autoprefixer`、`cssnano`、`postcss` 作为运行时依赖。

#### Scenario: 依赖检查

- **WHEN** 检查 `nuxt/package.json`
- **THEN** 依赖列表包含 `tailwindcss@^4.x` 与 `@tailwindcss/vite`；不包含 `autoprefixer`、`cssnano`、`postcss`

### Requirement: Tailwind v4 通过 Vite 插件集成

`nuxt/nuxt.config.ts` SHALL 通过 `vite.plugins` 注册 `@nuxt/vite` 的 `tailwindcss()` 函数。SHALL NOT 在 `postcss.plugins` 配置块中包含 `tailwindcss` 键。

#### Scenario: 构建配置

- **WHEN** 检查 `nuxt/nuxt.config.ts`
- **THEN** `vite.plugins` 数组包含 `tailwindcss()` 调用；不存在 `postcss` 顶层键

### Requirement: nuxt/ admin 子集不涉及 typography/prose 路径

`nuxt/app/assets/css/tailwind.css` SHALL **不**包含 `@plugin "@tailwindcss/typography"` 指令。`nuxt/` SHALL NOT 存在 `prose-theme.css` 文件。admin 后台的 6 个页面（index、login、password、articles、comments、imagebed；gallery 管理由 `features/gallery-admin/` 承载）与 `features/article-admin/`、`features/gallery-admin/` SHALL NOT 使用 `prose` 类。

#### Scenario: prose 路径不存在

- **WHEN** 在 `nuxt/` 范围 grep `@plugin "@tailwindcss/typography"` 或 `prose-theme.css` 或 admin 范围内的 `prose` 类
- **THEN** 无业务代码命中（admin 不用 prose；公开页与 typography 路径由 nuxt-public 承载）

### Requirement: 暗色模式通过 CSS @custom-variant 驱动

`nuxt/app/assets/css/tailwind.css` SHALL 通过 `@custom-variant dark (&:where(.dark, .dark *))` 定义 dark 变体策略。SHALL NOT 通过 `tailwind.config.js` 的 `darkMode: 'class'` 配置（该文件应不存在）。

#### Scenario: dark 变体生效

- **WHEN** `<html>` 元素含 `dark` class
- **THEN** admin 后台的 `dark:` 变体类在所有 admin 组件中生效；admin `useTheme` 的 `.dark` 同步机制保持兼容

### Requirement: 不引入 prose 排版的 SSR 优化

`nuxt/nuxt.config.ts` SHALL **不**设置 `experimental.inlineSSRStyles: false`（admin 不渲染 Markdown prose）。

#### Scenario: 配置无 inlineSSRStyles

- **WHEN** 检查 `nuxt/nuxt.config.ts` 的 `experimental` 字段
- **THEN** 不存在 `inlineSSRStyles: false`

### Requirement: v3 兼容基础样式

`nuxt/app/assets/css/tailwind.css` SHALL 包含 v3 兼容基础样式块（默认边框色、占位符色、按钮指针），降低未分层样式优先级变化带来的视觉回归。

#### Scenario: 视觉回归基线

- **WHEN** Phase A 完成后浏览器对比 Phase A 前后 admin 关键路径截图
- **THEN** 颜色、字体、按钮、链接视觉无明显回退

### Requirement: 浏览器支持底线

`nuxt/` SHALL 维持 Safari 16.4+ / Chrome 111+ / Firefox 128+ 浏览器支持底线（与 nuxt-public 一致）。

#### Scenario: 浏览器基线

- **WHEN** CI 或 README 文档记录浏览器支持
- **THEN** 上述三个浏览器及其以上版本被明确列出

### Requirement: NaiveUI 暂留待后续 change

本 change 仅升级 Tailwind，不替换 NaiveUI。`nuxt/` SHALL 仍保留 `naive-ui`、`@bg-dev/nuxt-naiveui` 依赖；`nuxt.config.ts` SHALL 仍包含 `naiveui` 配置块与 `build.transpile: ['naive-ui']`、`vite.optimizeDeps.include: ['naive-ui']`。NaiveUI 清理由后续 `nuxt-ssr-nuxt-ui-v4-migration` change 处理。

#### Scenario: NaiveUI 残留

- **WHEN** 在 `nuxt/` grep `naive-ui` 或 admin 范围内的 `<n-` 组件
- **THEN** 仍命中（admin 后台约 20 个文件含 `<n-*>`，待后续 change 替换）

### Requirement: CSS 审计脚本持续通过

`nuxt/package.json` 的 `css:audit` 与 `css:imports:audit` 脚本 SHALL 在 Phase A 完成后保持 0 violation。

#### Scenario: 硬约束保持

- **WHEN** 执行 `pnpm css:audit && pnpm css:imports:audit`
- **THEN** 退出码为 0，无 violation 报告

### Requirement: 公开页文件保留不动

本 change SHALL NOT 删除 `nuxt/` 中剩余的任何公开页文件（除前置 change `remove-mania-and-tools-pages` 已删除的外）。本 change 范围严格限定为 Tailwind v3→v4 升级，不涉及组件、features、依赖清理。

> **2026-07-17 同步说明**：原 spec 列举的 `pages/tools/`、`pages/mania/`、`components/ImageProcessor.vue`、`components/MarkdownConverter.vue`、`components/mania/*` 等公开页文件已由前置 change `remove-mania-and-tools-pages` 删除。剩余公开页文件（`pages/index.vue`、`pages/gallery.vue`、`pages/about.vue`、`pages/tutorials.vue`、`pages/article/`、`layouts/default.vue`、`components/MarkdownRenderer.vue`、`components/CommentSection.vue`、`components/SideBar.vue`、`components/WelcomeSection.vue`、`components/Effects/*`、`components/content/*`、`features/home/`、`features/article-list/`、`features/article-detail/`、`features/gallery-public/`、`features/tutorials/`）由 `nuxt-public/` 静态站承载，不属于本 change 范围。

#### Scenario: 剩余公开页文件保留

- **WHEN** Phase A 完成后检查 `nuxt/app/` 目录
- **THEN** 上述剩余公开页文件全部保留存在；除前置 change 已删的外，未被本次 change 删除


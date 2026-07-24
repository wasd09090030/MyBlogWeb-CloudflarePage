# styling-pipeline 规格增量（nuxt/ 后台 SSR 站 — admin-only）

> **状态**: 🟡 待执行 — 本 spec 由 nuxt/ 后台 SSR 站 Tailwind v3→v4 升级 change 提交，作为 `styling-pipeline` capability 的 nuxt/ admin 子集实例化。
> 原始 capability 见 nuxt-public change `archive/2026-07-14-tailwind-v4-upgrade/specs/styling-pipeline/spec.md`。
> 本 spec 明确 nuxt/ admin 子集**不**包含 typography/prose 路径。

## ADDED Requirements

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
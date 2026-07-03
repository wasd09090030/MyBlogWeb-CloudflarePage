# styling-pipeline 规格增量

## ADDED Requirements

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

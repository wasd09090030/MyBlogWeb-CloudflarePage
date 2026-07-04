# Tailwind CSS v3 → v4 升级（nuxt-public）

## Why

nuxt-public 目前使用 Tailwind CSS 3.4.19（PostCSS 集成）。后续规划（引入 Nuxt UI v4 替换 Naive UI 的设计语言、按需引入 Inspira UI 动效组件）都以 Tailwind v4 为硬性前置条件。先完成纯净的 v3→v4 升级，让站点在稳定状态下为后续 UI 演进解锁。

**范围决策（2026-07-03 与用户确认）**：

- 本次**仅升级 Tailwind**，Naive UI 原样保留（用户暂时保留，待稳定后再调研 Nuxt UI 替换——用户不喜欢 Naive UI 审美）。
- Nuxt UI、Inspira UI 的引入**明确划出本次范围**，各自作为后续独立 change。
- 关键调研结论：Inspira UI 不依赖 Nuxt UI，只需 Tailwind v4 + motion-v + tw-animate-css，升级完成后可独立引入。

## What Changes

- **BREAKING（构建层）**：`tailwindcss` 3.4.19 → 4.x；PostCSS 插件链（tailwindcss + autoprefixer + cssnano）改为 `@tailwindcss/vite` 插件；`nuxt.config.ts` 移除 `postcss` 配置块。
- `tailwind.css`：`@tailwind base/components/utilities` 指令 → `@import "tailwindcss"` + `@plugin "@tailwindcss/typography"` + `@custom-variant dark`。
- `tailwind.config.js`（JS 配置）退役：typography(prose) 定制移植为纯 CSS；`darkMode: 'class'` 改为 CSS `@custom-variant`；content 扫描交给 v4 自动探测。
  - 调研确认：实际使用的 prose 类仅 `prose prose-lg prose-pink dark:prose-invert`（MarkdownRenderer.vue）；config 中的 `blog` 变体是死配置（size 校验器不含 'blog'），不移植。
- 模板中 v3 工具类改名（官方升级工具处理）：`shadow`→`shadow-sm`、`shadow-sm`→`shadow-xs`、`rounded`→`rounded-sm`、`blur`→`blur-sm`、`flex-shrink-0`→`shrink-0` 等（约 180 处）。
- 添加 v3 兼容基础样式（默认边框色、占位符色、按钮指针），降低视觉回归风险。
- 不改动：Naive UI 及其模块配置、自建 useTheme 暗色模式、theme-variables.css 变量体系、组件级 desktop/mobile CSS 拆分。

## Capabilities

### New Capabilities

- `styling-pipeline`: nuxt-public 的样式构建管线要求——Tailwind v4 通过 Vite 插件集成、class 策略暗色模式、typography 定制以 CSS 承载、与 Naive UI 及手写 CSS 的层叠兼容。

### Modified Capabilities

（无——`responsive-styles-splitting` 等现有 spec 的需求不变，仅实现层受构建方式影响）

## Impact

- **依赖**：`tailwindcss` 升 4.x；新增 `@tailwindcss/vite`；移除 `autoprefixer`、`cssnano`、`postcss`（v4 内置处理）。`@tailwindcss/typography@0.5.19` 保留（支持 v4 `@plugin` 加载）。
- **文件**：`nuxt-public/package.json`、`nuxt.config.ts`、`app/assets/css/tailwind.css`、`tailwind.config.js`（删除）、约 30+ 个 `.vue` 文件的 class 改名。
- **浏览器支持底线抬升**：Safari 16.4+ / Chrome 111+ / Firefox 128+（v4 依赖 @property、color-mix 等）。
- **层叠行为变化**：v4 使用原生 `@layer`，未分层样式（Naive UI、手写 CSS）优先级高于 utilities，与 v3 不同，需全站视觉回归（重点：文章详情 prose、画廊、含 Naive UI 表单的页面、暗色模式）。
- **风险已识别**：后续引入 Inspira 时其主题模板的 `--radius-sm/md/lg/xl` 会与 theme-variables.css 同名变量冲突（本次不处理，记录给后续 change）。

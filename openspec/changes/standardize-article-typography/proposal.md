## Why

`nuxt-public` 的文章正文排版现在主要由 Tailwind Typography 的 `.prose` 类和多份手写 CSS 兜底控制，标题、段落、链接、表格、代码块等规则分散且与 Nuxt UI v4 的主题配置脱节。

本次变更将文章排版主系统收敛到 Nuxt UI Prose，使正文元素样式通过 `app.config.ts` 的 `ui.prose` 统一维护；CSS 只保留特殊内容与旧 HTML 兜底，降低后续维护成本并提升视觉一致性。

## What Changes

- 在 `nuxt-public` 启用 Nuxt UI v4 的 MDC Prose 组件接管 Markdown 标准元素渲染。
- 将标题、段落、链接、列表、引用、表格、行内代码、代码块、图片、分隔线等文章基础排版样式集中到 `app/app.config.ts` 的 `ui.prose`。
- 将 `MarkdownRenderer.vue` 的正文根类从 Tailwind Typography 主导的 `prose prose-* prose-pink dark:prose-invert` 收敛为项目语义类，例如 `article-prose`，并继续允许调用方传入 `customClass`。
- 收缩 `prose-theme.css`、`prose-custom.desktop.css`、`prose-custom.mobile.css` 的职责：只保留 Nuxt UI Prose 无法覆盖或不应覆盖的特殊内容兜底，例如 legacy `v-html`、KaTeX、Mermaid、自定义 MDC 块级组件、选中文本和必要的移动端微调。
- 保留现有 `@nuxtjs/mdc` 渲染管线、文章 AST/TOC 预解析、KaTeX、Mermaid 和自定义 MDC 组件能力，不做内容迁移。
- 不引入新的 UI 组件库，不改动态 SSR 前端 `nuxt/`。

## Capabilities

### New Capabilities

- `article-typography`: 定义 `nuxt-public` 文章正文排版的统一来源、兜底边界和验证要求。

### Modified Capabilities

- `styling-pipeline`: 更新文章 typography 定制来源要求，从 Tailwind Typography 手写 `.prose` CSS 主导，调整为标准 Markdown 元素由 Nuxt UI Prose 配置主导，CSS 仅承载特殊内容和 legacy fallback。

## Impact

- Affected code:
  - `nuxt-public/nuxt.config.ts`
  - `nuxt-public/app/app.config.ts`
  - `nuxt-public/app/components/MarkdownRenderer.vue`
  - `nuxt-public/app/assets/css/components/prose-theme.css`
  - `nuxt-public/app/assets/css/components/prose-custom.desktop.css`
  - `nuxt-public/app/assets/css/components/prose-custom.mobile.css`
- Affected systems:
  - `nuxt-public` 静态站文章详情、教程正文和所有复用 `MarkdownRenderer` 的页面。
- Dependencies:
  - 继续使用现有 `@nuxt/ui` v4、`@nuxtjs/mdc`、Tailwind v4。
  - 不新增运行时依赖。
- Risk:
  - 标准 Markdown 元素的 DOM 会改由 Nuxt UI Prose 组件输出，视觉细节可能与当前 `.prose` CSS 有差异。
  - legacy `v-html` 内容无法自动使用 MDC Prose 组件，需要保留薄 CSS 兜底。

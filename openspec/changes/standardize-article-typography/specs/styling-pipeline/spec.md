## MODIFIED Requirements

### Requirement: typography 定制以 Nuxt UI Prose 为主

nuxt-public 的文章标准 Markdown 元素 typography 定制 SHALL 以 Nuxt UI Prose 组件和 `app.config.ts` 的 `ui.prose` 配置为主。Tailwind v4 样式管线 SHALL NOT load `@tailwindcss/typography`; `.prose` / `.prose-*` CSS SHALL NOT be the styling contract for MDC-rendered article headings, paragraphs, links, tables, inline code, code blocks, blockquotes, images, or lists. CSS SHALL be limited to special content fallback and legacy HTML support as defined by `article-typography`.

#### Scenario: 文章详情渲染

- **WHEN** 访问文章详情页（MarkdownRenderer 输出 MDC-rendered article content）
- **THEN** 正文标题、段落、链接、列表、引用、表格、行内代码、代码块、图片和分隔线主要由 Nuxt UI Prose 组件与 `ui.prose` 配置决定，明暗两态均成立

#### Scenario: CSS fallback remains scoped

- **WHEN** 检查 prose 相关 CSS 文件
- **THEN** CSS 仅保留特殊内容、legacy HTML、选中文本、Mermaid、KaTeX、自定义 MDC 块级显示或移动端微调等 Nuxt UI Prose 不负责的规则

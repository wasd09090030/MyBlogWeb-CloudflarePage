## Context

`nuxt-public` 当前使用 `@nuxtjs/mdc` 解析文章 Markdown，并通过 `MarkdownRenderer.vue` 输出 `<MDCRenderer>` 或 legacy `v-html`。正文根类为 `prose prose-{size} prose-pink max-w-none dark:prose-invert`，视觉规则分布在 `prose-theme.css`、`prose-custom.desktop.css`、`prose-custom.mobile.css`。

Nuxt UI v4 已作为 `nuxt-public` 的唯一组件库接入。根据当前已安装的 Nuxt UI v4 文档，MDC/Content 场景下应通过 `nuxt.config.ts` 的 `ui.prose: true` 启用 Nuxt UI Prose 组件；Prose 组件样式通过 `app.config.ts` 的 `ui.prose` 覆盖。标准 Markdown 元素应进入 Nuxt UI Prose 系统，特殊内容继续由 CSS 或现有运行时代码兜底。

## Goals / Non-Goals

**Goals:**

- 用 Nuxt UI Prose 作为文章标准元素的主排版系统。
- 在 `app.config.ts` 集中维护标题、段落、链接、列表、引用、表格、行内代码、代码块、图片和分隔线样式。
- 将 CSS 收缩为特殊内容兜底，避免继续扩张 `.prose h1`、`.prose a`、`.prose table` 等元素级规则。
- 保持 `@nuxtjs/mdc`、AST/TOC 预解析、KaTeX、Mermaid 和自定义 MDC 组件行为不变。
- 保持 desktop/mobile CSS 文件物理分离约定。

**Non-Goals:**

- 不迁移动态 SSR 前端 `nuxt/`。
- 不重写 Markdown 解析、TOC 提取、KaTeX 或 Mermaid 渲染逻辑。
- 不引入新依赖或替换 `@nuxtjs/mdc`。
- 不追求与旧 Tailwind Typography 像素级一致；目标是 Nuxt UI 主题一致且视觉质量稳定。

## Decisions

### 1. 启用 Nuxt UI MDC Prose，而不是继续扩写 Tailwind Typography CSS

在 `nuxt-public/nuxt.config.ts` 添加 Nuxt UI 配置 `ui: { prose: true }`，让 MDC 渲染标准 Markdown 元素时使用 Nuxt UI Prose 组件。

理由：Nuxt UI v4 的 Prose 组件与 `app.config.ts`、Tailwind Variants 和 Nuxt UI tokens 对齐，后续维护标题/链接/表格/代码块时可以在一个配置点完成。继续扩写 `.prose` CSS 会让文章视觉与 Nuxt UI 主题逐步分裂。

备选方案：保留 Tailwind Typography 为主，仅整理 CSS。该方案改动小，但无法解决样式来源分散和 Nuxt UI 主题脱节的问题。

### 2. `app.config.ts` 管标准元素，CSS 管特殊内容和 fallback

标准 Markdown 元素进入 `ui.prose` 配置，包括 `h1`、`h2`、`h3`、`h4`、`p`、`a`、`ul`、`ol`、`li`、`blockquote`、`table`、`thead`、`th`、`td`、`code`、`pre`、`img`、`hr`。

CSS 保留以下职责：

- `article-prose` 根容器的宽度、少量上下文变量或 legacy HTML 基础兜底。
- KaTeX 横向滚动和公式间距。
- Mermaid 渲染后的 SVG/暗色模式兼容规则。
- 自定义 MDC 组件的块级显示规则。
- `v-html` 路径无法被 Nuxt UI Prose 组件接管的基础元素样式。
- 移动端只在 `prose-custom.mobile.css` 中用允许断点做必要微调。

### 3. `MarkdownRenderer` 使用语义根类 `article-prose`

`MarkdownRenderer.vue` 的 `proseClasses` 应从 `prose prose-{size} prose-pink max-w-none dark:prose-invert` 改为以 `article-prose` 为主，并保留 `customClass`。如果仍需兼容 legacy `v-html` 的元素级样式，可以在 CSS 中通过 `.article-prose` 提供薄兜底，而不是依赖 Tailwind Typography 的 `prose-*` 变体。

`size` prop 暂不删除，以避免破坏调用方 API；实现阶段应评估当前调用方是否实际传入不同 size。若保留该 prop，应映射为语义类或在后续变更中弃用，不继续依赖 `prose-lg`。

### 4. 分阶段收缩 CSS，避免一次性破坏特殊内容

第一阶段只迁移标准元素主样式和根类，保留特殊内容规则。第二阶段通过页面回归确认后，再删除已经由 Nuxt UI Prose 覆盖的 `.prose` 元素规则。实现时应优先替换选择器到 `.article-prose`，并明确哪些规则属于 legacy fallback。

## Risks / Trade-offs

- [Risk] Nuxt UI Prose 组件输出 DOM 与 Tailwind Typography 不同，可能影响现有 CSS 选择器。 → Mitigation: 先通过本地 Nuxt UI 组件源码确认 `base/root/link` 等 slot 名称，再改配置；CSS 兜底用 `.article-prose` 限域。
- [Risk] legacy `v-html` 不经过 MDC Prose 组件，视觉可能退化。 → Mitigation: 为 `.article-prose` 下的 `h1/p/a/table/code/pre` 保留薄兜底，仅覆盖 legacy HTML 必需项。
- [Risk] 代码块、Mermaid、KaTeX 都和 `<pre>/<code>` 有交叉。 → Mitigation: 标准代码块外观由 `ui.prose.pre/code` 管，Mermaid 替换后的 `.mermaid-diagram` 和 KaTeX `.katex-display` 继续由 CSS 管。
- [Risk] 旧 `styling-pipeline` spec 与新方案冲突。 → Mitigation: 在本 change 中修改该 requirement，明确 Tailwind v4 构建仍存在，但文章标准 typography 不再由 Tailwind Typography CSS 主导。

## Migration Plan

1. 添加 `ui.prose: true`，确保 Nuxt UI Prose 组件参与 MDC 渲染。
2. 在 `app.config.ts` 增加 `ui.prose` 配置，覆盖标准正文元素样式。
3. 调整 `MarkdownRenderer.vue` 的正文根类为 `article-prose`，保留 `customClass` 和现有渲染分支。
4. 将 CSS 文件职责收缩为特殊内容与 legacy fallback，遵守 desktop/mobile 分离规则。
5. 验证文章详情页的标题、段落、链接、表格、行内代码、代码块、KaTeX、Mermaid、暗色模式和移动端表现。

Rollback 策略：如果 Nuxt UI Prose 接管导致不可接受的渲染回归，可移除 `ui.mdc` 配置，恢复 `MarkdownRenderer` 的旧 `prose prose-lg prose-pink dark:prose-invert` 根类，并恢复原 CSS 文件内容。

## Open Questions

- `size` prop 是否仍有真实调用场景需要多尺寸正文。如果没有，实施时可保留 API 但不继续扩展；后续单独清理。
- 旧文章中 legacy `v-html` 的实际覆盖范围未知，实施时需要至少抽样一篇 HTML 内容或构造回归样例。

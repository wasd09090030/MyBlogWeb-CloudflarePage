## ADDED Requirements

### Requirement: Nuxt UI Prose is the primary article typography system

`nuxt-public` SHALL render standard Markdown article elements through Nuxt UI v4 Prose components when content is rendered by MDC. The project SHALL enable the Nuxt UI MDC/Prose integration through `nuxt.config.ts` and SHALL NOT install, load, or rely on Tailwind Typography `.prose-*` classes as the source for standard article element styling.

#### Scenario: MDC article uses Nuxt UI Prose

- **WHEN** `MarkdownRenderer` renders Markdown through `<MDCRenderer>`
- **THEN** headings, paragraphs, links, lists, blockquotes, tables, inline code, code blocks, images, and horizontal rules use Nuxt UI Prose component styling

#### Scenario: Tailwind Typography root classes are not the primary contract

- **WHEN** `MarkdownRenderer` computes the article root class list
- **THEN** the root class list uses a project semantic class such as `article-prose` and does not require `prose-pink` or `dark:prose-invert` for the standard MDC rendering path

### Requirement: Article typography is configured centrally

Standard article typography style overrides SHALL be centralized in `nuxt-public/app/app.config.ts` under `ui.prose`. The configuration SHALL cover the standard article elements that affect reading quality: headings, paragraphs, links, lists, blockquotes, tables, inline code, code blocks, images, and horizontal rules.

#### Scenario: Standard element style source is inspectable

- **WHEN** a developer needs to change article heading, paragraph, link, table, or code style
- **THEN** the primary implementation location is `nuxt-public/app/app.config.ts` under `ui.prose`

#### Scenario: Prose config uses component-compatible keys

- **WHEN** `ui.prose` config is inspected
- **THEN** component entries use keys and slots supported by the installed Nuxt UI Prose components, such as `base`, `root`, `link`, or other component-defined slots

### Requirement: CSS is limited to special content fallback

Global prose CSS SHALL be limited to behavior that Nuxt UI Prose does not own or cannot safely own: legacy `v-html` fallback, KaTeX, Mermaid, custom MDC block display, text selection, and viewport-specific adjustments. CSS SHALL NOT continue to be the primary source for standard MDC article element styling.

#### Scenario: Special content remains styled

- **WHEN** an article contains KaTeX formulas, Mermaid diagrams, or custom MDC blocks
- **THEN** those special contents retain their required layout and dark-mode fallback styles through scoped CSS rules

#### Scenario: Legacy HTML remains readable

- **WHEN** `MarkdownRenderer` renders legacy `htmlContent` through `v-html`
- **THEN** `.article-prose` fallback CSS provides readable base styles for common HTML elements that are not transformed into Nuxt UI Prose components

#### Scenario: CSS responsibility is explicit

- **WHEN** `prose-theme.css`, `prose-custom.desktop.css`, and `prose-custom.mobile.css` are inspected
- **THEN** their comments and selectors describe fallback or special-content responsibilities rather than broad Tailwind Typography ownership of standard MDC elements

### Requirement: Existing article rendering pipeline is preserved

The typography migration SHALL NOT replace `@nuxtjs/mdc`, article AST/TOC precomputation, KaTeX processing, Mermaid rendering, or custom MDC components. The change SHALL preserve existing rendering branches for precomputed AST, client-side Markdown parsing, legacy HTML fallback, loading state, error state, and empty state.

#### Scenario: Precomputed AST still renders

- **WHEN** `MarkdownRenderer` receives `precomputedAst`
- **THEN** it renders the AST without client-side reparsing and emits the precomputed TOC when available

#### Scenario: Mermaid still renders after Markdown

- **WHEN** Markdown contains a Mermaid code block
- **THEN** the existing Mermaid rendering path still converts the code block into a rendered diagram after MDC output is mounted

#### Scenario: Empty and error states remain unchanged

- **WHEN** Markdown parsing fails or no content exists
- **THEN** `MarkdownRenderer` continues to show the existing Nuxt UI error alert or shared empty state component

### Requirement: Typography migration is verifiable

The implementation SHALL include local verification covering type checking or static generation plus targeted visual smoke checks for standard article elements and special content.

#### Scenario: Static validation runs

- **WHEN** the change is implemented
- **THEN** `nuxt-public` passes an appropriate static validation command such as `npm exec vue-tsc -- --noEmit` or `npm run generate`

#### Scenario: Article visual smoke covers standard and special content

- **WHEN** a developer verifies the article detail page manually
- **THEN** the checked content includes headings, paragraphs, links, lists, blockquotes, tables, inline code, code blocks, images, KaTeX, Mermaid, dark mode, and mobile viewport behavior

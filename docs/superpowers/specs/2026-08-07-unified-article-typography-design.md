# Unified Article Typography Design

Date: 2026-08-07

## Goal

Make the public article detail page and the admin Markdown preview render the same article-content visual language. The shared scope includes standard Markdown, custom MDC components, and the public article table of contents (TOC). It does not include the surrounding admin workspace or public-site navigation.

The design borrows the restrained hierarchy and reading measure from `docs/NAV-AI-TYPOGRAPHY-REFERENCE.md`, while deliberately avoiding its `line-height: 2` rhythm. The current article rendering already feels too loose; the new target is a denser technical-reading rhythm with muted text and controlled use of the theme color.

## Confirmed Decisions

- Use a repository-level shared article-typography contract rather than maintain independent public and admin styles.
- Keep Nuxt UI v4 Prose and `@nuxtjs/mdc`; do not install `@tailwindcss/typography`.
- Render standard Markdown through a shared Nuxt UI `ui.prose` preset.
- Use the same semantic article root class and CSS token contract in both apps.
- Use a thin theme-color vertical rule for Markdown `h2` and `h3`, as well as the active TOC item.
- Keep the public article page wider than its body column: the page container and article header use one left alignment baseline; the body remains a separate reading measure.
- The admin preview matches article-content rendering only. It does not reproduce the public header, cover image, metadata, sidebar, or page shell.
- Preserve all existing parsing, TOC extraction, Mermaid, KaTeX, and MDC interaction behavior unless a visual parity defect requires a targeted change.

## Visual System

### Reading Geometry

- Public article page: widen the current detail body beyond `max-w-4xl` by one existing content-width step or an equivalent explicit width, while retaining responsive page padding.
- Article header and metadata: align to the page-content left edge.
- Article body: centered relative to the page content, with `max-width: 70ch` to `72ch`; use a single final value during implementation after browser comparison.
- Markdown body: `font-size: 1rem`, `line-height: 1.78`, and paragraph spacing near `0.95rem`. This is intentionally tighter than the reference site's `16px / 2 / 20px` rhythm.
- Mobile: retain available width and existing responsive padding. Long unbroken content, code, tables, KaTeX, and embeds scroll or wrap safely rather than widening the reading column.

### Color and Hierarchy

- Body text uses a stable neutral toned value in both themes, rather than an app-level blue/cyan/pink accent.
- Muted text is reserved for metadata, markers, and secondary labels.
- Theme color is limited to interactive focus/hover states, the `h2`/`h3` vertical rules, active TOC indication, and semantic MDC states.
- Do not use gradients, glow, shadow-based active states, or saturated full-surface backgrounds for prose navigation.
- Article title, Markdown headings, and body share the same neutral color family and a common left alignment.

### Standard Markdown

- `h2`: approximately `1.5rem`, strong weight, compact top/bottom spacing, and a `2px` to `3px` theme-color vertical rule.
- `h3`: approximately `1.25rem`, medium-to-strong weight, slightly smaller vertical rule, and tighter spacing than `h2`.
- `h4` and lower: use hierarchy through size, weight, and spacing only.
- Links: neutral body-compatible color with underline and restrained theme-color hover/focus state.
- Lists: same body size, modest indentation, and muted markers; do not reduce lists to a secondary type scale.
- Blockquotes: left border and low-contrast surface only when required for scanning; never a floating card.
- Tables: simple separators and horizontal overflow behavior, without card shadows or heavy rounding.
- Inline code: quiet neutral surface, compact radius, and no extra pseudo-content.
- Code blocks: dark syntax-highlighted surface, modest radius, no decorative shadow, horizontal scroll preserved.
- Images and horizontal rules: low-decoration treatment consistent with the prose column.

## Shared Article-Typography Contract

Create `shared/article-typography/` as a source-only shared module. It must not depend on either app's aliases, runtime configuration, or data layer.

Planned contents:

- `prose-preset.ts`: exports the Nuxt UI v4 `ui.prose` configuration for standard Markdown elements.
- `article-prose.desktop.css`: semantic root classes, shared color variables, legacy HTML fallback, KaTeX behavior, and desktop baseline rules.
- `article-prose.mobile.css`: only allowed responsive overrides, wrapped in the existing `576px`, `768px`, or `992px` max-width breakpoints.
- `mdc-contract.css`: common semantic styles for MDC component families and their dark-mode values.
- Optional narrowly scoped helpers only when component DOM cannot express the shared contract declaratively.

Both Nuxt configurations import `prose-preset.ts` into `app.config.ts`; both CSS entry points load the shared desktop, mobile, and MDC contract files in desktop-before-mobile order. The implementation must use build-compatible relative imports or a documented alias that resolves in both Nuxt projects.

The contract uses explicit `--article-prose-*` variables for text, muted text, border, surface, code surface, and accent. Each application maps those variables to the same concrete values for light and dark themes, so the content does not inherit the public app's blue accent or the admin app's cyan accent by accident.

## MDC Visual Parity

Standard Prose configuration alone cannot create parity because the two apps currently mount different MDC component implementations. The contract therefore has two levels:

1. Shared visual tokens and semantic class names for all MDC component families.
2. Targeted component alignment where templates or default classes differ materially.

Component families:

- Containers: Alert, Collapse, Tabs, Steps, Spoiler, and TypeWriter.
- Media and embeds: enhanced images, image comparison, web embeds, Mermaid, and KaTeX.
- Cards and interactive blocks: CodePlayground, LinkCard, GitHubCard, RelatedArticles, and StarRating.

Public components may retain public-data behavior. Admin preview components may retain placeholder data where production data is unavailable. Their rendered content boundaries, typography, spacing, state colors, radius, and dark-mode treatment must match the shared contract.

No broad CSS selector may force all MDC components into one card layout. Each family gets only the rules it needs.

## TOC Design

The public TOC remains a public-page feature. It keeps the existing collapse control, nested headings, truncation tooltip, IntersectionObserver active-heading behavior, smooth scrolling, and reading-progress calculation.

Visual changes:

- Replace fixed pink classes with the shared article accent token.
- Use a neutral title, icon, and separators.
- Represent depth with modest indentation, weight, and a subtle inherited guide line.
- Represent the active item with a `2px` left accent rule and a very low-opacity accent background. Remove enlarged dots, active shadows, and high-saturation pills.
- Reduce the reading-progress control to a `2px` solid accent line. Remove the gradient and rounded meter treatment.
- Make heading arrival feedback a short low-opacity background flash without glow or box shadow.

The admin does not gain a sidebar TOC as part of this work. Its preview needs content parity, not a simulated public page layout.

## File Boundaries

Expected public changes:

- `nuxt-public/app/app.config.ts`
- `nuxt-public/nuxt.config.ts`
- `nuxt-public/app/features/article-detail/containers/ArticleDetailPageContainer.vue`
- `nuxt-public/app/features/article-detail/components/Header.vue`
- `nuxt-public/app/features/article-detail/components/Toc.vue`
- Current public MDC components only where they do not meet the shared semantic contract.

Expected admin changes:

- `nuxt-admin/app/app.config.ts`
- `nuxt-admin/nuxt.config.ts`
- `nuxt-admin/app/assets/css/main.css`
- `nuxt-admin/app/components/AdminMarkdownPreview.vue`
- Current admin MDC preview components only where they do not meet the shared semantic contract.

Expected shared additions:

- `shared/article-typography/*`

`MarkdownRenderer.vue`, AST/TOC extraction, Markdown parsing plugins, backend data models, and the frozen `nuxt/` project are out of scope unless a verified renderer limitation blocks parity.

## Implementation Sequence

1. Inspect the current worktree and identify all public/admin MDC components that render in article content.
2. Build the shared token, Prose preset, and desktop/mobile CSS contract without changing rendering behavior.
3. Wire both applications to the contract and replace the admin `.prose prose-neutral` entry with the semantic article root.
4. Adjust public page/header geometry and standard Markdown slot values.
5. Align MDC component families, prioritizing components that render in the current preview.
6. Restyle the public TOC while preserving its interaction logic.
7. Verify public and admin side by side with a representative Markdown fixture containing headings, lists, quotes, tables, inline/block code, images, KaTeX, Mermaid, and every supported MDC block.

## Acceptance Criteria

- Public article content and admin preview display the same standard Markdown typography in light and dark themes.
- Both render the same visual treatment for every MDC component supported by the admin preview; unavailable production data may differ, but the component chrome and layout must not.
- The public page has a wider outer detail container, an independent `70ch` to `72ch` body column, and shared header/body left alignment.
- Body text is neutral and less visually loud; no fixed pink/cyan/blue prose accent survives outside semantic states.
- Paragraphs and headings are visibly denser than the current public page without becoming cramped.
- `h2` and `h3` use the agreed vertical-rule treatment, and the TOC active state uses the same accent token.
- TOC collapse, nesting, active heading tracking, progress, and navigation continue to work.
- Existing Markdown parsing, precomputed AST, legacy HTML fallback, KaTeX, Mermaid, and MDC behaviors remain functional.
- Public mobile styles remain physically separated and only use approved max-width breakpoints.

## Verification

- Static/type checks appropriate to each affected Nuxt app.
- Browser comparison at a wide desktop viewport and a 390px mobile viewport.
- Light and dark mode comparison of public article and admin preview using the same Markdown fixture.
- Targeted TOC interaction check: collapse, nested item, scroll activation, progress line, and long-title tooltip.
- Screenshot or DOM inspection for each MDC component family; no visual sign-off based only on source review.

## Risks and Mitigations

- Shared CSS resolution can differ between Nuxt builds. Validate imports in both applications before broad component edits.
- Some public MDC components depend on production data not available to the admin. Use visual adapters or stable preview fixtures; do not introduce backend coupling just for preview parity.
- The existing public `MarkdownRenderer.vue` contains legacy fallback and runtime behavior. Avoid changing it unless browser verification identifies a specific layout boundary that CSS cannot address.
- The worktree already contains user-owned uncommitted files. Do not reset or bundle unrelated changes into this task's commit.

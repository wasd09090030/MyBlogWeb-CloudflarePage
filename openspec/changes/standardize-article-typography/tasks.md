## 1. Nuxt UI Prose setup

- [x] 1.1 Confirm installed Nuxt UI Prose component slot keys for the elements to configure (`h1`-`h4`, `p`, `a`, `ul`, `ol`, `li`, `blockquote`, `table`, `thead`, `th`, `td`, `code`, `pre`, `img`, `hr`).
- [x] 1.2 Enable Nuxt UI MDC/Prose integration in `nuxt-public/nuxt.config.ts` with the Nuxt UI v4-supported config key.
- [x] 1.3 Add centralized article typography overrides in `nuxt-public/app/app.config.ts` under `ui.prose`.

## 2. MarkdownRenderer integration

- [x] 2.1 Update `MarkdownRenderer.vue` article root class computation to use a project semantic class such as `article-prose` while preserving `customClass`.
- [x] 2.2 Keep existing rendering branches for precomputed AST, client-side Markdown parse, legacy HTML fallback, loading, error, empty state, TOC emit, KaTeX, and Mermaid.
- [x] 2.3 Audit `size` prop call sites and either map it safely to semantic classes or leave it as backward-compatible API without relying on Tailwind Typography `prose-*` classes.

## 3. CSS responsibility cleanup

- [x] 3.1 Refactor `prose-theme.css` to remove Tailwind Typography ownership comments and keep only `article-prose` fallback or shared special-content rules that remain necessary.
- [x] 3.2 Refactor `prose-custom.desktop.css` so broad standard element styling moves to `ui.prose`, while KaTeX, Mermaid, custom MDC block display, selection, and legacy HTML fallback stay scoped.
- [x] 3.3 Keep `prose-custom.mobile.css` as the mobile-only paired file and add only allowed breakpoint overrides if Nuxt UI Prose needs mobile-specific tuning.
- [x] 3.4 Ensure desktop/mobile CSS ordering in `nuxt-public/nuxt.config.ts` still loads desktop before mobile.
- [x] 3.5 Remove `@tailwindcss/typography` dependency and Tailwind plugin loading so article typography is purely Nuxt UI Prose plus scoped fallback CSS.

## 4. Verification

- [x] 4.1 Run a static validation command in `nuxt-public`, preferring `npm exec vue-tsc -- --noEmit`; run `npm run generate` if type checking is insufficient or affected config requires build validation.
- [x] 4.2 Smoke-check an article page containing headings, paragraphs, links, lists, blockquotes, tables, inline code, code blocks, images, KaTeX, Mermaid, dark mode, and a mobile viewport.
- [x] 4.3 Inspect legacy `v-html` fallback behavior or construct a representative sample to confirm `.article-prose` fallback CSS remains readable.
- [x] 4.4 Run `openspec status --change standardize-article-typography` and confirm the change is apply-ready or complete according to the current phase.

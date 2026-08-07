# Unified Article Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make public article content and the admin Markdown preview share a restrained, neutral article typography and MDC component appearance, with a matching public TOC.

**Architecture:** A source-only `shared/article-typography` module exports the Nuxt UI Prose preset and CSS contracts. Both apps load it; public retains page geometry and TOC behavior, while the admin preview adopts the same article root and MDC semantic classes.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4 Prose, `@nuxtjs/mdc`, Tailwind CSS v4, CSS custom properties.

---

## File Structure

- Create `shared/article-typography/prose-preset.ts`, `article-prose.desktop.css`, `article-prose.mobile.css`, and `mdc-contract.css`.
- Modify each app's Nuxt UI configuration and CSS entry point to consume those shared sources.
- Modify public detail container/header/TOC and admin preview roots to apply the shared semantic contract.
- Modify admin preview MDC roots and only conflicting public MDC local styles.

### Task 1: Build the shared article style contract

**Files:**
- Create: `shared/article-typography/prose-preset.ts`
- Create: `shared/article-typography/article-prose.desktop.css`
- Create: `shared/article-typography/article-prose.mobile.css`
- Create: `shared/article-typography/mdc-contract.css`

- [ ] Define and export `articleProsePreset` for Nuxt UI Prose. It covers h1-h4, paragraph, links, lists, quote, table, code, pre, image, and hr. Paragraphs use `text-[1rem] leading-[1.78]`; h2/h3 use `article-prose-heading--h2` and `article-prose-heading--h3` classes.
- [ ] Define light/dark `--article-prose-*` variables, a `72ch` root width, legacy HTML fallback, KaTeX overflow, selection, and low-decoration code/image/table rules in the desktop CSS.
- [ ] Put all responsive changes inside `@media (max-width: 768px)` in the mobile CSS.
- [ ] Define low-radius, non-gradient, non-shadowed styles for the semantic MDC classes: `alert-mdc`, `collapse-mdc`, `tabs-mdc`, `steps-mdc`, `spoiler-mdc`, `code-playground-mdc`, `image-comparison-mdc`, `image-enhanced-mdc`, `web-embed-mdc`, `star-rating-mdc`, and `mdc-preview-card`.
- [ ] Verify with `rg -n "linear-gradient|box-shadow" shared/article-typography`; expected output has no decorative declarations. Verify the mobile CSS has only an allowed `max-width` breakpoint.

### Task 2: Adopt the contract in Nuxt Public

**Files:**
- Modify: `nuxt-public/app/app.config.ts`
- Modify: `nuxt-public/app/assets/css/tailwind.css`
- Modify: `nuxt-public/nuxt.config.ts`
- Delete: `nuxt-public/app/assets/css/components/prose-theme.css`
- Delete: `nuxt-public/app/assets/css/components/prose-custom.desktop.css`
- Delete: `nuxt-public/app/assets/css/components/prose-custom.mobile.css`

- [ ] Replace the local `ui.prose` object with `articleProsePreset`, retaining the existing public app color configuration.
- [ ] Add `@source '../../../../shared/article-typography/prose-preset.ts';` to the Tailwind source list.
- [ ] Replace the three local prose CSS configuration entries with shared desktop, MDC, then mobile CSS entries, preserving that order.
- [ ] Delete old files only after their legacy, KaTeX, and responsive responsibilities exist in the shared module.
- [ ] Run `npm run generate` in `nuxt-public`; resolve all CSS/config errors and report unrelated API/prerender errors separately.

### Task 3: Adopt the contract in Nuxt Admin

**Files:**
- Modify: `nuxt-admin/app/app.config.ts`
- Modify: `nuxt-admin/app/assets/css/main.css`
- Modify: `nuxt-admin/app/components/AdminMarkdownPreview.vue`

- [ ] Import `articleProsePreset` from `../../shared/article-typography/prose-preset` and apply it as `ui.prose`, retaining admin palette settings for non-article UI.
- [ ] Import shared desktop, MDC, and mobile CSS in `main.css`, and add the preset file to Tailwind source scanning.
- [ ] Replace `prose prose-neutral max-w-none dark:prose-invert` with `article-prose article-prose--admin` on `MDCCached`.
- [ ] Run `npm run typecheck` in `nuxt-admin`; expected result is no configuration or template errors.

### Task 4: Connect MDC renderers to the shared contract

**Files:**
- Modify: `nuxt-admin/app/components/mdc/MdcPreviewContainer.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcCollapse.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcTabs.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcSteps.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcSpoiler.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcCodePlayground.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcImageComparison.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcImageEnhanced.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcWebEmbed.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcStarRating.vue`
- Modify: `nuxt-admin/app/components/mdc/MdcPreviewCard.vue`

- [ ] Add the matching semantic family class to each component root, while retaining its props, slots, interactions, and accessibility semantics.
- [ ] Remove only local classes that override the contract surface, border, or radius. Preserve layout and semantic state classes.
- [ ] Add matching family root classes to public components only when absent; replace only local gradients, fixed saturated accents, and decorative shadows that conflict with the shared contract.
- [ ] Run `npm run typecheck` in `nuxt-admin` and `npm run generate` in `nuxt-public`.

### Task 5: Adjust the public article page geometry

**Files:**
- Modify: `nuxt-public/app/shared/ui/ContentPageBody.vue`
- Modify: `nuxt-public/app/features/article-detail/containers/ArticleDetailPageContainer.vue`
- Modify: `nuxt-public/app/features/article-detail/components/Header.vue`

- [ ] Add an `articleDetail` width option set to `mx-auto w-full max-w-5xl` without changing the existing `article` width used elsewhere.
- [ ] Use `width="articleDetail"` only in the article detail content body.
- [ ] Add a semantic article header class and adjust it to match the shared neutral text family and denser heading rhythm. Keep the article title, metadata, and body aligned to the page-content baseline; keep the body itself centered at `72ch`.
- [ ] Run `npm run generate` in `nuxt-public`.

### Task 6: Restyle TOC without changing its behavior

**Files:**
- Modify: `nuxt-public/app/features/article-detail/components/Toc.vue`

- [ ] Preserve all computed nesting, timers, IntersectionObserver logic, tooltip checks, and navigation methods.
- [ ] Replace fixed pink/rose colors, active dots, active shadows, gradients, and rounded progress treatment with neutral text, depth indentation, a `2px` active left accent border, shallow accent background, and a `2px` solid progress line based on `--article-prose-accent`.
- [ ] Replace heading-arrival glow with a short low-opacity background flash without `box-shadow`.
- [ ] Run `npm run generate` in `nuxt-public`.

### Task 7: Verify and commit

**Files:** no planned source edits.

- [ ] Start `nuxt-public` and `nuxt-admin` on separate localhost ports and compare the same Markdown in desktop and 390px mobile viewports.
- [ ] Verify light/dark standard elements, all preview-supported MDC components, KaTeX, Mermaid, code/table overflow, and no visual saturation drift.
- [ ] Verify TOC collapse, nesting, active tracking, long-title tooltip, smooth scroll, and progress line.
- [ ] Run final `npm run generate` in `nuxt-public` and `npm run typecheck` in `nuxt-admin`.
- [ ] Commit only `shared/article-typography` and directly changed public/admin files after checking `git status --short`.

## Self-Review

- Shared Prose, CSS, MDC parity, public geometry, TOC, desktop/mobile/dark verification, and existing rendering preservation each map to a task.
- No task modifies the frozen `nuxt/` project, Markdown parsing, AST generation, or backend data.
- Every app consumes the same `articleProsePreset` and `article-prose` root contract.

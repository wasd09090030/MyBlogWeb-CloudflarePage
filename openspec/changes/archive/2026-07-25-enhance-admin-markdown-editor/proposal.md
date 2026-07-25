## Why

The new `nuxt-admin` article editor currently provides a plain textarea and text-only preview, so administrators cannot reliably author or inspect the MDC-enhanced Markdown rendered by the public site. The legacy editor contains useful authoring workflows but is coupled to obsolete UI and client-only architecture, making a focused rebuild necessary.

## What Changes

- Add a responsive Markdown authoring workspace to `nuxt-admin` using Nuxt UI v4 controls and a client-only source editor.
- Add an MDC-compatible live preview that matches the Markdown semantics used by `nuxt-public`, including existing custom content components, code blocks, KaTeX, and Mermaid.
- Add authoring modes for source, split, and preview views; provide Markdown and existing MDC template insertion controls.
- Add content statistics, heading outline, parse-error feedback, browser-local draft recovery, and unsaved-change protection.
- Add optional imagebed-backed image insertion when the existing imagebed configuration is available, without making imagebed configuration a prerequisite for writing.
- Preserve the existing article API contract, BFF authentication model, and public site rendering path.

## Capabilities

### New Capabilities
- `admin-markdown-workspace`: Authenticated Markdown editing, compatible live preview, draft recovery, and authoring assistance for administration articles.

### Modified Capabilities
- None.

## Impact

- Affects `nuxt-admin/app/components/ArticleEditor.vue`, article create/edit routes, and new feature-local editor and preview components.
- Adds a client-only Markdown source-editor dependency and aligns `nuxt-admin` with the existing `@nuxtjs/mdc` preview contract used by `nuxt-public`.
- Reuses existing protected article, AI-summary, and imagebed BFF endpoints; no backend data migration or public URL change is required.

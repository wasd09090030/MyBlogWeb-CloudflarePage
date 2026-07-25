## 1. Editor Foundation

- [x] 1.1 Add and configure the client-only CodeMirror Markdown dependencies and the MDC runtime dependencies required for `nuxt-admin` preview parity.
- [x] 1.2 Create feature-local Markdown source-editor and selection-insertion composables/components with client-only loading boundaries.
- [x] 1.3 Create shared Markdown and MDC template definitions covering the supported public-site content syntax.

## 2. Preview Compatibility

- [x] 2.1 Create `AdminMarkdownPreview` using the MDC runtime and Nuxt UI-compatible prose presentation.
- [x] 2.1a Replace legacy Naive UI-dependent MDC preview components with Nuxt UI v4 or local admin-preview implementations.
- [ ] 2.2 Add lazy KaTeX and Mermaid preview support, including non-blocking parse/render error feedback.
- [ ] 2.3 Add Markdown fixture content for standard Markdown, MDC components, code, KaTeX, and Mermaid compatibility checks.

## 3. Authoring Workspace

- [x] 3.1 Replace the plain article-content textarea and text preview with the responsive source, split, and preview workspace.
- [x] 3.2 Implement Nuxt UI v4 authoring controls for common Markdown syntax, MDC template insertion, undo/redo, and full-screen editing.
- [x] 3.3 Retain and refine article metadata, AI-summary, validation, save, error, and post-save list-refresh workflows without changing the article API contract.
- [x] 3.4 Implement responsive desktop split view and mobile single-mode switching with stable editor and preview dimensions.
- [x] 3.5 Replace raw template insertion with selection-aware inline, line-prefix, and block CodeMirror commands.
- [x] 3.6 Expand Markdown controls to legacy parity and expose the full supported MDC template catalogue through Nuxt UI v4 controls and help text.

## 4. Drafts And Images

- [x] 4.1 Implement debounced browser-local drafts, expiry, restore/discard UI, and unsaved-change navigation protection.
- [x] 4.2 Clear the matching draft after a successful create or update and ensure drafts never contain credentials or imagebed tokens.
- [x] 4.3 Implement URL-based image insertion and optional configured-imagebed upload-and-insert behavior through the existing BFF.

## 5. Validation

- [x] 5.1 Run dependency installation, type checks, and production build for `nuxt-admin`.
- [ ] 5.2 Use Chrome DevTools to verify source/split/preview modes, template insertion, draft recovery, create/edit save, and imagebed-unconfigured behavior.
- [ ] 5.3 Compare Markdown fixture output between `nuxt-admin` preview and `nuxt-public` rendering for MDC, code, KaTeX, and Mermaid content.
- [ ] 5.4 Verify desktop and mobile layouts, SSR-safe editor loading, private cache headers, and no exposed authentication or imagebed credentials.

## Context

`nuxt-admin` currently uses a `UTextarea` plus text-only article preview. The legacy `nuxt/` editor has a feature-rich `md-editor-v3` wrapper and MDC insertion templates, but its layout and implementation are tied to legacy UI decisions. `nuxt-public` is the production rendering authority: it uses `@nuxtjs/mdc` parsing, custom MDC components, KaTeX, Mermaid, and code rendering.

The new workspace must retain Nuxt 4 SSR and the BFF cookie boundary. The editor itself needs browser APIs, while initial article data and protected save operations remain server-compatible. The public site currently uses MDC; the Nuxt module documentation identifies Comark as MDC's successor, but migrating only administration would create incompatible preview behavior.

## Goals / Non-Goals

**Goals:**
- Rebuild Markdown writing and preview in `nuxt-admin` using Nuxt UI v4 surfaces.
- Make administration preview compatible with the public renderer's current MDC content semantics.
- Preserve source, metadata, and draft state during authoring without exposing credentials or storing content in a shared server cache.
- Support responsive source, split, and preview modes.

**Non-Goals:**
- Migrate `nuxt-public` or `nuxt-admin` from MDC to Comark in this change.
- Reuse the legacy NaiveUI editor or copy its CSS and wrappers.
- Change article API payloads, JWT issuance, public URLs, or backend persistence.
- Add real-time collaborative editing or server-side draft persistence.

## Decisions

### D1: Use Nuxt UI plus a client-only CodeMirror source editor

The workspace shell, metadata panel, mode controls, menus, dialogs, notifications, and accessibility affordances will use Nuxt UI v4. A CodeMirror 6 wrapper loaded only on the client will provide Markdown syntax editing, selection-aware insertion, keyboard handling, undo/redo, line numbers, and full-screen editing.

Using `UTextarea` alone was rejected because it cannot provide a practical long-form source editing experience. Reusing `md-editor-v3` was rejected because its own preview engine would not guarantee custom MDC parity and would carry legacy UI behavior into the new application.

### D2: Render preview through the current MDC contract

`AdminMarkdownPreview` will parse content using the existing MDC runtime and render through the MDC component system, with client-only lazy loading for Mermaid and KaTeX styling where needed. The component will be deliberately scoped to the public site's behavior rather than copying the legacy renderer wholesale.

Comark was considered because it is the documented successor to MDC, supports compact ASTs and streaming, and is framework-independent. It is deferred because the public site is still MDC-based; both frontends must migrate together in a separate compatibility-tested change.

### D3: Keep editor state local and drafts browser-local

Article form state belongs to the editor component. A debounced local-storage draft contains only article fields and timestamp, keyed by `new` or article ID. It never includes cookies, access tokens, refresh tokens, or imagebed API tokens. Existing article data stays fetched through the BFF; local drafts require explicit restore or discard when newer than the server form.

The side-navigation KeepAlive cache remains limited to stable workspace list pages. Editor routes are intentionally not kept alive; draft protection handles navigation and refresh safely without retaining sensitive edit form data indefinitely.

### D4: Treat imagebed upload as an enhancement, not a dependency

Image insertion always supports a direct URL. Upload controls call the existing same-origin imagebed BFF only after confirming configured imagebed status; missing configuration shows a local instruction and leaves normal editing functional. The browser never receives the imagebed API token.

### D5: Use semantic CodeMirror editing commands

The admin toolbar SHALL invoke selection-aware CodeMirror commands rather than append or replace text blindly. Inline commands wrap a selection or select an editable placeholder, line commands toggle a prefix across selected lines, and block commands preserve surrounding line breaks and place the caret inside the newly inserted block. The supported command set will match the legacy author's Markdown coverage while retaining Nuxt UI v4 controls and the MDC preview contract.

## Risks / Trade-offs

- [MDC preview differs from the public site after independent renderer changes] -> use shared syntax fixtures and compare rendered output during validation.
- [CodeMirror increases client bundle size] -> lazy-load the editor only on create/edit routes and lazy-load Mermaid/KaTeX only when source syntax requires them.
- [Local drafts can become stale relative to a server edit] -> store timestamps, require restore confirmation, and clear drafts after successful saves.
- [Browser storage may be unavailable] -> editor remains usable and displays a non-blocking draft-storage warning.
- [Mermaid source is invalid] -> preserve source and show preview-local feedback rather than failing the editor route.
- [Imagebed is not configured] -> keep URL insertion available and omit upload functionality from the active workflow.
- [Toolbar grows beyond a useful single row] -> keep common Markdown actions visible and group the MDC templates under a clearly labelled, accessible menu.

## Migration Plan

1. Add the editor and preview dependencies/configuration without changing the article API or public rendering.
2. Replace the current `ArticleEditor` content area with the new workspace while retaining metadata and save payload compatibility.
3. Validate new and existing article flows locally with MDC fixture content, then deploy with the existing SSR/BFF artifact process.
4. Roll back by restoring the prior `nuxt-admin` release; no data migration is required because article storage remains unchanged.

## Open Questions

- Whether image uploads should select an image directly from the existing imagebed browser in this change, or remain upload-and-insert only. The default plan is upload-and-insert only.
- Whether draft retention should expire automatically. The default plan is a 14-day expiry with visible restore time.

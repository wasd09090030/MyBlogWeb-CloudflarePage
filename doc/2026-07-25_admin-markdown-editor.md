# Admin Markdown Editor

## Goal

Replace the basic administration article textarea with a Nuxt UI v4 Markdown workspace while retaining the existing BFF and article API contracts.

## Implemented

- Added CodeMirror Markdown editing and MDC runtime dependencies.
- Added a client-only source editor with selection insertion, undo, redo, line numbers, and line wrapping.
- Added Nuxt UI controls for source, split, preview, templates, full-screen, AI summary, and image insertion.
- Added MDC-backed preview, local 14-day drafts, restore/discard, and successful-save cleanup.
- Added direct image URL insertion plus protected imagebed upload-and-insert.

## Validation

- `npm run typecheck` passed.
- `npm run build` passed.
- Chrome DevTools regression remains pending because the local dev server was not running and the execution environment blocked background server startup.

## Sources

- Nuxt MDC module documentation fetched on 2026-07-25; it documents MDC rendering and notes Comark as its successor.
- Existing `nuxt-public` MDC renderer and existing `nuxt` editor were used as local compatibility references.

## Follow-up Notes

- Preview rendering uses Nuxt MDC with local Nuxt UI v4-compatible MDC components. The previous Naive UI dependency has not been carried into `nuxt-admin`.
- The editor provides standard Markdown actions separately from MDC insertion templates. Each MDC template is discoverable through its labeled control and tooltip.
- KaTeX/Mermaid render refinement and a shared fixture comparison with `nuxt-public` remain optional future work; they do not block the completed editor migration.

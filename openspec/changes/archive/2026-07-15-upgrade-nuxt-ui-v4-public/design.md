## Context

`nuxt-public` is a Nuxt 4 static site currently using Nuxt UI 3.3.7 with Tailwind 4. It uses Nuxt UI components for public-site interaction and feedback, while article content is independently parsed by `@nuxtjs/mdc`, precomputed as an AST, and enhanced with KaTeX, Mermaid, custom MDC components, and local prose styling. Nuxt UI 4.9.0 requires Node.js 20.19+ or 22.12+; CI already uses Node 22.

## Goals / Non-Goals

**Goals:**

- Move only `nuxt-public` onto the supported Nuxt UI v4 line.
- Keep the existing public-site component API use and content rendering behavior working.
- Produce a deterministic npm lockfile and verify static generation.

**Non-Goals:**

- Do not change `nuxt/`, adopt Nuxt UI Typography, or migrate MDC to Comark.
- Do not redesign existing pages or replace custom MDC components.
- Do not change public API contracts, routes, or article content.

## Decisions

### Upgrade to the current Nuxt UI v4 release

Use `@nuxt/ui ^4.9.0`, the current v4 release evaluated for this change. Nuxt 4 and Tailwind 4 are already present, and the developer and CI Node versions satisfy its engine requirement. Pinning to the v4 major line receives patch and minor fixes without crossing into an unreviewed future major version.

Alternative considered: remain on the v3 line. This avoids visual changes but leaves the component library on an older major line and defers a low-risk compatibility upgrade.

### Align direct Nuxt module dependencies

Update direct `@nuxt/fonts` from the legacy `^0.8.0` range to `^0.14.0`, matching the v4 library's dependency line. Keep `@nuxt/icon` and `@vueuse/core` at their existing compatible ranges and let npm resolve lockfile-compatible versions.

Alternative considered: upgrade every transitive or adjacent dependency manually. This would broaden the change without evidence that the source imports require it.

### Preserve the renderer and theme boundary

Keep the `@import '@nuxt/ui'` entry, `ui.colors`, `@theme` radius token, CSS load order, and MDC renderer unchanged. Although Nuxt UI v4 exposes Prose components automatically with MDC, adopting them is a separate presentation migration because current prose CSS and custom MDC components intentionally define article output.

Alternative considered: adopt `ui.prose` as part of this change. That would combine an infrastructure dependency upgrade with a broad article visual migration and make failures difficult to isolate.

### Validate build output and high-risk interactions

Use `npm run generate` as the primary gate, followed by targeted smoke checks for the components with local slot overrides or stateful behavior: comment form/toasts, search modal, code playground card, article markdown, and loading/error states.

## Risks / Trade-offs

- [Nuxt UI default styling changes] → Preserve custom CSS and verify components with `:ui` slot overrides before accepting the upgrade.
- [Dependency resolver produces duplicate Nuxt modules] → Inspect `npm ls` for `@nuxt/ui`, `@nuxt/fonts`, and `@nuxt/icon` after installation.
- [Cloudflare build uses an old Node runtime] → Document Node 20.19+ as a prerequisite and verify the existing Node 22 CI baseline.
- [Automatic Prose registration affects article output] → Include Markdown, code, KaTeX, Mermaid, and custom MDC content in the regression checklist; defer Prose changes unless a compatibility regression demands a narrow fix.

## Migration Plan

1. Update direct dependencies and regenerate `package-lock.json` from `nuxt-public`.
2. Update stale version comments and runtime documentation.
3. Check resolved module versions and run static generation.
4. Perform targeted public-page regression checks.
5. Roll back by restoring the prior dependency declarations and lockfile if generation or a critical workflow regresses.

## Open Questions

None. Cloudflare Pages must retain a Node.js 20.19+ build image; its GitHub Actions equivalent already uses Node 22.

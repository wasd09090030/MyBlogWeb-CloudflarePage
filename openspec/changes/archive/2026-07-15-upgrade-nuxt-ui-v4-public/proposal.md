## Why

The static site is pinned to Nuxt UI v3.3.7 even though its Nuxt 4 and Tailwind 4 foundations support the maintained Nuxt UI v4 line. Upgrading keeps the public site's component library supported while preserving its established article rendering pipeline.

## What Changes

- Upgrade `nuxt-public` from `@nuxt/ui` v3 to v4 and refresh its npm lockfile.
- Align the public site's direct `@nuxt/fonts` dependency with the Nuxt UI v4 dependency line.
- Record the Node.js 20.19+ runtime baseline required by the current Nuxt UI v4 release.
- Update Nuxt UI version references in public-site configuration comments.
- Verify static generation and critical public-site component workflows.
- **BREAKING**: The public site will consume Nuxt UI v4 component implementations and default styling; behavior must remain compatible for the currently used component APIs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-library`: The static public site uses Nuxt UI v4 while retaining its current component configuration and MDC-based article rendering.

## Impact

- Affected project: `nuxt-public` only.
- Affected dependencies: `@nuxt/ui`, `@nuxt/fonts`, and their transitive lockfile entries.
- Affected operational baseline: local and Cloudflare Pages builds require Node.js 20.19 or newer.
- Excluded: `nuxt/` SSR, Typography adoption, `@nuxtjs/mdc` to Comark migration, and article content changes.

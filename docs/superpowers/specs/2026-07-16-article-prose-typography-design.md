# Article Prose Typography Design

Date: 2026-07-16

## Goal

Adjust the static blog article body in `nuxt-public` so Nuxt UI Prose keeps rendering Markdown/MDC content, while the visible reading style follows the calmer rhythm of `@tailwindcss/typography`.

The target is not a dependency migration. The target is a typography redesign: readable line length, predictable vertical rhythm, restrained decoration, and article elements that feel like prose instead of UI cards.

## Scope

In scope:

- `nuxt-public` article detail prose rendering.
- Nuxt UI Prose configuration in `nuxt-public/app/app.config.ts`.
- Article prose container and legacy fallback styles in `nuxt-public/app/assets/css/components/prose-theme.css`.
- Existing desktop/mobile prose custom files where they provide supporting behavior.
- Standard Markdown elements: headings, paragraphs, links, lists, blockquotes, inline code, code blocks, tables, images, and horizontal rules.

Out of scope:

- SSR frontend `nuxt/`.
- Markdown parsing logic in `MarkdownRenderer.vue`.
- Article data format.
- New visual components.
- Installing `@tailwindcss/typography` in `nuxt-public`.

## Decision

Use the existing Nuxt UI v4 Prose pipeline and tune its output to match Tailwind Typography principles.

Rejected alternatives:

- Installing `@tailwindcss/typography` in `nuxt-public`: this creates two prose systems and increases CSS ordering risk with MDC/Nuxt UI components.
- Styling only with broad CSS overrides: this fights the Nuxt UI Prose slot configuration and is harder to maintain.

## Design

The base article prose container should become reading-width centered content:

- `max-width` near `65ch`.
- `margin-inline: auto`.
- Body color and line-height tuned for long-form reading.
- Mobile retains the current responsive split-file convention and may reduce oversized prose sizes to base reading size.

Nuxt UI Prose slots should be adjusted to reduce decoration:

- Headings keep strong hierarchy and anchor scroll offset, but h2 should lose the gradient underline treatment.
- Paragraphs use Typography-like margins and line-height without custom letter spacing.
- Links should be readable and obvious, but not background-highlighted by default.
- Lists use moderate indentation and neutral markers.
- Blockquotes should become prose-like: left border, italic or medium body tone, no card background or heavy border.
- Tables should use light row and header borders, no shadow-heavy card treatment.
- Inline code should remain easy to scan in Chinese technical articles. A very light background is acceptable, but it should be visually quieter than the current chip-like styling.
- Code blocks keep the dark background for contrast and syntax highlighting compatibility, with reduced radius and shadow.
- Images keep modest rounding, with reduced shadow.
- Horizontal rules become simple dividers rather than decorative gradients.

Legacy `v-html` fallback should mirror the same visual direction so old article content does not look like a different design system.

## Wide Content

Some content should not be forced into the 65ch text measure:

- Code blocks may scroll horizontally.
- Tables may keep full available width within the prose measure and scroll when needed.
- Custom MDC blocks, Mermaid diagrams, KaTeX display math, enhanced images, embeds, tabs, and related article cards should keep their existing block behavior.

If a future implementation finds a specific MDC block needs to visually break out of the prose width, that should be handled with a targeted class rather than widening all article text.

## Files

Likely implementation files:

- `nuxt-public/app/app.config.ts`
- `nuxt-public/app/assets/css/components/prose-theme.css`
- `nuxt-public/app/assets/css/components/prose-custom.desktop.css`
- `nuxt-public/app/assets/css/components/prose-custom.mobile.css`

`nuxt-public/app/components/MarkdownRenderer.vue` should not need behavior changes for this redesign.

## Verification

Recommended checks:

- Run a targeted Nuxt Public dev preview for an article page.
- Inspect a representative article containing headings, paragraphs, lists, blockquotes, code, tables, images, Mermaid, and KaTeX if available.
- Verify desktop and mobile widths.
- Verify dark mode contrast.
- Run a local static check or build only if the changed files justify it and the project state allows it.

## Risks

- A strict `65ch` width may make some articles feel narrower than the current design. This is intentional for prose, but wide MDC blocks may need targeted handling.
- Existing uncommitted work in `nuxt-public` may already overlap with typography files. Implementation must read current diffs before editing and preserve unrelated user changes.
- Nuxt UI Prose class names and slots are configuration-driven. Implementation should prefer slot changes over broad selectors where possible.

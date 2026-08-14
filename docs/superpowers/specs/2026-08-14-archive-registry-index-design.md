# Archive Registry Index Design

## Goal

Refresh the public `/archive` page as a scannable writing registry. Readers can
filter by tag and locate an article by date without the page looking like a
separate design system from the rest of the site.

## Scope

- Replace the current hand-built MD3 visual treatment with Nuxt UI v4 components
  and the site's existing semantic theme tokens.
- Keep the current client-side article fetch, tag filtering, grouped time order,
  and article route generation unchanged.
- Preserve light and dark mode, keyboard access, empty/error/loading states, and
  the existing responsive behavior.

## Visual Direction

The page is a registry rather than a dashboard. The primary reading order is:

1. Page identity and article total.
2. Tag filter selection.
3. Month group and article date.
4. Article title and its tags.

The large year is a low-contrast background marker only. It must not overlap or
reduce the readability of article rows.

```
archive header: title + total
tag filters:    all | Nuxt | Cloudflare | ...

month group:    2026-08 · 3 articles
article row:    08/12 | title + tags             ->
article row:    08/02 | title + tags             ->
```

### Tokens

Use existing project tokens instead of introducing a page palette:

| Role | Light | Dark | Source |
| --- | --- | --- | --- |
| Primary interaction | `#0d6efd` | `#4299e1` | `--accent-primary` |
| Hover/selected surface | `rgba(13, 110, 253, 0.08)` | `rgba(96, 165, 250, 0.15)` | `--nav-link-hover-bg` |
| Background | `#ffffff` | `#1e293b` | `--card-bg` |
| Primary text | `#212529` | `#f1f5f9` | `--text-primary` |
| Secondary text | `#6c757d` | `#cbd5e1` | `--text-secondary` |
| Rules | `#dee2e6` | `#4a5568` | `--border-color` |

The project blue is the only archive-specific highlight. It appears on active
filters, dates, links, focus rings, and the low-amplitude motion cue.

## Components And Interaction

- Use `UCard` for the tag filter panel and any mobile filter surface.
- Use `UBadge` for article totals and tag counts.
- Use an icon-only `UButton` with an accessible label to clear the active tag.
- Use `UButton` or Nuxt UI button-compatible links for article rows where that
  preserves full-row keyboard navigation; no inline SVG icons.
- Use the existing Iconify collections through `UIcon`/Nuxt UI icon props.
- Active tag filtering remains toggleable. Clearing it restores the complete
  chronological registry.
- Article rows use a short color/translation transition on hover and focus. A
  `prefers-reduced-motion` override removes nonessential movement.

## Layout And Responsive Behavior

- Desktop: a main registry column with a sticky tag panel; page width remains
  constrained by the existing layout.
- At `992px` and below: move the filter panel into normal document flow before
  the registry.
- At `576px` and below: retain the date column, but stack metadata below the
  title and allow long titles to wrap instead of truncating critical text.
- Put desktop baseline rules in `ArchivePageContainer.desktop.css` and all
  responsive overrides in `ArchivePageContainer.mobile.css`, loaded in that
  order by the component. The tag cloud follows the same split if it needs
  custom rules.

## Verification

- Run icon-name validation.
- Run a targeted Vue/Nuxt type or build check available in `nuxt-public`.
- Inspect the archive route in light and dark mode at desktop and mobile widths.
- Verify tag selection, clearing, article navigation, loading, empty, and error
  states.

## Boundaries

- Do not change API contracts, archive grouping utilities, article URLs, global
  theme variables, or unrelated pages.
- Do not add raster assets or decorative illustrations; the visual signature is
  typographic date indexing plus restrained UI motion.

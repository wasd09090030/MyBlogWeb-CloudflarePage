# Home Card Icon Marquee Design

Date: 2026-08-06

## Goal

Refine the `nuxt-public` homepage icon marquee so it reads as part of the announcement card rather than as an independent visual strip. The final presentation is two straight vertical icon columns inside the top information card, with Nuxt UI `UMarquee`'s default edge masks enabled.

## Scope

In scope:

- `nuxt-public/app/components/WelcomeSection.vue` placement of `IconMarquee`.
- `nuxt-public/app/components/IconMarquee.vue` marquee props and local layout styles.
- `nuxt-public/app/assets/css/components/WelcomeSection.desktop.css` and `WelcomeSection.mobile.css` placement and responsive rules.

Out of scope:

- Icon assets and icon lists.
- The mobile FAB navigation and the three lower information cards.
- Any route, API, or dependency change.
- The frozen `nuxt/` project and `nuxt-admin/`.

## Decision

Place `<IconMarquee />` inside `.top-section`, after the announcement text. `.top-section` is the sole visible boundary: its existing border radius and `overflow: hidden` clip both the two marquee columns and their masks. The marquee does not receive an independent border, background, or panel.

Each column remains a vertical `UMarquee`; the second column keeps `reverse`. Do not pass `overlay`, which leaves Nuxt UI's default overlay enabled. Keep `pause-on-hover` and the existing staggered durations.

Remove all 3D and rotation Tailwind classes and related root naming. The columns are straight, with a compact fixed width and a small stagger offset so the two directions remain legible without competing with the announcement copy.

## Alternatives Considered

- **Independent right-side marquee strip:** rejected because it makes the icon movement feel detached from the announcement card.
- **Two tilted / perspective columns:** rejected because the narrow visual area compresses the icons and makes the movement hard to follow.
- **Two straight columns embedded in the card:** selected because the card remains a coherent unit, the boundary is unambiguous, and the animation is easy to scan.

## Layout and Behavior

Desktop:

- `.top-section` becomes the positioning and clipping context for the icon area.
- Announcement copy stays above the marquee in stacking order and retains a readable width.
- `IconMarquee` occupies a bounded right-side area within the card and may be partially faded where it approaches the copy.
- The default `UMarquee` vertical overlays fade icon content at the top and bottom inside the card.

Responsive behavior:

- At the existing mobile/tablet breakpoints, retain the paired desktop/mobile stylesheet convention.
- Under `768px`, `.info-section` is already hidden, so the marquee stays absent together with the rest of the information card.
- The `992px` fallback must not reintroduce absolute positioning or a separate marquee boundary.

Accessibility and motion:

- Preserve meaningful image `alt` attributes and lazy loading.
- Rely on `UMarquee`'s built-in reduced-motion behavior, which displays content statically when the user requests reduced motion.
- Preserve hover pause for pointer users.

## Files

- `nuxt-public/app/components/WelcomeSection.vue`
- `nuxt-public/app/components/IconMarquee.vue`
- `nuxt-public/app/assets/css/components/WelcomeSection.desktop.css`
- `nuxt-public/app/assets/css/components/WelcomeSection.mobile.css`

## Verification

- Run a targeted Nuxt Public type/template check or production build if the current workspace permits it.
- Open the homepage at desktop width and verify that the marquee is fully clipped by the announcement card, has two straight columns, and retains the default top/bottom masks.
- Verify the columns reverse direction relative to each other and pause on hover.
- Verify dark mode and the `992px` / `768px` responsive transitions, including that mobile keeps the existing hidden information section behavior.

## Risks

- The current worktree contains uncommitted marquee and welcome-section changes. Integration must preserve unrelated changes and only replace the placement and 3D behavior that conflicts with this approved design.
- Default overlay colors inherit Nuxt UI theme tokens. Light and dark mode need visual inspection to ensure the mask blends with the card rather than looking like a separate layer.

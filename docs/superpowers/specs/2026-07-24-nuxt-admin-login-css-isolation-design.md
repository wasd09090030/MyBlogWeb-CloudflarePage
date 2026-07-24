# Nuxt Admin Login CSS Isolation Design

## Goal

Restore Nuxt UI v4 ownership of the admin login page's visual tokens while preserving the existing login and authentication behavior.

## Root Cause

Legacy global theme and layout styles load after Tailwind and redefine shared utility names such as `bg-primary`, `shadow-lg`, and `text-muted` with `!important`. Those selectors override Nuxt UI v4/Tailwind utilities used by the login page. A global `*` transition also affects all component interactions. The login decoration is placed at a negative z-index and can be hidden behind the page background.

## Chosen Approach

Use semantic, application-specific compatibility classes instead of redefining Tailwind utility names. Remove the conflicting global utility aliases from the shared CSS files. Keep existing non-conflicting legacy styles unchanged. The login page will use Nuxt UI v4 tokens and component `ui` slots only, with a non-negative decoration layer behind the content.

## Scope

- Update the conflicting global selectors in `theme-variables.css` and `layout.css`.
- Adjust `admin/login.vue` only where required for token ownership and decoration stacking.
- Verify the login page at desktop and mobile sizes and run focused static checks.

## Non-Goals

- Redesigning other admin pages.
- Changing authentication, routing, or session behavior.
- Removing all historical CSS in one change.

## Validation

- Confirm the shared CSS no longer declares the conflicting Tailwind utility selectors.
- Confirm the login page has a visible background treatment and correct Nuxt UI primary, muted, and shadow styles.
- Confirm password validation, login error display, and successful redirect behavior remain unchanged.

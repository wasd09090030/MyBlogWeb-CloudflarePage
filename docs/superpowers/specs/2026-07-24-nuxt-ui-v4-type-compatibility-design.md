# Nuxt UI v4 Type Compatibility Design

## Goal

Complete the Nuxt UI v4 migration type compatibility work so `npm run typecheck` exits successfully, while repairing migration defects that would otherwise affect runtime behavior.

## Scope

The work covers all errors reported by the current Nuxt type checker:

- Nuxt UI v4 component configuration and `ui` slot API changes.
- Nuxt Color Mode's `preference` API.
- Generic table column types and toast color unions.
- Imagebed callback wiring, boolean event narrowing, and composable return-value destructuring.
- Admin dashboard action and API response union narrowing.
- Worker type guards and MDC highlighter module resolution.

## Chosen Approach

Fix each error at its owning module with the current Nuxt UI v4 or Nuxt Color Mode API. Preserve component boundaries and runtime data contracts. Do not use `any`, broad casts, or declaration shims to conceal application defects; a narrow assertion is permitted only where an external library's documented type cannot express an already validated runtime invariant.

## Execution Order

1. Correct framework API contracts: app config, modal and toolbar slots, color-mode access, tables, and toast colors.
2. Correct application boundaries: imagebed callbacks and events, admin API response normalization, dashboard action state, and worker narrowing.
3. Correct build integration: MDC highlighter import resolution.
4. Run `npm run typecheck` after each batch and resolve remaining diagnostics at their source.

## Non-Goals

- Redesigning admin pages or changing visual behavior outside the previously approved login CSS isolation change.
- Refactoring APIs, stores, or backend endpoints without a diagnostic that requires it.
- Muting type checking or lowering TypeScript strictness.

## Validation

- `npm run typecheck` exits with code 0.
- Existing admin interactions retain their visible behavior, including color mode, imagebed delete flows, article lists, dashboard actions, and Markdown rendering.
- Changed files remain limited to the modules owning the reported errors, plus any necessary type-resolution configuration.

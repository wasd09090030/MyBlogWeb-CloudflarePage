## ADDED Requirements

### Requirement: Nuxt UI v4 admin runtime baseline
`nuxt-admin/` SHALL declare `@nuxt/ui` from the v4 major line and a Tailwind v4 integration. `nuxt-admin/app/` SHALL use Nuxt UI v4 as its only component library and SHALL NOT contain NaiveUI runtime imports, `<n-*>` component instances, or `useMessage` / `useDialog` calls.

#### Scenario: Admin dependency and source audit
- **WHEN** `nuxt-admin/package.json` and `nuxt-admin/app/` are inspected
- **THEN** they include Nuxt UI v4 and Tailwind v4 integration and contain no NaiveUI runtime dependency or usage

### Requirement: Nuxt UI global and form conventions
`nuxt-admin/app/app.vue` SHALL wrap the application in `<UApp>`. Administration forms SHALL use `UForm`, `UFormField`, and Valibot schemas for client-visible validation.

#### Scenario: Admin form validation
- **WHEN** an administrator submits an invalid login, password, or editor form
- **THEN** the relevant `UFormField` displays the Valibot validation error without relying on NaiveUI form rules

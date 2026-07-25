## 1. New Admin Application Baseline

- [x] 1.1 Create the independent `nuxt-admin/` Nuxt 4 project structure, package manifest, TypeScript configuration, and Node runtime declaration.
- [x] 1.2 Configure Nuxt UI v4, Tailwind v4, Nuxt Icon, Valibot, `UApp`, global design tokens, color mode, and an `/_ssr/` build asset directory.
- [x] 1.3 Add environment/runtime configuration for server-side .NET API access and public same-origin administration URLs without exposing private values.
- [x] 1.4 Add a clean responsive administration shell with desktop sidebar, mobile drawer, top-level account actions, route context, and a separate login layout.
- [x] 1.5 Verify a production build contains no NaiveUI dependency or runtime source usage.

## 2. BFF Authentication and SSR Guards

- [x] 2.1 Implement typed server-side clients for the existing .NET authentication endpoints and protected API contract.
- [x] 2.2 Implement `/admin/api/auth/login`, set hardened access and refresh `__Host-` cookies, and return no JWT values to browser code.
- [x] 2.3 Implement server-side token verification, one-time refresh, cookie replacement, logout/revocation, and invalid-session cookie clearing.
- [x] 2.4 Implement SSR route middleware that redirects unauthenticated protected routes to `/admin/login` and redirects authenticated login requests to `/admin`.
- [x] 2.5 Implement allowlisted `/admin/api/*` protected API forwarding that strips client Authorization headers and injects the server-read Bearer token.
- [x] 2.6 Add origin and content-type validation for state-changing BFF requests, plus normalized authentication and backend error responses.
- [ ] 2.7 Verify login, SSR access, refresh, logout, invalid-session, and cross-origin mutation rejection against the local .NET API.

## 3. Shared Admin Data Layer

- [x] 3.1 Define administration domain types and feature-local API clients for articles, comments, gallery, imagebed, AI summary, and password changes.
- [ ] 3.2 Implement shared request, loading, empty, error, confirmation, toast, and pagination utilities using Nuxt UI v4 patterns.
- [x] 3.3 Implement server-compatible fetch/composable conventions so protected initial page data is fetched without client-only authentication redirects.

## 4. Administration Workflows

- [x] 4.1 Implement the login page with Valibot validation, pending state, and safe authentication error feedback.
- [x] 4.2 Implement the dashboard with article and comment status metrics plus direct operational navigation.
- [x] 4.3 Implement article list, filtering, pagination, create, edit, preview, delete, and AI-summary workflows using the existing API contract.
- [x] 4.4 Implement a Nuxt UI-compatible Markdown editor and preview integration without copying the legacy NaiveUI wrapper.
- [x] 4.5 Implement comment listing, pending filtering, approval/status updates, and deletion.
- [x] 4.6 Implement gallery listing, creation, editing, visibility, sorting, batch import, and dimension refresh workflows.
- [x] 4.7 Implement imagebed configuration, file browsing, upload, preview, navigation, and deletion workflows supported by the existing backend contract.
- [x] 4.8 Implement account/password change and authenticated logout workflows.
- [ ] 4.9 Verify all workspace routes at desktop and mobile breakpoints, including loading, empty, error, and permission-expiry states.

## 5. Deployment Cutover Preparation

- [x] 5.1 Add a CI build-and-release job for `nuxt-admin/` that produces an independent Node server artifact.
- [ ] 5.2 Prepare PM2 configuration and Nginx routing/static-asset handling for the `nuxt-admin` output while preserving `/admin/*`, `/admin/api/*`, and `/_ssr/*` behavior.
- [ ] 5.3 Review and minimally update the Cloudflare Worker only if required to preserve the established `/admin`, `/api`, `/images`, and `/_ssr` prefix routing contract.
- [x] 5.4 Document production environment variables, deployment directory/process naming, cache controls, smoke tests, and the restoration procedure for the legacy `nuxt` release.

## 6. Validation and Cutover

- [x] 6.1 Run dependency installation, type checks, and production build for `nuxt-admin/`.
- [ ] 6.2 Verify authenticated SSR responses are private/no-store and do not contain exposed access or refresh tokens.
- [ ] 6.3 Execute end-to-end regression for login, token refresh, logout, articles, comments, gallery, imagebed, password change, and deep-linked `/admin/*` routes.
- [ ] 6.4 Deploy `nuxt-admin` alongside the legacy artifact, perform public-domain smoke tests for `/admin/login`, protected pages, BFF calls, and `/_ssr/` assets, then switch the active process.
- [ ] 6.5 Confirm rollback by restoring the legacy `nuxt` artifact/process target without data migration.
- [ ] 6.6 Keep legacy `nuxt/` frozen after successful cutover; schedule deletion only through a separate approved cleanup change.

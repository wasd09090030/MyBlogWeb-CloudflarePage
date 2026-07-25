## Context

`nuxt/` remains a legacy Node-hosted Nuxt application after public-page removal, but it has accumulated repeated UI rewrites and client-readable JWT state. Its `/admin/**` route rule disables SSR, so the current application cannot make an authenticated server-rendered first response. The Cloudflare Worker already routes `/admin`, `/api`, `/images`, and `/_ssr` to the cloud server, while `nuxt-public/` owns all public pages.

The new application must retain the external `/admin/*` contract and the current Node/PM2/Nginx deployment topology. The .NET API already issues access and refresh JWTs and authorizes protected endpoints by Bearer token.

## Goals / Non-Goals

**Goals:**

- Establish `nuxt-admin/` as an isolated Nuxt 4 SSR application using Nuxt UI v4 and Tailwind v4.
- Authenticate administration requests on the server with HttpOnly cookies and forward protected calls through a Nitro BFF.
- Rebuild the complete existing administration feature set with a new information architecture and no legacy UI code dependency.
- Perform an observable, reversible production cutover without changing public URLs or the .NET resource contract.

**Non-Goals:**

- Rebuilding `nuxt-public/`, changing public routes, or adding new business capabilities.
- Replacing the .NET JWT issuer or its data model.
- Deleting `nuxt/` during initial delivery.
- Introducing a second UI component system or preserving visual compatibility with the legacy admin.

## Decisions

### D1: Use a same-origin Nitro BFF below `/admin/api/*`

Nuxt server endpoints will own authentication and proxy administration API requests to the .NET `/api/*` service. Browser UI code calls only `/admin/api/*`; the BFF adds the access-token Bearer header server-side. The existing Worker already forwards every `/admin` prefix, so this path does not collide with its direct `/api` rule.

Direct browser calls to `.NET /api/*` were rejected because they require exposing a bearer token to client code. A separate BFF domain was rejected because it increases CORS and deployment complexity without benefit.

### D2: Store JWTs in hardened HttpOnly cookies

The BFF login endpoint will exchange credentials with `.NET /api/auth/login`, then set separate `__Host-` access and refresh cookies with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and explicit expirations. SSR middleware validates the access token against the backend and performs a one-time refresh when necessary. Logout revokes the backend refresh token when possible and clears both cookies.

`__Host-` cookies were selected over readable cookies or local storage because they cannot be read by JavaScript, cannot be scoped to a sibling subdomain, and are available to Nuxt during SSR. A server-managed session store was rejected for this change because it adds stateful infrastructure; the existing backend JWT and refresh contract is sufficient.

All BFF state-changing requests will require same-origin `Origin` validation and reject unexpected content types. SameSite reduces cross-site cookie sending but is not treated as the sole CSRF protection.

### D3: Keep true SSR enabled for protected admin pages

`/admin/**` will remain SSR-enabled. Server route middleware will redirect an unauthenticated request to `/admin/login` before rendering; authenticated users visiting login will be redirected to `/admin`. Data needed for an initial route is fetched from the BFF/server runtime, avoiding hydration-time authorization redirects.

The legacy CSR route rule was rejected because it invalidates the main reason to create a new SSR application.

### D4: Isolate assets and use a clean Nuxt UI v4 baseline

`nuxt-admin/` will use `@nuxt/ui` v4, Tailwind v4, `UApp`, Nuxt Icon, and Valibot forms. It will use `app.buildAssetsDir: '/_ssr/'`, preserving the collision avoidance between server assets and `nuxt-public`'s `/_nuxt/` assets. No source from `nuxt/app/` is copied wholesale; domain types and API payload shapes may be reimplemented deliberately.

Reusing the legacy app or migrating individual components was rejected because its NaiveUI wrappers, global styles, and client-auth state are the debt being removed.

### D5: Deliver feature parity through bounded workspace modules

The new workspace has six navigable functional areas: dashboard, articles, comments, gallery, imagebed, and account/password. Pages compose feature-local components and composables; cross-feature API and state utilities live under `app/shared/`. The application layout is a responsive administration shell with desktop navigation and mobile drawer navigation, while login uses a separate minimal layout.

Feature parity is selected over new features to constrain migration risk. Exact visual parity is explicitly rejected; the new layout is designed independently around the operational tasks.

### D6: Cut over deployment references only after acceptance

CI will build `nuxt-admin/` and package its `.output`; PM2 and Nginx documentation/configuration will point to the new output location. Worker routing remains prefix-based, but will be reviewed to confirm `/_ssr/` continues to resolve to the new process. `nuxt/` remains deployable until production smoke tests and rollback drills are complete.

Replacing `nuxt/` in place was rejected because it combines an irreversible code deletion with authentication and deployment migration.

## Risks / Trade-offs

- [Backend refresh contract changes or expires differently than assumed] -> validate login, refresh, logout, and verify behavior against the running .NET API before wiring page flows; fail closed on malformed responses.
- [SSR leaks protected data through cached HTML] -> send `Cache-Control: no-store, private` for `/admin/**`; retain Nginx cache bypass for `/admin` and authenticated requests.
- [Cookie security flags break non-HTTPS local development] -> use secure cookies in production and an explicit development-only configuration path; never relax production flags.
- [BFF proxy becomes an authorization bypass] -> allowlist forwarded administration endpoints, strip client-supplied Authorization headers, and forward only the server-read access token.
- [Cutover routes assets to the wrong Nuxt process] -> keep `/admin`, `/admin/api`, and `/_ssr` smoke checks in the release runbook and retain the old release artifact for rollback.
- [Feature parity drifts] -> map every legacy route to a new route and verify its corresponding backend call before deployment.

## Migration Plan

1. Scaffold and locally validate `nuxt-admin/` without changing production routing.
2. Implement BFF authentication, SSR guards, and one protected feature against the existing local .NET API.
3. Complete route-equivalent administration features and execute functional, SSR, and security checks.
4. Add the new CI artifact and prepare the server deployment directory/process without replacing the live process.
5. Switch PM2/Nginx to `nuxt-admin` during a maintenance window, then smoke-test `/admin/login`, authenticated SSR, `/admin/api`, and `/_ssr` asset delivery through the public domain.
6. Roll back by restoring the prior `nuxt` release artifact and PM2/Nginx target; no data migration is involved.
7. Archive or remove legacy `nuxt/` only in a separate approved cleanup change after stable operation.

## Open Questions

- The exact production process name and final server directory for `nuxt-admin` must be confirmed before the deployment task is executed.
- The legacy Markdown editor behavior requires a focused UI decision during implementation; feature parity is required, but its old NaiveUI wrapper must not be carried forward.

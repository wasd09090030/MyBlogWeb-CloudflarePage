## Why

The current `nuxt/` administration frontend has accumulated public-site remnants, repeated layout rewrites, and a client-side token model that prevents trustworthy server-side authentication. Continuing to migrate it in place would preserve that debt and leave the administration experience inconsistent with the new Nuxt UI v4 baseline.

## What Changes

- Create `nuxt-admin/` as a new Nuxt 4 server-rendered administration application using Nuxt UI v4 and Tailwind v4.
- **BREAKING**: move administration delivery from the legacy `nuxt/` project to `nuxt-admin/` while retaining the public `/admin/*` URL contract and the existing cloud-server deployment topology.
- Add a Nuxt Nitro backend-for-frontend (BFF) under `/admin/api/*` that owns login, logout, token refresh, protected API forwarding, and error normalization.
- Store access and refresh tokens only in `HttpOnly`, `Secure`, `SameSite=Lax` cookies; prevent browser JavaScript from reading JWTs.
- Rebuild the administration information architecture and layouts from zero, covering login, dashboard, articles, comments, gallery, imagebed, and password management.
- Update the Worker, CI release job, PM2, and Nginx deployment references to build and serve `nuxt-admin/`, while preserving `/admin`, `/api`, `/images`, and `/_ssr` routing responsibilities.
- Freeze the old `nuxt/` application during migration; retain it until the new production path passes acceptance and rollback validation.

## Capabilities

### New Capabilities
- `nuxt-admin-ssr-host`: standalone SSR admin application, administration routes, UI shell, and deployment asset isolation.
- `admin-bff-auth`: SSR-safe administration authentication and protected .NET API access through Nitro endpoints and HttpOnly cookies.
- `admin-workspace`: rebuilt Nuxt UI v4 administration workflows for dashboard, articles, comments, gallery, imagebed, and password management.

### Modified Capabilities
- `ui-library`: extend the Nuxt UI v4-only component-library baseline to the new `nuxt-admin/` project.

## Impact

- Adds `nuxt-admin/` with its own package manifest, Nuxt configuration, server routes, application features, layouts, and deployment configuration.
- Updates `.github/workflows/release.yml`, `cloudflare-worker/router.js`, and the server deployment references currently tied to `nuxt/`.
- Reuses the existing .NET `/api` contract; the browser no longer calls protected backend endpoints directly from the admin UI.
- Leaves `nuxt-public/`, backend data models, and legacy `nuxt/` source intact until cutover validation completes.

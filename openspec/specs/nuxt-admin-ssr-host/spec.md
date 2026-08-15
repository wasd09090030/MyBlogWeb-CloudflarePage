# nuxt-admin-host Specification

## Purpose
Define the Cloudflare-hosted administration application and its stable public route contract.
## Requirements
### Requirement: Standalone SSR admin host
The repository SHALL contain a `nuxt-admin/` Nuxt 4 application dedicated to administration. It SHALL use Nuxt UI v4, Tailwind v4, and `UApp`; it SHALL NOT include NaiveUI dependencies or component usage.

#### Scenario: Clean project dependency baseline
- **WHEN** `nuxt-admin/package.json` and `nuxt-admin/app/` are inspected
- **THEN** they declare Nuxt UI v4 and contain no `naive-ui` or `<n-*>` imports

### Requirement: Cloudflare-hosted protected routes
The `/admin/**` routes served by `nuxt-admin` SHALL be a Cloudflare Pages SPA. Its protected operations SHALL use same-origin `/admin/api/**` requests, with authentication and authorization enforced by the `blog-api` Worker before protected data is returned.

#### Scenario: Unauthenticated protected operation
- **WHEN** the Admin SPA requests a protected `/admin/api/**` endpoint without a valid administration session
- **THEN** `blog-api` rejects the request and the client redirects to `/admin/login` without rendering protected data

### Requirement: Asset namespace isolation
`nuxt-admin` SHALL publish Nuxt build assets below `/admin/_nuxt/`, distinct from the public site's `/_nuxt/` assets.

#### Scenario: Coexisting frontend assets
- **WHEN** the public site and administration application are deployed behind the Worker
- **THEN** an admin page loads assets from `/admin/_nuxt/` without replacing or requesting the public site's `/_nuxt/` assets

### Requirement: Stable deployment route contract
The deployment SHALL serve administration pages at `/admin/*`, route admin/public/image API prefixes to the `blog-api` Worker, and use the `blog-router` Worker as the public hostname entrypoint.

#### Scenario: Existing admin bookmark
- **WHEN** a user requests an existing `/admin/gallery` bookmark after cutover
- **THEN** the request reaches the Admin Pages SPA through `blog-router` and renders the gallery administration workflow

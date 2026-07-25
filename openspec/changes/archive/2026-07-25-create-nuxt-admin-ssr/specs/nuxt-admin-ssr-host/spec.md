## ADDED Requirements

### Requirement: Standalone SSR admin host
The repository SHALL contain a `nuxt-admin/` Nuxt 4 application dedicated to administration. It SHALL use Nuxt UI v4, Tailwind v4, and `UApp`; it SHALL NOT depend on `nuxt/` application source files or NaiveUI.

#### Scenario: Clean project dependency baseline
- **WHEN** `nuxt-admin/package.json` and `nuxt-admin/app/` are inspected
- **THEN** they declare Nuxt UI v4 and contain no `naive-ui`, `<n-*>`, or legacy `nuxt/` source imports

### Requirement: Server-rendered protected routes
The `/admin/**` routes served by `nuxt-admin` SHALL render with SSR enabled. An unauthenticated request to a protected route SHALL redirect before protected page content is rendered.

#### Scenario: Unauthenticated protected route request
- **WHEN** a browser requests `/admin/articles` without valid administration cookies
- **THEN** the server returns a redirect to `/admin/login` and does not render article content

### Requirement: Asset namespace isolation
`nuxt-admin` SHALL publish Nuxt build assets below `/_ssr/`, distinct from the public site's `/_nuxt/` assets.

#### Scenario: Coexisting frontend assets
- **WHEN** the public site and administration application are deployed behind the Worker
- **THEN** an admin page loads assets from `/_ssr/` without replacing or requesting the public site's `/_nuxt/` assets

### Requirement: Stable deployment route contract
The deployment SHALL continue to serve administration pages at `/admin/*`, backend public/API routes at their existing prefixes, and server assets at `/_ssr/*`.

#### Scenario: Existing admin bookmark
- **WHEN** a user requests an existing `/admin/gallery` bookmark after cutover
- **THEN** the request reaches `nuxt-admin` and renders the gallery administration workflow

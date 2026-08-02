# nuxt-admin-ssr-host Specification Delta

## MODIFIED Requirements

### Requirement: Standalone SSR admin host
The repository SHALL contain a `nuxt-admin/` Nuxt 4 application dedicated to administration. It SHALL use Nuxt UI v4, Tailwind v4, and `UApp`; it SHALL NOT depend on `nuxt/` application source files or NaiveUI. Its production server runtime SHALL be a Cloudflare Worker built with Nitro's `cloudflare_module` preset and SHALL not require a Node host process.

#### Scenario: Clean project dependency baseline
- **WHEN** `nuxt-admin/package.json` and `nuxt-admin/app/` are inspected
- **THEN** they declare Nuxt UI v4 and contain no `naive-ui`, `<n-*>`, or legacy `nuxt/` source imports

#### Scenario: Cloudflare runtime baseline
- **WHEN** the production admin artifact is deployed
- **THEN** it runs as a Cloudflare Worker and does not require PM2, Nginx, or the .NET API process

### Requirement: Server-rendered protected routes
The `/admin/**` routes served by `nuxt-admin` SHALL render with SSR enabled on the Cloudflare Worker. An unauthenticated request to a protected route SHALL redirect before protected page content is rendered.

#### Scenario: Unauthenticated protected route request
- **WHEN** a browser requests `/admin/articles` without a valid D1-backed administration session
- **THEN** the Worker returns a redirect to `/admin/login` and does not render article content

### Requirement: Asset namespace isolation
`nuxt-admin` SHALL publish Nuxt build assets below `/_ssr/`, distinct from the public site's `/_nuxt/` assets, when served through the front-door Worker.

#### Scenario: Coexisting frontend assets
- **WHEN** the public site and administration Worker are deployed behind the same domain
- **THEN** an admin page loads assets from `/_ssr/` without replacing or requesting the public site's `/_nuxt/` assets

### Requirement: Stable deployment route contract
The deployment SHALL continue to serve administration pages at `/admin/*`, public/API routes at `/api/*`, media routes at `/images/*`, and server assets at `/_ssr/*`. The front-door Worker SHALL route these server prefixes to the Cloudflare admin Worker.

#### Scenario: Existing admin bookmark
- **WHEN** a user requests an existing `/admin/gallery` bookmark after cutover
- **THEN** the request reaches the Cloudflare admin Worker and renders the gallery administration workflow

# Cloudflare Admin Runtime

## MODIFIED Requirements

### Requirement: Free API Worker and static Admin Pages
The production active runtime SHALL deploy the Nuxt Admin SPA to a Cloudflare Pages project and SHALL deploy the server/API output as a Free Worker named by configuration. It SHALL not require SSR, PM2, Nginx, a Node process, Workers Paid, or a .NET API process.

#### Scenario: Static Admin build
- **WHEN** the Admin build is generated
- **THEN** `.output/public` contains a static SPA shell/assets and no protected business data

#### Scenario: API Worker build
- **WHEN** the API build is deployed with Wrangler
- **THEN** the Worker can serve D1/API routes without an R2 binding or SSR page rendering

### Requirement: Request-scoped D1 and secret access
Server handlers SHALL access D1 and secrets through request-scoped Cloudflare bindings. The active Admin runtime SHALL not require an R2 binding.

#### Scenario: D1 binding is available
- **WHEN** an API route runs under `wrangler dev` or the deployed Worker
- **THEN** it can obtain the configured D1 binding without global process state

### Requirement: Service-bound front-door routing
`blog-router` SHALL route `/admin/api/*`, `/api/*`, and `/images/*` to the `BLOG_API` Service Binding, `/admin/*` static requests to the Admin Pages origin, and all other paths to Public Pages.

#### Scenario: Deep Admin bookmark
- **WHEN** the public domain receives `GET /admin/gallery`
- **THEN** the router fetches the Admin SPA entry and the browser can hydrate the gallery route

### Requirement: Ordered deployment and Free limits
Deployment automation SHALL apply D1 migrations before `blog-api`, deploy Admin Pages and the router only after the API exists, and SHALL not configure a Paid CPU limit or commit secrets.

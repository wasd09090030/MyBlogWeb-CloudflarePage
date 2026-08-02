# Cloudflare Admin Runtime

## ADDED Requirements

### Requirement: Cloudflare Worker admin host
The production administration runtime SHALL be built from `nuxt-admin/` with Nitro's `cloudflare_module` preset and SHALL deploy as a Cloudflare Worker named by the deployment configuration. It SHALL NOT require PM2, Nginx, a Node server process, or a running .NET API for active administration workflows.

#### Scenario: Worker build output
- **WHEN** the production admin build and deployment command are run
- **THEN** the generated artifact is deployable with Wrangler and does not require `node .output/server/index.mjs` or PM2 at runtime

### Requirement: Cloudflare binding access
Server handlers SHALL access D1, R2, secrets, and optional KV through request-scoped Cloudflare bindings. Binding access SHALL be type-declared and SHALL work in local Wrangler development and the deployed Worker.

#### Scenario: D1 binding is available to a server route
- **WHEN** a server route runs under `wrangler dev` or the deployed Worker
- **THEN** it can obtain the configured D1 binding from the Cloudflare request runtime without reading a global process-only value

### Requirement: Service-bound front-door routing
The existing front-door Worker SHALL route `/admin`, `/api`, `/images`, and `/_ssr` requests to the admin Worker through a Service Binding, while non-server paths continue to the public Cloudflare Pages origin.

#### Scenario: Protected admin request reaches the bound Worker
- **WHEN** the public domain receives `GET /admin/articles`
- **THEN** `blog-router` forwards the original request to the bound admin Worker and does not send it to the retired server origin

### Requirement: Cloudflare deployment order and secrets
Deployment automation SHALL apply D1 migrations before deploying the admin Worker, deploy the admin Worker before the router that references its Service Binding, and SHALL provision secrets outside source control.

#### Scenario: First production deployment
- **WHEN** the Cloudflare deployment workflow runs from a clean account
- **THEN** the D1 schema exists before application traffic is enabled and the router deployment succeeds because its target Service Binding Worker already exists

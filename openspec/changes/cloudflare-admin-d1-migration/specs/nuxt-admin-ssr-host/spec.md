# Nuxt Admin SPA Host

## MODIFIED Requirements

### Requirement: Static Admin application
`nuxt-admin/` SHALL remain a Nuxt 4 Nuxt UI v4 application dedicated to administration, use `ssr: false`, and deploy its generated static output to a Cloudflare Pages project. It SHALL not depend on the legacy `nuxt/` source or NaiveUI.

#### Scenario: Clean SPA build
- **WHEN** `nuxt-admin` is generated
- **THEN** the output contains the Admin shell/assets and no D1, image API, session, or deployment secrets

### Requirement: Client route guard and server API authorization
Admin navigation SHALL check the same-origin session endpoint after SPA load, while every `/admin/api/*` request SHALL enforce D1-backed authorization independently of the client guard.

#### Scenario: Unauthenticated deep link
- **WHEN** a browser opens `/admin/articles` without a session
- **THEN** the SPA shell loads and redirects to `/admin/login` after the session endpoint returns `401`

### Requirement: Asset namespace isolation
Admin assets SHALL use an `/admin/_nuxt/*`-style public path distinct from the public site's `/_nuxt/*` assets. The new build SHALL not depend on `/_ssr/*`.

### Requirement: Stable route contract
The public hostname SHALL continue to expose `/admin/*`, `/api/*`, and `/images/*`; the router SHALL map static Admin requests to Admin Pages and API/media requests to `blog-api`.

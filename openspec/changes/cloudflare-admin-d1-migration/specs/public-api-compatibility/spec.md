# Public API Compatibility

## ADDED Requirements

### Requirement: Same-origin public API
The Cloudflare runtime SHALL expose the active public API under the existing `/api/*` prefix so `nuxt-public` can use a relative `/api` base at browser runtime. The public API SHALL not require a browser-readable bearer token.

#### Scenario: Public article request
- **WHEN** a browser requests `GET /api/articles/42` through the public domain
- **THEN** the request is served by the Cloudflare runtime and returns the existing public article response shape without contacting the retired .NET origin

### Requirement: Public API contract stability
Article, gallery, and comment endpoints SHALL preserve the existing paths, query semantics, status codes, and JSON field names required by the current `nuxt-public` build and client code.

#### Scenario: Static build data fetch
- **WHEN** the public SSG build fetches the article list and detail routes from the configured build-time API URL
- **THEN** it receives the same route data needed to generate the current article and sitemap paths

### Requirement: Public mutation protection
Public comment creation and like mutations SHALL validate request shape, apply appropriate abuse/rate controls, and SHALL not expose administrator session state.

#### Scenario: Public comment submission
- **WHEN** a visitor submits a valid comment through `POST /api/comments`
- **THEN** the comment is stored as pending and the response contains only the public comment result, not admin credentials or session data

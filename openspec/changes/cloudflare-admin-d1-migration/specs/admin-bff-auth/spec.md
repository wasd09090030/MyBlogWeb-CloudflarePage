# admin-bff-auth Specification Delta

## MODIFIED Requirements

### Requirement: BFF-owned authentication exchange
The system SHALL expose administration authentication through same-origin Nitro endpoints below `/admin/api/auth/*`. The browser SHALL NOT call a protected API with a browser-readable bearer token. Login SHALL validate the administrator against D1 and establish a D1-backed opaque session without contacting the .NET API.

#### Scenario: Successful login
- **WHEN** valid administrator credentials are submitted to `/admin/api/auth/login`
- **THEN** the Worker validates the D1 password record, returns no token in the response body, and establishes an authenticated server-readable session cookie

### Requirement: Hardened session cookie
The BFF SHALL store the opaque session token in a `__Host-admin_session` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and explicit expiry attributes in production. The D1 row SHALL store only a token hash and session metadata.

#### Scenario: Browser script token isolation
- **WHEN** an authenticated administrator runs browser JavaScript on an admin page
- **THEN** the session token cannot be read from `document.cookie`

### Requirement: Server-side protected API handling
The BFF SHALL allowlist administration API routes and SHALL resolve them through Cloudflare domain services and D1/R2 bindings. It SHALL reject client-supplied `Authorization` headers and SHALL not forward protected requests to the retired .NET API.

#### Scenario: Protected article update
- **WHEN** an authenticated browser sends a valid article update to `/admin/api/articles/:id`
- **THEN** the Worker validates the D1 session, performs the D1 write, and returns the normalized result without exposing credentials

### Requirement: Session renewal, logout, and invalid-session handling
The BFF SHALL reject expired or revoked sessions, clear the session cookie on invalid authentication, and revoke the current D1 session on logout. Password changes SHALL revoke other active sessions and require the new password to be stored using the configured edge-compatible hash.

#### Scenario: Invalid session
- **WHEN** a protected SSR request carries an expired or revoked session cookie
- **THEN** the Worker clears the cookie and redirects to `/admin/login` without rendering protected page content

### Requirement: State-changing BFF request protection
The BFF SHALL require a same-origin `Origin` value for state-changing requests and SHALL reject unexpected content types before any D1 or R2 mutation.

#### Scenario: Cross-origin mutation attempt
- **WHEN** a cross-origin site sends a state-changing request to `/admin/api/*`
- **THEN** the Worker rejects the request without changing D1 or R2 data

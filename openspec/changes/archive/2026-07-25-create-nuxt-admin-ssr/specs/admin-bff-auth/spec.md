## ADDED Requirements

### Requirement: BFF-owned authentication exchange
The system SHALL expose administration authentication through same-origin Nitro endpoints below `/admin/api/auth/*`. The browser SHALL NOT call protected .NET API endpoints with a browser-readable bearer token.

#### Scenario: Successful login
- **WHEN** valid administrator credentials are submitted to `/admin/api/auth/login`
- **THEN** the BFF obtains tokens from `.NET /api/auth/login`, returns no token in the response body, and establishes authenticated server-readable cookies

### Requirement: Hardened token cookies
The BFF SHALL store access and refresh tokens in separate `__Host-` cookies with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and explicit expiry attributes in production.

#### Scenario: Browser script token isolation
- **WHEN** an authenticated administrator runs browser JavaScript on an admin page
- **THEN** neither access nor refresh token can be read from `document.cookie`

### Requirement: Server-side protected API forwarding
The BFF SHALL forward allowlisted protected administration API calls to `.NET /api/*` with the server-read access token as the sole Authorization header. It SHALL reject client-supplied Authorization headers.

#### Scenario: Protected article update
- **WHEN** an authenticated browser sends a valid article update to its `/admin/api/*` BFF endpoint
- **THEN** the BFF forwards the request to the corresponding .NET endpoint with a Bearer token and returns the normalized backend result without exposing the token

### Requirement: Refresh, logout, and invalid-session handling
The BFF SHALL refresh an expired access token using the refresh cookie, replace cookies only after a successful refresh, and clear cookies plus redirect to login when a session cannot be renewed. Logout SHALL clear both cookies and request backend refresh-token revocation when an access token is available.

#### Scenario: Expired access token with valid refresh token
- **WHEN** SSR authentication detects an expired access token and a valid refresh cookie
- **THEN** the BFF refreshes the session server-side and renders the originally requested protected page without a client-side login redirect

#### Scenario: Invalid session
- **WHEN** neither the access token nor refresh token can establish a valid session
- **THEN** protected SSR routes redirect to `/admin/login` and both token cookies are cleared

### Requirement: State-changing BFF request protection
The BFF SHALL require a same-origin `Origin` value for state-changing requests and SHALL reject requests with unexpected content types before forwarding them.

#### Scenario: Cross-origin mutation attempt
- **WHEN** a cross-origin site sends a state-changing request to `/admin/api/*`
- **THEN** the BFF rejects the request without forwarding it to the .NET API

# Admin BFF Authentication

## MODIFIED Requirements

### Requirement: Same-origin application authentication
The system SHALL expose `/admin/api/auth/*` through the same-origin `blog-api` Worker. The browser SHALL not receive a bearer token. Login SHALL validate D1 credentials and establish a D1-backed opaque session cookie without contacting .NET.

### Requirement: Hardened session cookie
The session SHALL use `__Host-admin_session` with `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, and explicit expiry in production. D1 SHALL store only the token hash and session metadata.

### Requirement: API authorization independent of SPA guards
Every protected `/admin/api/*` route SHALL validate the D1 session and reject client-supplied `Authorization` headers. The static SPA route guard SHALL never be the security boundary.

### Requirement: Logout, invalidation, and password change
Expired/revoked sessions SHALL be rejected and cleared. Logout SHALL revoke the current session. Password changes SHALL store the configured edge-compatible hash and revoke other sessions.

### Requirement: State-changing request protection
State-changing Admin API requests SHALL require the expected same-origin `Origin` and a supported content type before D1 or image-host mutation.

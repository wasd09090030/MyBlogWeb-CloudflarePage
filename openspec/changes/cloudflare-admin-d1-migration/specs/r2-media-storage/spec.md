# R2 Media Storage

## ADDED Requirements

### Requirement: Reuse existing object keys
The media implementation SHALL reuse the confirmed existing R2 bucket and existing storage keys referenced by imported image assets. It SHALL not require copying unchanged objects merely to complete the database migration.

#### Scenario: Existing cover remains readable
- **WHEN** an imported article references an existing `storageKey`
- **THEN** the Cloudflare image route can retrieve the corresponding object from the reused R2 bucket and return it with the expected content type

### Requirement: Authenticated streaming writes
R2 upload and delete operations SHALL require a valid admin session and SHALL stream request/response bodies without buffering large media files into D1 or an unbounded Worker object.

#### Scenario: Unauthorized upload
- **WHEN** an unauthenticated request posts a file to the admin upload route
- **THEN** the Worker rejects it before writing any R2 object

### Requirement: Stable public image resolution
The Worker SHALL resolve stable public image IDs through D1 metadata and SHALL preserve the public `/images/*` URL contract, cache headers, and safe storage-key validation.

#### Scenario: Invalid storage key
- **WHEN** an image asset contains a storage key with a scheme or traversal segment
- **THEN** the Worker rejects the resolution and does not fetch an arbitrary external URL or path

### Requirement: Secret isolation
Third-party imagebed credentials and Cloudflare API credentials SHALL be stored as Worker secrets or bindings and SHALL never be returned in API responses, committed to source, or copied into D1 as plaintext configuration.

#### Scenario: Image configuration response
- **WHEN** an authenticated administrator reads media configuration
- **THEN** the response contains only non-secret display/configuration fields and no provider token

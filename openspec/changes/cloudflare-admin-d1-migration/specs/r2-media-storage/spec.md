# External Image-Host Media

## MODIFIED Requirements

### Requirement: Metadata-only image assets
The Admin D1 schema SHALL preserve image `public_id`, `storage_key`, `source_url`, content type, version, kind, and active state, but SHALL not store image/file binaries or bind the Admin Worker to the image-host R2 bucket.

#### Scenario: Imported cover remains addressable
- **WHEN** a migrated article references an image asset
- **THEN** the public API returns the stable external image URL and the compatibility image route can redirect to it

### Requirement: Authenticated external API operations
Image upload, list, and delete operations SHALL require a valid Admin session and SHALL call the independent image-host API with a Worker-only Bearer token. Upload bodies SHALL be streamed and provider responses SHALL be normalized to the existing Admin contract.

#### Scenario: Unauthorized upload
- **WHEN** an unauthenticated request posts a file to the Admin upload route
- **THEN** the Worker rejects it before contacting the image-host API

### Requirement: Stable public resolution
`/images/<public-id>` SHALL resolve an active D1 metadata row and redirect only to a validated external `source_url`. It SHALL not fetch arbitrary URLs or proxy image bytes.

### Requirement: Secret isolation
The image-host token SHALL be a Worker Secret and SHALL never be stored in D1, Pages output, API responses, or client state.

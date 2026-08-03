# Admin Workspace

## MODIFIED Requirements

### Requirement: Gallery and external image-host workflows
The workspace SHALL allow authenticated administrators to manage D1 gallery records and image-host configuration/files through the protected API. It SHALL not require an Admin-owned R2 binding or the .NET service.

#### Scenario: Gallery visibility change
- **WHEN** an administrator toggles a gallery item's active state
- **THEN** the API writes the D1 gallery record and the SPA displays the returned state

#### Scenario: Image upload
- **WHEN** an administrator uploads an image from the imagebed workflow
- **THEN** the API streams it to the independent image-host API, synchronizes metadata, and returns a safe public URL without exposing the provider token

### Requirement: Account password workflow
The workspace SHALL retain password change/reset through the D1-backed authentication service and SHALL revoke other active sessions after a successful password change.

### Requirement: Pages deployment operation
The workspace SHALL retain an authenticated operation that triggers the public Pages deployment through a Worker Secret.

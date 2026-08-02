# admin-workspace Specification Delta

## MODIFIED Requirements

### Requirement: Gallery and imagebed workflows
The workspace SHALL allow authenticated administrators to manage gallery records and R2-backed media configuration/files through the Cloudflare admin Worker. It SHALL not require the retired external imagebed API or .NET service.

#### Scenario: Gallery visibility change
- **WHEN** an administrator toggles a gallery item's active state
- **THEN** the Worker writes the D1 gallery record and the gallery list displays the returned state

#### Scenario: R2 image upload
- **WHEN** an administrator uploads an image from the imagebed workflow
- **THEN** the Worker streams it to the reused R2 bucket, creates/updates image metadata in D1, and returns a safe public URL without exposing provider credentials

### Requirement: Account password workflow
The workspace SHALL allow an authenticated administrator to change the administration password through the D1-backed authentication service without exposing session tokens. A successful password change SHALL revoke other active sessions.

#### Scenario: Password change
- **WHEN** an administrator submits a valid current password and new password
- **THEN** the Worker stores the new edge-compatible password hash, revokes other sessions, and displays the resulting success state

### Requirement: Pages deployment operation
The workspace SHALL retain an authenticated operation for triggering a public Pages deployment through a secret-backed Cloudflare integration.

#### Scenario: Public Pages deployment trigger
- **WHEN** an authenticated administrator submits the Pages deployment operation
- **THEN** the Worker invokes the configured Cloudflare deploy hook/API without returning or storing the provider token in browser-visible data

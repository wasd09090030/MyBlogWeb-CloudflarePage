## ADDED Requirements

### Requirement: Write-only credential storage
Credentials SHALL be writable from the admin but MUST NOT be returned to any client in plaintext. The read endpoint SHALL return only the SteamID, a masked key suffix, the active source, and audit timestamps.

#### Scenario: Reading stored credentials
- **WHEN** an authenticated administrator opens the gaming page
- **THEN** the response SHALL contain `steamId`, `hasKey`, `keyLast4`, `source`, `updatedAt`, and `updatedBy`
- **AND** the API key MUST NOT appear in the response body, headers, or logs

#### Scenario: Updating without replacing the key
- **WHEN** the administrator saves a new SteamID and leaves the key field empty
- **THEN** the existing encrypted key SHALL be preserved and the SteamID updated

### Requirement: Encryption at rest
The API key SHALL be encrypted with AES-GCM before it is written to D1, using a key derived from a Worker secret. The stored row MUST NOT contain recoverable plaintext.

#### Scenario: Database export
- **WHEN** the `steam_credentials` table is exported or inspected directly
- **THEN** only ciphertext, IV, and the four-character suffix SHALL be present

#### Scenario: Missing encryption material
- **WHEN** neither `STEAM_CREDENTIAL_KEY` nor `SESSION_PEPPER` is configured
- **THEN** saving credentials SHALL fail with a 503 explaining which secret to configure, and no row SHALL be written

#### Scenario: Undecryptable row
- **WHEN** the stored ciphertext cannot be decrypted with the current secret
- **THEN** the system SHALL treat the database credentials as absent, fall back to environment credentials, and surface a re-entry hint to the administrator

### Requirement: Validation before persisting
The system SHALL verify submitted credentials against Steam before storing them.

#### Scenario: Rejected key
- **WHEN** Steam answers 401 or 403 for the submitted pair
- **THEN** the request SHALL fail with 400, the message SHALL name the rejection, and no row SHALL change

#### Scenario: Unknown SteamID
- **WHEN** Steam returns an empty player list for the submitted SteamID
- **THEN** the request SHALL fail with 400 and MUST NOT store the credentials

#### Scenario: Upstream unavailable
- **WHEN** the validation call times out or returns 5xx
- **THEN** the request SHALL fail with 502 and MUST NOT store the credentials

### Requirement: Clear and fall back
The administrator SHALL be able to remove stored credentials, after which environment credentials take over.

#### Scenario: Clearing stored credentials
- **WHEN** the administrator confirms removal
- **THEN** the stored row SHALL be deleted and the reported source SHALL become `env` when environment credentials exist, otherwise `none`

### Requirement: Key rotation without data loss
Every sealed value SHALL record a fingerprint of the master key that produced it, and decryption SHALL accept either the current key or the explicitly retired key.

#### Scenario: Rotating the master key
- **WHEN** the new key becomes current and the old value is provisioned as previous
- **THEN** rows written with the old key SHALL still decrypt and the reported source SHALL remain `db`

#### Scenario: Retired key removed too early
- **WHEN** neither the current nor the previous key matches a row's fingerprint
- **THEN** the row SHALL be treated as unreadable, environment fallback SHALL apply, and the admin SHALL be prompted to re-enter the credential

#### Scenario: Ciphertext moved between fields
- **WHEN** a sealed value is copied into a different purpose's column
- **THEN** decryption SHALL fail because the associated data binds purpose and key fingerprint


### Requirement: Least-privilege administration
Every credential endpoint SHALL require an admin session, same-origin mutation checks, and SHALL NOT leak whether a key is valid for any other account.

#### Scenario: Unauthenticated request
- **WHEN** a request arrives without a valid session cookie
- **THEN** the endpoint SHALL respond 401 without touching D1

#### Scenario: Cross-origin mutation
- **WHEN** a mutation arrives from a foreign origin
- **THEN** the endpoint SHALL reject it with 403 before reading the body

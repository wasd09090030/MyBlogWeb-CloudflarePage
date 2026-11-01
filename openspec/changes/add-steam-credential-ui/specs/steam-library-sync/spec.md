## MODIFIED Requirements

### Requirement: Privacy detection and honest degradation
The system SHALL distinguish "no data because of privacy or configuration" from "no data because of failure" and MUST NOT present an empty library as a valid snapshot. Credentials MAY come from the admin-managed database row or from environment variables, with the database taking precedence.

#### Scenario: Profile game details become private
- **WHEN** `GetOwnedGames` returns an empty response body for a previously populated account
- **THEN** the snapshot SHALL be marked `privacy_blocked`, the public contract SHALL report `unavailable` with that reason, and previously stored games MUST NOT be re-emitted as current data

#### Scenario: Profile becomes public again
- **WHEN** a later run returns a non-empty library
- **THEN** the visibility SHALL return to `public` and normal snapshots SHALL resume without manual intervention

#### Scenario: No usable credentials
- **WHEN** neither the encrypted database row yields a key nor the `STEAM_ID` / `STEAM_API_KEY` environment pair is complete
- **THEN** scheduled runs SHALL be skipped, the public contract SHALL report `unconfigured`, and no upstream request SHALL be attempted

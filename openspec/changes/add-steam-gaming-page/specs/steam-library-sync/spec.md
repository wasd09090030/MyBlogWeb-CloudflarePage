## ADDED Requirements

### Requirement: Scheduled snapshot ingestion
The system SHALL refresh Steam data on a recurring schedule (default hourly) and MUST NOT overwrite the last successful snapshot when a run fails.

#### Scenario: Scheduled run succeeds
- **WHEN** the cron trigger fires and Steam returns valid responses
- **THEN** the run SHALL be recorded with status `success`, the snapshot timestamp updated, and normalized rows upserted

#### Scenario: Steam returns 429 or 5xx
- **WHEN** any required upstream call returns 429 or a 5xx status
- **THEN** the run SHALL abort remaining optional calls, record status `failed` with the upstream status, apply exponential backoff to the next attempt, and leave the previous snapshot readable

#### Scenario: Overlapping runs
- **WHEN** a run is still in progress when the next trigger fires
- **THEN** the new run SHALL be skipped and recorded as `skipped` without issuing upstream calls

### Requirement: Normalized persistence
The system SHALL store the profile, library, achievements, and run history in D1 with idempotent upserts keyed by Steam identifiers.

#### Scenario: Repeated identical payload
- **WHEN** two consecutive runs return the same library
- **THEN** the second run SHALL update timestamps once per game and MUST NOT create duplicate rows

#### Scenario: Game disappears from the library
- **WHEN** a previously stored game is absent from a successful run
- **THEN** the row SHALL be marked not visible instead of being deleted, so historical display and manual review remain possible

### Requirement: Bounded upstream usage
Each run SHALL enforce a maximum number of upstream requests sized to stay within the Worker subrequest limit, and achievement details SHALL be refreshed for a bounded rolling candidate set rather than the entire library.

#### Scenario: Request budget exhausted
- **WHEN** the remaining request budget reaches the reserved floor before all candidate games are processed
- **THEN** the run SHALL stop scheduling further achievement calls, persist what succeeded, finish as `partial`, and continue from a stored cursor on the next run

#### Scenario: Achievement data unavailable
- **WHEN** an achievement call fails because the game has no stats or the profile hides them
- **THEN** existing achievement rows SHALL be retained, the game marked with an unsynced timestamp, and the run MUST NOT fail because of that single title

### Requirement: Privacy detection and honest degradation
The system SHALL distinguish "no data because of privacy or configuration" from "no data because of failure" and MUST NOT present an empty library as a valid snapshot.

#### Scenario: Profile game details become private
- **WHEN** `GetOwnedGames` returns an empty response body for a previously populated account
- **THEN** the snapshot SHALL be marked `privacy_blocked`, the public contract SHALL report `unavailable` with that reason, and previously stored games MUST NOT be re-emitted as current data

#### Scenario: Profile becomes public again
- **WHEN** a later run returns a non-empty library
- **THEN** the visibility SHALL return to `public` and normal snapshots SHALL resume without manual intervention

#### Scenario: API key not configured
- **WHEN** the `STEAM_API_KEY` secret is absent
- **THEN** scheduled runs SHALL be skipped, the public contract SHALL report `unconfigured`, and no upstream request SHALL be attempted

### Requirement: Manual refresh
The admin SHALL be able to trigger a sync on demand through a session-protected same-origin endpoint that shares the scheduled run's budget and guards.

#### Scenario: Unauthenticated request
- **WHEN** a request arrives without a valid admin session cookie
- **THEN** the endpoint SHALL respond 401 and MUST NOT issue any upstream call

#### Scenario: Refresh requested too frequently
- **WHEN** a manual refresh is requested within the cooldown window
- **THEN** the endpoint SHALL respond 429 with a retry hint and MUST NOT start a second run

### Requirement: Least-privilege public contract
The public read endpoint SHALL expose an allowlisted projection of the snapshot, SHALL NOT include the SteamID, friends, locale, or raw upstream payloads, and SHALL be cacheable at the edge.

#### Scenario: Overview request
- **WHEN** a client requests the overview endpoint
- **THEN** the response SHALL include the documented fields only, set a cacheable `Cache-Control` header, and report freshness through `syncedAt` plus a `stale` flag when the snapshot is older than the freshness window

#### Scenario: Key transport
- **WHEN** the Worker calls Steam
- **THEN** the API key SHALL be sent in the `x-webapi-key` header over HTTPS and MUST NOT appear in URLs, logs, or client bundles

## ADDED Requirements

### Requirement: Showcase configuration model
The system SHALL persist an ordered list of showcase entries, each with a type from a fixed allowlist, a grid span, a visibility flag, and a type-specific config. The profile header SHALL be implicit and always first; the list SHALL hold at most 12 entries. The allowlist SHALL exclude custom-text and screenshot showcase types, because screenshots are served by the gallery and free-form writing belongs to articles.

#### Scenario: Unknown type rejected
- **WHEN** a save request contains a showcase type outside the allowlist
- **THEN** the request SHALL fail with a validation error naming the offending entry and no row SHALL change

#### Scenario: Removed type cannot be reintroduced
- **WHEN** a client submits a custom-text or screenshot showcase type
- **THEN** the save SHALL be rejected by the same allowlist check

#### Scenario: Slot limit exceeded
- **WHEN** more than 12 entries are submitted
- **THEN** the save SHALL be rejected without truncating silently

#### Scenario: Invalid type config
- **WHEN** a config value is outside its allowed range, such as a list limit above the type maximum
- **THEN** the save SHALL fail with a field-level error and existing configuration SHALL remain unchanged

#### Scenario: Type-specific span
- **WHEN** an entry omits a span
- **THEN** the server SHALL apply the type's default span and persist the normalized value

### Requirement: Default configuration
A fresh deployment SHALL seed a usable default showcase set so the public page is complete before any administrator action.

#### Scenario: First deploy
- **WHEN** the migration runs on an empty database
- **THEN** the default order SHALL contain favorite, collector, recent, top-playtime, completionist, rarest-achievement, and wishlist, all enabled

#### Scenario: Reset to defaults
- **WHEN** the administrator confirms a reset
- **THEN** the configuration SHALL return to the seeded default set and the previous arrangement SHALL be discarded

### Requirement: Atomic save with optimistic concurrency
Saving SHALL replace the entire ordered list in a single transaction and SHALL reject stale writes.

#### Scenario: Concurrent edit from two sessions
- **WHEN** a save arrives with an `updatedAt` older than the stored one
- **THEN** the endpoint SHALL respond 409 and MUST NOT overwrite the newer configuration

#### Scenario: Failure during replacement
- **WHEN** any statement in the replacement fails
- **THEN** the transaction SHALL roll back so the previous configuration stays fully intact

### Requirement: Public projection assembly
The public contract SHALL compose showcases from the stored configuration in order, attach resolved data, and mark modules that have no content.

#### Scenario: Disabled showcase
- **WHEN** an entry is marked hidden
- **THEN** it SHALL NOT appear in the public contract

#### Scenario: Module without content
- **WHEN** a configured showcase has no eligible data, such as completionist with zero perfect games
- **THEN** the contract SHALL mark it `empty` and the public page SHALL skip it

#### Scenario: Unknown stored type
- **WHEN** the stored configuration references a type removed from the allowlist
- **THEN** composition SHALL skip that entry and continue without failing the request

### Requirement: Session-protected administration
Reading and writing showcase configuration SHALL require a valid admin session and same-origin requests.

#### Scenario: Unauthenticated access
- **WHEN** a request arrives without a valid session cookie
- **THEN** the endpoint SHALL respond 401 and MUST NOT return configuration details

#### Scenario: Save rejected by validation
- **WHEN** the client submits an invalid configuration
- **THEN** the UI SHALL keep the previous arrangement, display the field error, and MUST NOT show a success state

### Requirement: Explicit propagation delay
The admin UI SHALL state that public ordering follows the edge cache, so a save may not be visible immediately.

#### Scenario: Reorder then open the public page
- **WHEN** the administrator saves a new order and immediately reloads the public page
- **THEN** the page MAY still serve the cached order and the admin SHALL have shown the maximum propagation delay beforehand

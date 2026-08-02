# D1 Blog Storage

## ADDED Requirements

### Requirement: Versioned D1 schema
The active blog data SHALL be represented by versioned D1 SQL migrations covering articles, comments, likes, galleries, image assets, image configuration, administrator users, and administrator sessions. Migrations SHALL be repeatable and SHALL NOT depend on EF Core `EnsureCreated()`.

#### Scenario: Apply migrations to an empty database
- **WHEN** the migration command is run against an empty staging D1 database
- **THEN** all active tables, indexes, foreign keys, and migration bookkeeping are created without requiring the .NET application

### Requirement: SQLite data import compatibility
The migration tooling SHALL import the existing SQLite data while preserving primary-key IDs, article slugs, timestamps, JSON text fields, foreign-key relationships, and existing image asset storage keys. Beatmap data MAY be imported for archival preservation but SHALL not be required by active routes.

#### Scenario: Imported article and gallery references
- **WHEN** the existing SQLite snapshot is imported
- **THEN** every article retains its ID and slug, every gallery retains its ID and image asset reference, and imported row counts match the source snapshot

### Requirement: Prepared and bounded queries
Repositories SHALL use D1 prepared statements with bound values. List/search queries SHALL be indexed and bounded by pagination or an explicit result limit; unbounded full-table reads SHALL not be used for public requests.

#### Scenario: Search input is treated as data
- **WHEN** a public article search receives a keyword containing SQL metacharacters
- **THEN** the repository binds the keyword as a parameter and returns a normal result or empty set without executing injected SQL

### Requirement: Transactional domain writes
Multi-table writes that must remain consistent SHALL use D1 batch/transaction semantics. Failed batches SHALL not leave an article, gallery, or session partially written.

#### Scenario: Article asset write fails
- **WHEN** an article creation operation fails while persisting its related image asset
- **THEN** the operation returns an error and does not leave an orphaned article row committed as a successful creation

### Requirement: Durable session and password data
Administrator credentials and session records SHALL be persisted in D1 with expiry/revocation metadata. No active authentication behavior SHALL depend on Worker global memory or a file in the deployed bundle.

#### Scenario: Worker isolate changes
- **WHEN** a subsequent request is served by a different Worker isolate
- **THEN** a valid unexpired session remains verifiable from D1 and a revoked/expired session is rejected

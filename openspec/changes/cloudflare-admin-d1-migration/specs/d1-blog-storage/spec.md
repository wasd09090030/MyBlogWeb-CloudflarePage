# D1 Blog Storage

## MODIFIED Requirements

### Requirement: Active versioned schema
Versioned D1 migrations SHALL cover `articles`, `comments`, `likes`, `galleries`, `image_assets`, non-secret `imagebed_configs`, `admin_users`, and `admin_sessions`. `cf_image_configs`, `beatmap_sets`, and `beatmap_difficulties` SHALL not exist in the final active schema.

#### Scenario: Apply migrations to an empty database
- **WHEN** the migration sequence runs against an empty staging database
- **THEN** active tables, indexes, foreign keys, and cleanup migration complete without the .NET application

### Requirement: SQLite import compatibility
The importer SHALL preserve active table IDs, article slugs, timestamps, JSON/markdown text, foreign keys, gallery ordering, image `public_id`, `storage_key`, and `source_url`. It SHALL omit image binaries, provider credentials, and Beatmap data.

#### Scenario: Imported article and gallery references
- **WHEN** the SQLite snapshot is imported
- **THEN** every active article and gallery retains its ID/reference and imported counts match the snapshot

### Requirement: Prepared bounded queries
Repositories SHALL use bound D1 statements, indexes, and bounded pagination for public and Admin lists.

### Requirement: Transactional domain writes
Multi-table article, gallery, asset, and session changes SHALL use D1 batch semantics where consistency requires it.

### Requirement: Durable application authentication
Administrator credentials and session records SHALL be persisted in D1. No authentication behavior SHALL depend on Worker global memory or a deployed file.

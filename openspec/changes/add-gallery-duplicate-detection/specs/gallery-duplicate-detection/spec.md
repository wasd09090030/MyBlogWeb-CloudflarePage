## ADDED Requirements

### Requirement: Content-based duplicate recognition
The admin SHALL compare versioned perceptual fingerprints independently of image URLs and present suspected duplicates for manual review.

#### Scenario: Recompressed image at a different address
- **WHEN** an image is resized or recompressed and imported from another URL
- **THEN** a sufficiently similar fingerprint SHALL trigger a side-by-side suspected-duplicate review
- **AND** retaining it SHALL require an explicit administrator choice

### Requirement: Complete gallery and batch preflight
The admin SHALL paginate through all gallery records including hidden entries, exclude the edited record itself, and check duplicates within an import batch.

#### Scenario: Duplicate within a new batch
- **WHEN** two incoming images match each other and no existing record
- **THEN** the later matching candidate SHALL default to skipped and reference the earlier candidate

#### Scenario: Large gallery or changed URL
- **WHEN** more than 2000 records exist or an existing image URL is edited
- **THEN** comparison SHALL cover the entire paginated catalog and exclude only the edited record

### Requirement: Optional write preflight
Duplicate checking for single saves and batch imports SHALL be disabled by default. The administrator MAY opt in before submitting; when disabled, the write MUST NOT invoke duplicate catalog, source-image, or fingerprint lookup APIs.

#### Scenario: Default save skips duplicate checks
- **WHEN** the administrator saves a single image or submits a batch without selecting duplicate checking
- **THEN** the gallery write SHALL proceed without requesting duplicate-check APIs

#### Scenario: Administrator opts in
- **WHEN** the administrator selects duplicate checking before saving or importing
- **THEN** the existing complete catalog and batch preflight SHALL run before the write

### Requirement: Explicit incomplete results
Image-read failures SHALL remain visible and retryable. A failed catalog request MUST prevent a completed preflight claim.

#### Scenario: Unreadable source
- **WHEN** a source cannot be decoded or downloaded
- **THEN** the admin SHALL show the failure and a retry action
- **AND** unchecked candidates SHALL default to skipped until explicitly retained

### Requirement: Protected bounded source access
Source reads and fingerprint writes MUST use authenticated same-origin admin APIs. Source access MUST restrict hosts, redirects, response types, size, and duration.

#### Scenario: Unsupported host or unsafe redirect
- **WHEN** a source or redirect points outside configured image hosts
- **THEN** the source request SHALL fail without fetching that destination

### Requirement: Persistent refreshable fingerprints
Successful fingerprints SHALL be cached in D1 by normalized address and algorithm version, with expiry and forced refresh support.

#### Scenario: Repeated scan
- **WHEN** a recent valid fingerprint exists
- **THEN** the admin SHALL reuse it unless forced refresh is requested

### Requirement: Existing duplicate cleanup
The admin SHALL offer existing-gallery scan and direct-pair visual review. Confirmed gallery deletion MUST delete the underlying managed media file before removing the gallery record, deactivating its assets and clearing associated fingerprints in one D1 transaction.

#### Scenario: Administrator removes a duplicate
- **WHEN** the administrator confirms removal of one displayed record
- **THEN** the managed media file and gallery record SHALL be deleted, its assets deactivated and its fingerprints cleared
- **AND** the confirmation MUST state that the media file is permanently removed

#### Scenario: File has another reference
- **WHEN** another gallery record (including hidden entries), article cover or Hero item references the same storage key through an asset or legacy URL
- **THEN** deletion MUST fail without contacting the image provider or deleting the gallery record

#### Scenario: Provider failure or unsupported source
- **WHEN** the source is outside the configured provider, cannot be resolved, or the provider does not explicitly confirm successful deletion
- **THEN** the gallery record and fingerprints MUST remain and the admin MUST display an actionable error

#### Scenario: Database cleanup fails after remote deletion
- **WHEN** remote deletion succeeds but a database cleanup statement fails
- **THEN** the database transaction MUST roll back and the admin MUST be able to retry cleanup using idempotent provider deletion

### Requirement: Exact-duplicate batch removal
The admin SHALL offer a confirmed batch action that removes only the later records of exact duplicates, where an exact duplicate is a record whose perceptual distance is zero or that resolves to the same stored file.

#### Scenario: Batch removes only later copies
- **WHEN** the administrator confirms batch removal for a group of exact duplicates
- **THEN** the record with the earliest creation time SHALL be kept and every later record SHALL be removed
- **AND** a record older than the kept one MUST NOT be removed, even if a client requests it

#### Scenario: Removed duplicate shares the kept file
- **WHEN** a removed duplicate resolves to the same storage key as the kept record, an article cover, or a Hero item
- **THEN** only its gallery row SHALL be removed and the shared media file MUST remain on the image host

#### Scenario: Bounded batches
- **WHEN** many duplicates are pending removal
- **THEN** deletion SHALL run in explicitly confirmed batches sized to stay within the Free-plan subrequest limit
- **AND** skipped and failed records SHALL be reported without claiming success

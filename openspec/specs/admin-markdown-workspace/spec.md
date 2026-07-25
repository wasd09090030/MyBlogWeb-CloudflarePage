# admin-markdown-workspace Specification

## Purpose
TBD - created by archiving change enhance-admin-markdown-editor. Update Purpose after archive.
## Requirements
### Requirement: Authenticated Markdown authoring workspace
The system SHALL provide authenticated article create and edit routes with a Markdown source editor, Nuxt UI v4 authoring controls, and source, split, and preview viewing modes.

#### Scenario: Author switches workspace mode
- **WHEN** an authenticated administrator selects source, split, or preview mode
- **THEN** the workspace SHALL show the selected mode without discarding the current article form state

### Requirement: Public-compatible Markdown preview
The system SHALL render the administration preview through the same MDC-compatible Markdown semantics used by the public site, including standard Markdown, existing MDC components, code blocks, KaTeX, and Mermaid content.

#### Scenario: Existing MDC content is previewed
- **WHEN** an administrator enters an existing supported MDC component or a Mermaid or KaTeX block
- **THEN** the preview SHALL render the corresponding content instead of displaying the raw source syntax

#### Scenario: Invalid preview input is reported
- **WHEN** Markdown parsing or a client-only diagram render fails
- **THEN** the workspace SHALL retain the source text and display actionable preview feedback without preventing continued editing

### Requirement: Markdown authoring assistance
The system SHALL provide controls for inserting common Markdown syntax and supported MDC templates at the editor selection or, when no selection is available, at the end of the document.

#### Scenario: Administrator inserts a template
- **WHEN** an administrator selects a Markdown or MDC insertion control
- **THEN** the corresponding source template SHALL be inserted into the article content and become available to preview

### Requirement: Local draft protection
The system SHALL save unsaved article form state in browser-local storage using a distinct key for each existing article and for new-article drafts. It SHALL provide restore and discard actions and SHALL clear the matching draft after a successful article save.

#### Scenario: Administrator returns to an unsaved article
- **WHEN** an administrator reopens an article route with a newer local draft
- **THEN** the workspace SHALL offer the administrator a restore or discard choice before overwriting the server-backed form state

#### Scenario: Successful save clears draft
- **WHEN** an article save succeeds
- **THEN** the workspace SHALL remove the draft associated with that article form

### Requirement: Optional imagebed image insertion
The system SHALL allow an administrator to insert an image URL into Markdown. When the existing imagebed is configured, it SHALL additionally allow an image upload through the existing protected imagebed BFF and insert the returned image URL after successful upload.

#### Scenario: Imagebed is unavailable
- **WHEN** imagebed configuration is absent or unavailable
- **THEN** the editor SHALL continue to support URL-based image insertion and SHALL not block article editing

### Requirement: Responsive authoring workflow
The system SHALL present source and preview concurrently on sufficiently wide viewports and SHALL provide an accessible single-mode switcher on narrow viewports.

#### Scenario: Mobile editing
- **WHEN** an administrator opens the article workspace on a narrow viewport
- **THEN** the layout SHALL avoid side-by-side panes that obstruct either source editing or preview access

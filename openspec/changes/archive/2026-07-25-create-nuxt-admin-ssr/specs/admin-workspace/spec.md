## ADDED Requirements

### Requirement: Responsive administration shell
Authenticated administration pages SHALL render a new Nuxt UI v4 workspace shell with persistent desktop navigation, mobile drawer navigation, route context, account actions, and theme controls. Login SHALL use a separate minimal layout.

#### Scenario: Mobile navigation
- **WHEN** an authenticated user opens an administration page on a narrow viewport
- **THEN** navigation is reachable through a drawer without obscuring the active page controls

### Requirement: Dashboard operations overview
The dashboard SHALL present administration-relevant article and comment status with direct navigation to articles and comments.

#### Scenario: Pending comments shown
- **WHEN** an authenticated administrator opens `/admin`
- **THEN** the dashboard displays the current pending-comment count and a navigation action to comment moderation

### Requirement: Article management workflow
The workspace SHALL allow authenticated administrators to list, create, edit, preview, and delete articles using the existing .NET article and AI-summary contracts.

#### Scenario: Article creation
- **WHEN** an authenticated administrator submits valid article content from `/admin/articles/create`
- **THEN** the article is created through the BFF and the user is returned to the administration article workflow

### Requirement: Comment moderation workflow
The workspace SHALL allow authenticated administrators to list all comments, filter pending comments, update comment status, and delete comments.

#### Scenario: Comment approval
- **WHEN** an administrator approves a pending comment
- **THEN** the BFF submits the status change to the existing comments API and the workspace reflects the updated moderation state

### Requirement: Gallery and imagebed workflows
The workspace SHALL allow authenticated administrators to manage gallery records and imagebed configuration/files through the existing protected backend contracts.

#### Scenario: Gallery visibility change
- **WHEN** an administrator toggles a gallery item's active state
- **THEN** the BFF forwards the protected request and the gallery list displays the returned state

### Requirement: Account password workflow
The workspace SHALL allow an authenticated administrator to change the administration password through the existing backend contract without exposing session tokens.

#### Scenario: Password change
- **WHEN** an administrator submits a valid current password and new password
- **THEN** the BFF forwards the request to `.NET /api/auth/change-password` and displays the resulting success or error state

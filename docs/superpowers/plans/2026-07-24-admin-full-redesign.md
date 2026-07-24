# Admin Full Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every `/admin/*` frontend screen as a coherent high-density Nuxt UI v4 editorial workbench.

**Architecture:** Add admin-specific shared UI primitives under `nuxt/app/shared/ui/admin/`, then migrate the admin shell and every admin page to those primitives. Preserve existing route paths, middleware, stores, composables, API calls, and backend contracts.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Tailwind CSS v4, Valibot, Pinia.

---

## File Structure

Create:

- `nuxt/app/shared/ui/admin/AdminPageHeader.vue` — shared page heading with compact action slot.
- `nuxt/app/shared/ui/admin/AdminPanel.vue` — standard high-density admin panel surface.
- `nuxt/app/shared/ui/admin/AdminToolbar.vue` — compact toolbar with left/right slots and mobile wrapping.
- `nuxt/app/shared/ui/admin/AdminMetricGrid.vue` — dense metric grid and stat link cards.
- `nuxt/app/shared/ui/admin/AdminState.vue` — loading, empty, and error state renderer.
- `nuxt/app/shared/ui/admin/AdminActionBar.vue` — shared form/modal action row.

Modify:

- `.gitignore` — ignore `.superpowers/` brainstorm artifacts.
- `nuxt/app/app.config.ts` — configure Nuxt UI admin-friendly tokens and component defaults.
- `nuxt/app/layouts/admin.vue` — replace current dashboard chrome with Editorial Studio rail/workbench shell.
- `nuxt/app/pages/admin/login.vue` — compact studio login.
- `nuxt/app/pages/admin/index.vue` — today's workbench dashboard.
- `nuxt/app/pages/admin/articles/index.vue` — dense content library.
- `nuxt/app/features/article-admin/containers/AdminArticleEditorContainer.vue` — workbench editor layout.
- `nuxt/app/pages/admin/comments/index.vue` — compact review queue.
- `nuxt/app/features/gallery-admin/containers/AdminGalleryPageContainer.vue` — visual asset workbench.
- `nuxt/app/features/gallery-admin/components/gallery/GalleryFilterBar.vue` — shared toolbar styling.
- `nuxt/app/features/gallery-admin/components/gallery/GalleryCardGrid.vue` — token-based dense image cards.
- `nuxt/app/pages/admin/imagebed/index.vue` — media library page frame.
- `nuxt/app/features/gallery-admin/components/imagebed/ImagebedFileArea.vue` — token-based media list/grid and pagination.
- `nuxt/app/features/gallery-admin/components/imagebed/ImagebedToolbar.vue` — compact breadcrumb/search/view toolbar.
- `nuxt/app/features/gallery-admin/components/imagebed/ImagebedUploadArea.vue` — compact upload workbench.
- `nuxt/app/pages/admin/password.vue` — account security page.

Do not modify:

- `backend-dotnet/BlogApi/**`
- `cloudflare-worker/**`
- public frontend routes in `nuxt-public/**`
- existing admin route paths or middleware names

## Implementation Rules

- Before editing a dirty file, read its current content and `git diff -- <file>`.
- Do not revert unrelated user changes.
- Prefer Nuxt UI components and `ui` props over custom CSS.
- Remove hard-coded `gray-*` and `blue-*` classes from admin feature components when they define permanent surfaces or accents.
- Keep all admin page headings compact; do not introduce hero-scale type.
- Use icon-only buttons with labels through accessible text or tooltips where a symbol is sufficient.
- Commit only files touched by the current task, with explicit paths.

---

### Task 1: Workspace Hygiene And Baseline

**Files:**
- Modify: `.gitignore`
- Verify: `nuxt/package.json`
- Verify: `nuxt/nuxt.config.ts`
- Verify: `nuxt/app/app.config.ts`

- [ ] **Step 1: Record dirty state before implementation**

Run:

```powershell
git status --short
git diff --stat
```

Expected: shows existing uncommitted polish files and `.superpowers/`; do not revert them.

- [ ] **Step 2: Ignore brainstorm artifacts**

Modify `.gitignore` by adding this entry under the Claude / Codex tooling section:

```gitignore
.superpowers/
```

- [ ] **Step 3: Verify Nuxt UI v4 stack is still present**

Run:

```powershell
Get-Content -Raw nuxt\package.json
Get-Content -Raw nuxt\nuxt.config.ts
```

Expected: `@nuxt/ui`, `tailwindcss` v4, `@tailwindcss/vite`, and the `@nuxt/ui` module are present.

- [ ] **Step 4: Commit hygiene change only**

Run:

```powershell
git add .gitignore
git commit -m "chore: ignore brainstorm artifacts" -- .gitignore
```

Expected: commit contains only `.gitignore`.

---

### Task 2: Admin Tokens And Shared Primitives

**Files:**
- Modify: `nuxt/app/app.config.ts`
- Create: `nuxt/app/shared/ui/admin/AdminPageHeader.vue`
- Create: `nuxt/app/shared/ui/admin/AdminPanel.vue`
- Create: `nuxt/app/shared/ui/admin/AdminToolbar.vue`
- Create: `nuxt/app/shared/ui/admin/AdminMetricGrid.vue`
- Create: `nuxt/app/shared/ui/admin/AdminState.vue`
- Create: `nuxt/app/shared/ui/admin/AdminActionBar.vue`

- [ ] **Step 1: Extend Nuxt UI admin defaults**

In `nuxt/app/app.config.ts`, keep the existing `ui.colors.primary = 'emerald'` and `ui.colors.neutral = 'slate'`. Add compact defaults for admin-heavy components without removing existing icon aliases:

```ts
table: {
  slots: {
    th: 'h-9 px-3 text-xs font-semibold uppercase tracking-wide text-muted',
    td: 'px-3 py-2 text-sm align-middle'
  }
},
card: {
  slots: {
    root: 'rounded-lg',
    header: 'px-4 py-3',
    body: 'p-4',
    footer: 'px-4 py-3'
  }
}
```

If Nuxt UI v4 rejects a global slot key during typecheck, move that customization into the shared components instead of weakening types.

- [ ] **Step 2: Create `AdminPageHeader.vue`**

Component contract:

```vue
<template>
  <header class="flex min-w-0 flex-col gap-3 border-b border-default/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0 space-y-1">
      <p v-if="eyebrow" class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {{ eyebrow }}
      </p>
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <h1 class="truncate font-display text-xl font-semibold tracking-normal text-highlighted sm:text-2xl">
          {{ title }}
        </h1>
        <slot name="badge" />
      </div>
      <p v-if="description" class="max-w-2xl text-sm leading-5 text-muted">
        {{ description }}
      </p>
      <p v-if="meta" class="text-xs font-mono text-muted">
        {{ meta }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
  meta?: string
}>()
</script>
```

- [ ] **Step 3: Create `AdminPanel.vue`**

Component contract:

```vue
<template>
  <section class="rounded-lg border border-default/70 bg-default/80 shadow-sm shadow-black/[0.03] dark:bg-elevated/70">
    <div v-if="$slots.header || title" class="flex min-w-0 items-center justify-between gap-3 border-b border-default/70 px-4 py-3">
      <div class="min-w-0">
        <h2 v-if="title" class="truncate text-sm font-semibold text-highlighted">
          {{ title }}
        </h2>
        <p v-if="description" class="mt-0.5 text-xs text-muted">
          {{ description }}
        </p>
        <slot name="header" />
      </div>
      <slot name="actions" />
    </div>
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  padded?: boolean
}>(), {
  padded: true
})

const bodyClass = computed(() => props.padded ? 'p-4' : 'p-0')
</script>
```

- [ ] **Step 4: Create `AdminToolbar.vue`**

Component contract:

```vue
<template>
  <div class="flex flex-col gap-2 rounded-lg border border-default/70 bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <slot />
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
```

- [ ] **Step 5: Create `AdminMetricGrid.vue`**

Use an `items` prop with this shape:

```ts
type AdminMetricItem = {
  label: string
  value: string | number
  hint?: string
  icon?: string
  to?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}
```

Render a responsive dense grid with `NuxtLink` when `to` exists, `UCard` or token-based panel surface, tabular numeric values, and a fixed minimum height of `5.75rem`.

- [ ] **Step 6: Create `AdminState.vue`**

Use props:

```ts
defineProps<{
  type: 'loading' | 'empty' | 'error'
  title?: string
  description?: string
  icon?: string
}>()
```

For `loading`, render `UIcon name="i-lucide-loader-circle"` with `animate-spin`. For empty/error, render one icon, a concise title, optional description, and an action slot.

- [ ] **Step 7: Create `AdminActionBar.vue`**

Render a compact responsive action row:

```vue
<template>
  <div class="flex flex-col-reverse gap-2 border-t border-default/70 pt-3 sm:flex-row sm:items-center sm:justify-end">
    <slot />
  </div>
</template>
```

- [ ] **Step 8: Run typecheck for shared primitives**

Run:

```powershell
cd nuxt
npm run typecheck
```

Expected: typecheck passes or only reports pre-existing unrelated errors. If errors come from the new components, fix them before continuing.

- [ ] **Step 9: Commit shared primitives**

Run:

```powershell
git add nuxt\app\app.config.ts nuxt\app\shared\ui\admin
git commit -m "feat(nuxt): add admin design primitives" -- nuxt\app\app.config.ts nuxt\app\shared\ui\admin
```

---

### Task 3: Redesign Admin Shell

**Files:**
- Modify: `nuxt/app/layouts/admin.vue`

- [ ] **Step 1: Replace current shell with rail/workbench structure**

Keep `UDashboardGroup`, `UDashboardSidebar`, `UDashboardPanel`, `UDashboardNavbar`, `UNavigationMenu`, `UDashboardSidebarCollapse`, and the existing route/title/auth logic. Change the visual structure to:

- dark narrow rail identity in the sidebar header;
- warm studio navigation surface in light mode;
- compact top workbar;
- content wrapper `max-w-[1500px] px-3 py-4 sm:px-4 lg:px-5`;
- default light mode when preference is `system`.

- [ ] **Step 2: Keep cross-project front link as full navigation**

The existing frontend link in the account menu may still create an `<a>` element or use `target="_blank"`. Do not replace cross-project navigation with `NuxtLink`.

- [ ] **Step 3: Verify shell route titles**

Run:

```powershell
rg "pageTitleMap|primaryLinks|secondaryLinks|handleLogout" nuxt\app\layouts\admin.vue
```

Expected: route title mapping, navigation link active checks, and logout behavior still exist.

- [ ] **Step 4: Commit shell redesign**

Run:

```powershell
git add nuxt\app\layouts\admin.vue
git commit -m "feat(nuxt): redesign admin shell" -- nuxt\app\layouts\admin.vue
```

---

### Task 4: Redesign Login And Dashboard

**Files:**
- Modify: `nuxt/app/pages/admin/login.vue`
- Modify: `nuxt/app/pages/admin/index.vue`

- [ ] **Step 1: Redesign login as compact studio entry**

Keep:

- `definePageMeta({ ssr: false, layout: false })`
- `useAuthStore`
- Valibot schema
- `authStore.login('admin', formData.value.password)`
- redirect to `/admin`

Remove giant decorative gradients. Use compact paper/elevated surfaces, one restrained brand block, one password field, one full-width primary login button, and a small footer row.

- [ ] **Step 2: Redesign dashboard as today's workbench**

Use:

- `AdminPageHeader`
- `AdminMetricGrid`
- `AdminPanel`
- `AdminState`

Keep:

- article count fetching through `getArticles`
- comments fetching through `getAllComments` and `getPendingComments`
- Pages deploy action through `API_ENDPOINTS.ops.triggerPagesDeployHook`
- article create/edit navigation

Add a compact pending comments panel only if the existing comment API data already provides enough fields; otherwise show the pending count and link to comments without adding new API calls.

- [ ] **Step 3: Verify data behavior by static checks**

Run:

```powershell
rg "triggerPagesDeployHook|getArticles|getAllComments|getPendingComments|createArticle|editArticle" nuxt\app\pages\admin\index.vue
rg "authStore.login|schema|layout: false" nuxt\app\pages\admin\login.vue
```

Expected: all searched behavior remains present.

- [ ] **Step 4: Commit login and dashboard**

Run:

```powershell
git add nuxt\app\pages\admin\login.vue nuxt\app\pages\admin\index.vue
git commit -m "feat(nuxt): redesign admin login and dashboard" -- nuxt\app\pages\admin\login.vue nuxt\app\pages\admin\index.vue
```

---

### Task 5: Redesign Article Library And Editor

**Files:**
- Modify: `nuxt/app/pages/admin/articles/index.vue`
- Modify: `nuxt/app/features/article-admin/containers/AdminArticleEditorContainer.vue`
- Verify: `nuxt/app/pages/admin/articles/create.vue`
- Verify: `nuxt/app/pages/admin/articles/[id].vue`

- [ ] **Step 1: Redesign article list as content library**

Use:

- `AdminPageHeader`
- `AdminToolbar`
- `AdminPanel`
- `AdminState`
- Nuxt UI `UTable`, `UPagination`, `USelectMenu`, `UInput`, `UModal`

Keep:

- `fetchArticles`
- local search and category filtering
- pagination
- `createArticle`
- `goToEditPage`
- `getArticlePath`
- delete confirmation and `deleteArticle`

- [ ] **Step 2: Tighten article table**

The table must keep these columns:

- id
- title
- category
- created date
- updated date
- actions

Actions should be icon buttons with `aria-label` values for edit, preview, and delete.

- [ ] **Step 3: Redesign editor workbench**

In `AdminArticleEditorContainer.vue`, keep all script-side behavior. Restructure template only:

- `AdminPageHeader` for title and actions.
- Main editor panel first.
- Settings panel second on desktop, below editor on mobile.
- Sticky action area where it does not conflict with the markdown editor.
- Existing draft, restore, clear, AI summary, save, cover preview, stats, and validation behavior remain.

- [ ] **Step 4: Remove token violations in editor**

Replace permanent surface classes such as `text-gray-500`, `dark:border-gray-700`, `text-yellow-500`, and `bg-secondary` with Nuxt UI token classes such as `text-muted`, `border-default`, `text-warning`, `bg-muted`, `bg-elevated`, or component `color` props.

- [ ] **Step 5: Verify create/edit route wrappers still point to the editor**

Run:

```powershell
Get-Content -Raw -LiteralPath "nuxt\app\pages\admin\articles\[id].vue"
Get-Content -Raw nuxt\app\pages\admin\articles\create.vue
```

Expected: both wrappers still render `AdminArticleEditorContainer` or the existing create wrapper behavior remains functionally equivalent.

- [ ] **Step 6: Commit article pages**

Run:

```powershell
git add nuxt\app\pages\admin\articles\index.vue nuxt\app\features\article-admin\containers\AdminArticleEditorContainer.vue
git commit -m "feat(nuxt): redesign admin article workbench" -- nuxt\app\pages\admin\articles\index.vue nuxt\app\features\article-admin\containers\AdminArticleEditorContainer.vue
```

---

### Task 6: Redesign Comments And Password

**Files:**
- Modify: `nuxt/app/pages/admin/comments/index.vue`
- Modify: `nuxt/app/pages/admin/password.vue`

- [ ] **Step 1: Redesign comments as moderation queue**

Use:

- `AdminPageHeader`
- `AdminPanel`
- `AdminState`
- `UTabs`
- `UBadge`
- `UModal`

Keep:

- default tab `pending`
- `fetchComments`
- `handleUpdateStatus`
- `confirmDelete`
- `handleDelete`
- `watch(currentTab, () => fetchComments())`

- [ ] **Step 2: Make comment items compact**

Each comment item must show:

- author initial and name
- status badge
- id
- content
- created date
- email/website/IP when present
- likes
- source article title when present
- approve/hide/show/delete actions

- [ ] **Step 3: Redesign password page as account security**

Use:

- `AdminPageHeader`
- `AdminPanel`
- `AdminActionBar`
- `UForm`, `UFormField`, `UInput`, `UAlert`

Keep:

- Valibot schema
- current/new/confirm password fields
- `resetForm`
- mismatch check
- same-password check
- `authStore.changePassword`

- [ ] **Step 4: Verify behavior by static checks**

Run:

```powershell
rg "getPendingComments|getAllComments|updateCommentStatus|deleteComment|watch\\(currentTab" nuxt\app\pages\admin\comments\index.vue
rg "changePassword|newPassword !==|newPassword ===|resetForm|schema" nuxt\app\pages\admin\password.vue
```

Expected: all searched behavior remains present.

- [ ] **Step 5: Commit comments and password**

Run:

```powershell
git add nuxt\app\pages\admin\comments\index.vue nuxt\app\pages\admin\password.vue
git commit -m "feat(nuxt): redesign admin moderation and security pages" -- nuxt\app\pages\admin\comments\index.vue nuxt\app\pages\admin\password.vue
```

---

### Task 7: Redesign Gallery Workbench

**Files:**
- Modify: `nuxt/app/features/gallery-admin/containers/AdminGalleryPageContainer.vue`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryFilterBar.vue`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryCardGrid.vue`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryEditModal.vue`

- [ ] **Step 1: Move gallery container onto admin primitives**

Use:

- `AdminPageHeader`
- `AdminPanel`
- `AdminToolbar`
- `AdminState`
- `AdminActionBar` in modals where useful

Keep all composable functions and state names from `useAdminGalleryFeature` and `useCfImageConfig`.

- [ ] **Step 2: Collapse Cloudflare thumbnail settings**

Replace the current large always-open settings card with a compact `UAccordion` or `UCollapsible` inside an `AdminPanel`. Keep every setting field:

- `isEnabled`
- `useWorker`
- `useHttps`
- `zoneDomain`
- `workerBaseUrl`
- `tokenTtlSeconds`
- `fit`
- `width`
- `quality`
- `format`
- `signatureParam`
- `signatureToken`
- `signatureSecret`

- [ ] **Step 3: Normalize gallery filter bar**

Make `GalleryFilterBar.vue` render a compact toolbar. Keep tab counts and sort select. The drag-sort hint should be a subtle inline `UAlert` or compact text row, not a large page interruption.

- [ ] **Step 4: Normalize gallery cards**

In `GalleryCardGrid.vue`, remove permanent `text-gray-*`, blue drag shadows, large hover lift, and custom overlay colors that conflict with tokens. Use compact cards, stable image aspect ratio, token borders, and icon-only actions.

- [ ] **Step 5: Verify gallery behavior**

Run:

```powershell
rg "refreshDimensions|batchImport|updateSort|handleDragStart|handleDrop|saveCfConfig|loadCfConfig" nuxt\app\features\gallery-admin\containers\AdminGalleryPageContainer.vue
rg "dragOverGallery|toggleActive|confirmDelete|editGallery" nuxt\app\features\gallery-admin\components\gallery\GalleryCardGrid.vue
```

Expected: drag sorting, batch import, Cloudflare config, refresh dimensions, edit, toggle, and delete behavior remain present.

- [ ] **Step 6: Commit gallery workbench**

Run:

```powershell
git add nuxt\app\features\gallery-admin\containers\AdminGalleryPageContainer.vue nuxt\app\features\gallery-admin\components\gallery
git commit -m "feat(nuxt): redesign admin gallery workbench" -- nuxt\app\features\gallery-admin\containers\AdminGalleryPageContainer.vue nuxt\app\features\gallery-admin\components\gallery
```

---

### Task 8: Redesign Imagebed Media Library

**Files:**
- Modify: `nuxt/app/pages/admin/imagebed/index.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedFileArea.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedToolbar.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedUploadArea.vue`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue`

- [ ] **Step 1: Redesign imagebed page frame**

Use:

- `AdminPageHeader`
- `AdminPanel`
- `AdminToolbar` through `ImagebedToolbar`
- `AdminState`
- `UTabs`
- `UModal`

Keep all bindings returned from `useAdminImagebedPage`.

- [ ] **Step 2: Replace browser confirm with Nuxt UI confirmation where practical**

Current `ImagebedFileArea.vue` uses `window.confirm`. Replace this with page-level or component-level `UModal` confirmation if it can be done without changing the composable contract. If the modal makes the component contract too tangled, keep the current confirm for this pass and add a code comment explaining why it remains.

- [ ] **Step 3: Normalize media grid/list styling**

In `ImagebedFileArea.vue`, replace hard-coded `bg-white`, `bg-gray-*`, `border-gray-*`, `hover:border-blue-*`, `ring-blue-*`, and `text-gray-*` permanent UI styling with token classes. Keep image thumbnails, folder navigation, selection, copy, preview, delete, table mode, and pagination.

- [ ] **Step 4: Normalize imagebed toolbar**

In `ImagebedToolbar.vue`, use compact breadcrumb buttons, search input, refresh icon button, batch delete action, and segmented/icon view switch. Ensure long path segments truncate instead of pushing controls off-screen.

- [ ] **Step 5: Normalize upload area**

In `ImagebedUploadArea.vue`, replace the oversized drop zone with a dense upload panel. Keep `UFileUpload`, paste handling, folder input, uploaded file table, clear list, and copy all URLs.

- [ ] **Step 6: Verify imagebed behavior**

Run:

```powershell
rg "useAdminImagebedPage|fetchFileList|handleUpload|handlePaste|copyAllUrls|saveConfig" nuxt\app\pages\admin\imagebed\index.vue
rg "previewFile|copyToClipboard|executeDeleteFromList|confirmDeleteFolder|UPagination" nuxt\app\features\gallery-admin\components\imagebed
```

Expected: list, upload, preview, copy, delete, config, and pagination behavior remain present.

- [ ] **Step 7: Commit imagebed workbench**

Run:

```powershell
git add nuxt\app\pages\admin\imagebed\index.vue nuxt\app\features\gallery-admin\components\imagebed
git commit -m "feat(nuxt): redesign admin media library" -- nuxt\app\pages\admin\imagebed\index.vue nuxt\app\features\gallery-admin\components\imagebed
```

---

### Task 9: Final Verification And Polish Pass

**Files:**
- Verify: `nuxt/app/layouts/admin.vue`
- Verify: `nuxt/app/pages/admin/**/*.vue`
- Verify: `nuxt/app/features/article-admin/**/*.vue`
- Verify: `nuxt/app/features/gallery-admin/**/*.vue`
- Verify: `nuxt/app/shared/ui/admin/**/*.vue`

- [ ] **Step 1: Search for admin token violations**

Run:

```powershell
rg "gray-|blue-|bg-secondary|border-color|window.confirm|rounded-2xl|tracking-\\[" nuxt\app\pages\admin nuxt\app\features\article-admin nuxt\app\features\gallery-admin nuxt\app\layouts\admin.vue nuxt\app\shared\ui\admin
```

Expected: no permanent admin surfaces rely on hard-coded gray/blue styling. Remaining matches must be deliberate, local, and documented by surrounding context.

- [ ] **Step 2: Run typecheck**

Run:

```powershell
cd nuxt
npm run typecheck
```

Expected: pass. If it fails, fix new errors before continuing.

- [ ] **Step 3: Run diff whitespace check**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

- [ ] **Step 4: Start Nuxt dev server**

Run:

```powershell
cd nuxt
npm run dev
```

Expected: dev server starts and prints a local URL. If port `3000` is busy, use the shown alternate URL.

- [ ] **Step 5: Browser verification**

Open the dev URL and verify:

- `/admin/login`
- `/admin`
- `/admin/articles`
- `/admin/articles/create`
- an existing `/admin/articles/[id]` route if an article id is available
- `/admin/comments`
- `/admin/gallery`
- `/admin/imagebed`
- `/admin/password`

Check desktop and mobile widths. Confirm text does not overlap, toolbars wrap, modals open, destructive confirmations work, tables/lists remain usable, and theme switching works.

- [ ] **Step 6: Final commit**

If Task 9 made additional fixes, commit them:

```powershell
git add nuxt\app
git commit -m "fix(nuxt): polish admin redesign verification issues" -- nuxt\app
```

If Task 9 made no code changes, do not create an empty commit.

---

## Self-Review

- Spec coverage: all pages and shared admin primitives from the approved spec are mapped to tasks.
- Scope control: backend, public static frontend, route paths, and authentication contracts remain out of scope.
- Risk handling: article editor, gallery, and imagebed are isolated into separate tasks with static behavior checks.
- Verification: typecheck, token search, diff check, and browser route checks are included.
- Dirty worktree protection: implementation begins with status capture and uses explicit path commits.

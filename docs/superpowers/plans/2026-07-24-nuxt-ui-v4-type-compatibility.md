# Nuxt UI v4 Type Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all current Nuxt UI v4 migration type errors without hiding runtime defects.

**Architecture:** Framework API corrections stay at the components and layouts that consume them. Application data is normalized at page/composable boundaries before templates consume it. Build-only module resolution is corrected at the server import boundary rather than weakening TypeScript.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Nuxt Color Mode, TypeScript, Valibot.

---

### Task 1: Correct Nuxt UI and Color Mode Contracts

**Files:**
- Modify: `nuxt/app/app.config.ts:19`
- Modify: `nuxt/app/layouts/admin.vue:79-81,143-144,249`
- Modify: `nuxt/app/pages/admin/login.vue:151-152`
- Modify: `nuxt/app/features/gallery-admin/components/gallery/GalleryEditModal.vue:6`
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue:5`
- Modify: `nuxt/app/pages/admin/articles/index.vue:36`
- Modify: `nuxt/app/pages/admin/comments/index.vue:185-270`

- [ ] **Step 1: Establish the failing framework diagnostics**

Run:

```powershell
npm run typecheck
```

Working directory: `nuxt/`.

Expected before change: diagnostics for `prose: false`, `preferred`, modal `width` / `background` slots, toolbar `container` slot, and a toast color typed as `string`.

- [ ] **Step 2: Replace obsolete framework APIs with v4 contracts**

Apply these replacements:

```ts
// app.config.ts: remove the invalid `prose: false` property.

// layouts/admin.vue and pages/admin/login.vue
colorMode.preference

// GalleryEditModal.vue
:ui="{ content: 'sm:max-w-lg' }"

// ImagebedPreviewModal.vue
:ui="{ content: 'sm:max-w-[95vw] bg-transparent dark:bg-transparent', overlay: '', wrapper: '' }"

// articles/index.vue: keep only documented UDashboardToolbar slots.
:ui="{ root: 'rounded-lg ring ring-default/40 bg-elevated/30' }"

// comments/index.vue: use the Nuxt UI color union rather than `string`.
const commentStatusColor = computed<'warning' | 'success'>(() =>
  currentTab.value === 'pending' ? 'warning' : 'success'
)
```

Use `colorMode.value` only for rendering the detected active mode and `colorMode.preference` only for the persisted user choice.

- [ ] **Step 3: Re-run the type checker**

Run:

```powershell
npm run typecheck
```

Expected: the Task 1 diagnostics no longer occur.

### Task 2: Repair Imagebed Component Boundaries

**Files:**
- Modify: `nuxt/app/features/gallery-admin/components/imagebed/ImagebedFileArea.vue:64,160-191`
- Modify: `nuxt/app/pages/admin/imagebed/index.vue:180-208`

- [ ] **Step 1: Establish the failing imagebed diagnostics**

Run:

```powershell
npm run typecheck
```

Expected before change: `string | boolean` is passed to selection handling, delete callbacks are unresolved in `ImagebedFileArea`, and `configRules` is missing from the page composable result.

- [ ] **Step 2: Preserve callback and event contracts across the page boundary**

Use a boolean guard for the checkbox event and expose every used composable return value:

```ts
const handleSelectionUpdate = (fileName: string, selected: boolean | string) => {
  toggleSelection(fileName, selected === true)
}

// Template
@update:model-value="handleSelectionUpdate(file.name, $event)"

// pages/admin/imagebed/index.vue destructuring
configRules,
confirmDeleteFolder,
executeDeleteFromList,
```

Keep `ImagebedFileArea` props typed as `confirmDeleteFolder: (folderPath: string) => void` and `executeDeleteFromList: (row: ImagebedFile) => Promise<void>` using the existing imagebed item type where available.

- [ ] **Step 3: Re-run the type checker**

Run:

```powershell
npm run typecheck
```

Expected: imagebed callback, event, and missing-return diagnostics no longer occur.

### Task 3: Normalize Table, Dashboard, and API Types

**Files:**
- Modify: `nuxt/app/pages/admin/articles/index.vue:155,211,330`
- Modify: `nuxt/app/pages/admin/index.vue:223,300-350,387,430-465`

- [ ] **Step 1: Establish the failing data-boundary diagnostics**

Run:

```powershell
npm run typecheck
```

Expected before change: `TableColumn` lacks its row generic, an action union lacks `loading`, and article response fields are accessed on an unresolved union.

- [ ] **Step 2: Type rows and normalize response values before template use**

Apply row generics and a normalized article result:

```ts
const tableColumns = computed<TableColumn<ArticleSummary>[]>(() => [/* existing columns */])

type DashboardAction = {
  label: string
  icon: string
  iconBg: string
  iconColor: string
  loading?: boolean
  to?: string
  onClick?: () => Promise<void>
}

const normalizeArticles = (result: PagedArticleResult | ArticleSummary[] | ArticleDetail[]) => {
  if (Array.isArray(result)) return { data: result, total: result.length }
  return { data: result.data, total: result.total }
}
```

Assign normalized `data` and `total` to the page refs; do not read `.data` or `.total` from the original union in templates or page loaders.

- [ ] **Step 3: Re-run the type checker**

Run:

```powershell
npm run typecheck
```

Expected: table generic, dashboard action, and article response diagnostics no longer occur.

### Task 4: Repair Worker and MDC Build Integration

**Files:**
- Modify: `nuxt/app/utils/workers/articleSearch.worker.ts:45-55`
- Modify: `nuxt/server/api/articles/[id].get.ts:1-4`

- [ ] **Step 1: Establish the failing build-integration diagnostics**

Run:

```powershell
npm run typecheck
```

Expected before change: the tokenizer's split result is inferred as `never`, and `#mdc-highlighter` cannot resolve in the server route.

- [ ] **Step 2: Make runtime invariants explicit**

Use a string guard in the worker and the same package import used by the working Markdown renderer:

```ts
const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
for (const word of words) {
  if (word.length >= 2) tokens.add(word)
}

// server/api/articles/[id].get.ts
import mdcHighlighter from '#mdc-highlighter'
```

If the server import still fails after matching `MarkdownRenderer.vue`, add the module declaration generated by the MDC module rather than replacing the import with `any`.

- [ ] **Step 3: Re-run the type checker**

Run:

```powershell
npm run typecheck
```

Expected: no worker or MDC diagnostics remain.

### Task 5: Final Verification and Scoped Commit

**Files:**
- Verify: all files changed by Tasks 1-4

- [ ] **Step 1: Run the full type check**

Run:

```powershell
npm run typecheck
```

Expected: exit code 0.

- [ ] **Step 2: Inspect changed-file quality**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors. Do not stage unrelated existing migration changes.

- [ ] **Step 3: Commit only verified migration compatibility changes**

```powershell
git add -- <only files changed by this plan>
git commit -m "fix(nuxt): complete Nuxt UI v4 type migration"
```

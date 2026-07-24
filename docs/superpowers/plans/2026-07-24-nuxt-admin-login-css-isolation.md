# Nuxt Admin Login CSS Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Nuxt UI v4 token ownership and visible decoration on `/admin/login` without changing authentication behavior.

**Architecture:** Preserve the legacy variable definitions but stop exporting CSS selectors that collide with Tailwind and Nuxt UI utility names. The login page continues to use Nuxt UI components and scoped utility classes; its visual decoration remains inside the page stacking context behind interactive content.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Tailwind CSS v4.

---

### Task 1: Remove Colliding Global Utility Aliases

**Files:**
- Modify: `nuxt/app/assets/css/theme-variables.css:325-377`
- Modify: `nuxt/app/assets/css/layout.css:197-276`

- [ ] **Step 1: Establish the failing static reproduction**

Run:

```powershell
rg -n '^\\.bg-primary|^\\.shadow-lg|^\\.text-muted|^\\* \\{' nuxt/app/assets/css/theme-variables.css nuxt/app/assets/css/layout.css
```

Expected before change: matches for `*`, `.bg-primary`, `.shadow-lg`, and `.text-muted`.

- [ ] **Step 2: Remove only the conflicting shared utility selectors**

Delete the global `*` transition and the `.bg-primary` / `.shadow-lg` aliases from `theme-variables.css`. Delete `.text-muted`, `.shadow-lg`, and `.bg-primary` from `layout.css`. Do not change legacy CSS variables or unrelated compatibility utilities.

- [ ] **Step 3: Verify the static reproduction passes**

Run:

```powershell
rg -n '^\\.bg-primary|^\\.shadow-lg|^\\.text-muted|^\\* \\{' nuxt/app/assets/css/theme-variables.css nuxt/app/assets/css/layout.css
```

Expected after change: no output.

### Task 2: Repair Login Decoration Stacking

**Files:**
- Modify: `nuxt/app/pages/admin/login.vue:1-27`

- [ ] **Step 1: Establish the failing source condition**

Run:

```powershell
rg -n -- '-z-10' nuxt/app/pages/admin/login.vue
```

Expected before change: the decoration container uses a negative z-index.

- [ ] **Step 2: Keep decoration behind content in the page stacking context**

Replace the decoration container's `-z-10` class with `z-0`, add `z-10` to the content wrapper, and keep `pointer-events-none` on the decoration. This makes decorative content visible while preserving form interaction.

- [ ] **Step 3: Verify the source condition is removed**

Run:

```powershell
rg -n -- '-z-10' nuxt/app/pages/admin/login.vue
```

Expected after change: no output.

### Task 3: Validate the Focused Change

**Files:**
- Verify: `nuxt/app/assets/css/theme-variables.css`
- Verify: `nuxt/app/assets/css/layout.css`
- Verify: `nuxt/app/pages/admin/login.vue`

- [ ] **Step 1: Check formatting and changed-file scope**

Run:

```powershell
git diff --check -- nuxt/app/assets/css/theme-variables.css nuxt/app/assets/css/layout.css nuxt/app/pages/admin/login.vue
git diff --name-only -- nuxt/app/assets/css/theme-variables.css nuxt/app/assets/css/layout.css nuxt/app/pages/admin/login.vue
```

Expected: no whitespace errors and exactly the three scoped files listed.

- [ ] **Step 2: Run the Nuxt type checker**

Run:

```powershell
npm run typecheck
```

Working directory: `nuxt/`.

Expected: exit code 0. If the repository has existing type errors, capture them separately and confirm none reference the three changed files.

- [ ] **Step 3: Commit the implementation**

```powershell
git add -- nuxt/app/assets/css/theme-variables.css nuxt/app/assets/css/layout.css nuxt/app/pages/admin/login.vue docs/superpowers/plans/2026-07-24-nuxt-admin-login-css-isolation.md
git commit -m "fix(nuxt): isolate login styles from legacy CSS"
```

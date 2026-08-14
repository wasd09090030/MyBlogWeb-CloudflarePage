# Archive Registry Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `nuxt-public`'s `/archive` page as the approved Nuxt UI registry index, using the project's light and dark theme tokens.

**Architecture:** Keep article loading, filtering, month grouping, and article routing inside `ArchivePageContainer.vue`. The container renders the registry header, grouped article links, and desktop filter surface; `ArchiveTagCloud.vue` remains a focused, accessible tag selector. Move every archive-specific visual rule out of Vue SFC blocks into paired desktop/mobile CSS files.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, Nuxt UI v4, Nuxt Icon/Iconify, Tailwind CSS v4, project CSS theme variables.

---

## File Structure

- Modify: `nuxt-public/app/features/archive/containers/ArchivePageContainer.vue`
  - Preserve fetch and computed state; replace MD3 markup and inline SVG with Nuxt UI components and registry markup; import paired style files.
- Create: `nuxt-public/app/features/archive/containers/ArchivePageContainer.desktop.css`
  - Desktop baseline for registry heading, large-year marker, article rows, filter surface, motion, focus, and dark-token-safe variables.
- Create: `nuxt-public/app/features/archive/containers/ArchivePageContainer.mobile.css`
  - Overrides only in the allowed `992px` and `576px` media blocks.
- Modify: `nuxt-public/app/shared/ui/ArchiveTagCloud.vue`
  - Replace non-semantic clickable spans with `UButton` controls and remove MD3 styling.
- Create: `nuxt-public/app/shared/ui/ArchiveTagCloud.desktop.css`
  - Desktop tag selector layout and Nuxt UI-compatible visual adjustments.
- Create: `nuxt-public/app/shared/ui/ArchiveTagCloud.mobile.css`
  - Mobile tag selector adjustments in allowed media blocks.

### Task 1: Replace The Archive Container Markup

**Files:**
- Modify: `nuxt-public/app/features/archive/containers/ArchivePageContainer.vue`

- [ ] **Step 1: Record the existing behavioral baseline before changing markup**

Run from `nuxt-public`:

```powershell
npm run lint:icons
```

Expected: exit code `0`; the existing page may still use inline SVG, which is not covered by the icon name scanner.

- [ ] **Step 2: Replace the successful-state template with the registry hierarchy**

Keep `StateLoading`, `UAlert`, `fetchArticles`, `tagStats`, `filteredArticles`, `timelineGroups`, `formatDateShort`, and `getArticlePath` unchanged. Replace the current `v-else` successful-state branch and right-slot panel with this structure:

```vue
<template v-else>
  <header class="archive-registry-header">
    <p class="archive-registry-kicker">WYRMKK / WRITING INDEX</p>
    <div class="archive-registry-heading">
      <div>
        <h1>文章归档</h1>
        <p>按标签与时间查找每一次记录。</p>
      </div>
      <UBadge color="primary" variant="subtle" :label="`${allArticles.length} 篇`" />
    </div>
  </header>

  <UAlert
    v-if="selectedTag"
    class="archive-active-filter"
    color="primary"
    variant="subtle"
    :title="`正在查看 #${selectedTag}`"
    :description="`${filteredArticles.length} 篇文章`"
  >
    <template #actions>
      <UButton
        aria-label="清除标签筛选"
        color="primary"
        variant="ghost"
        icon="heroicons:x-mark"
        @click="selectedTag = null"
      />
    </template>
  </UAlert>

  <StateEmpty
    v-if="timelineGroups.length === 0"
    icon="heroicons:inbox"
    description="此处空空如也，尚未有记录"
    class="my-16"
  />

  <section v-else class="archive-registry" aria-label="文章时间索引">
    <span class="archive-registry-year" aria-hidden="true">{{ registryYear }}</span>
    <section
      v-for="group in timelineGroups"
      :key="group.month"
      class="archive-month-group"
      :aria-labelledby="`archive-month-${group.month}`"
    >
      <header class="archive-month-heading">
        <h2 :id="`archive-month-${group.month}`">{{ group.month }}</h2>
        <UBadge color="neutral" variant="subtle" :label="`${group.articles.length} 篇`" />
      </header>
      <NuxtLink
        v-for="article in group.articles"
        :key="article.id"
        :to="getArticlePath(article)"
        class="archive-article-row motion-reduce:transition-none motion-reduce:hover:transform-none"
      >
        <time class="archive-article-date">{{ formatDateShort(article.createdAt) }}</time>
        <span class="archive-article-copy">
          <span class="archive-article-title">{{ article.title }}</span>
          <span v-if="article.tags?.length" class="archive-article-tags">
            <UBadge
              v-for="tag in article.tags"
              :key="tag"
              color="neutral"
              variant="subtle"
              size="xs"
              :label="tag"
            />
          </span>
        </span>
        <UIcon name="heroicons:arrow-up-right" class="archive-article-arrow" aria-hidden="true" />
      </NuxtLink>
    </section>
  </section>
</template>
```

In the `#right` slot, use `UCard` and `UIcon` rather than the custom MD3 card:

```vue
<template #right>
  <aside class="archive-sidebar" aria-label="标签筛选">
    <UCard class="archive-filter-card">
      <template #header>
        <div class="archive-filter-heading">
          <span><UIcon name="heroicons:tag" aria-hidden="true" /> 探索标签</span>
          <UBadge color="primary" variant="subtle" :label="String(tagStats.length)" />
        </div>
      </template>
      <ArchiveTagCloud
        :tags="tagStats"
        :selected-tag="selectedTag"
        @update:selected-tag="selectedTag = $event"
      />
    </UCard>
  </aside>
</template>
```

- [ ] **Step 3: Add the derived background-year value and external style imports**

Place the following beside the existing computed values:

```ts
const registryYear = computed(() => timelineGroups.value[0]?.month.slice(0, 4) || '')
```

Delete the complete scoped `<style>` block. Append these two style imports after the script block, preserving desktop before mobile order:

```vue
<style src="./ArchivePageContainer.desktop.css"></style>
<style src="./ArchivePageContainer.mobile.css"></style>
```

- [ ] **Step 4: Run the targeted static check**

Run from `nuxt-public`:

```powershell
npx vue-tsc --noEmit
```

Expected: exit code `0`. If pre-existing errors prevent a clean run, record only the errors outside `features/archive` and continue with the browser regression in Task 4.

- [ ] **Step 5: Commit the markup boundary**

```powershell
git add -- 'nuxt-public/app/features/archive/containers/ArchivePageContainer.vue'
git commit -m 'feat: 重构归档页索引结构'
```

### Task 2: Implement Registry Styles And Responsive Rules

**Files:**
- Create: `nuxt-public/app/features/archive/containers/ArchivePageContainer.desktop.css`
- Create: `nuxt-public/app/features/archive/containers/ArchivePageContainer.mobile.css`

- [ ] **Step 1: Create the desktop baseline stylesheet**

Use existing semantic variables only. Include the following complete baseline; do not add a media query to this file:

```css
.archive-page {
  min-height: 100vh;
  max-width: 1080px;
  margin: 2rem auto 5rem;
  padding: 0 1.5rem;
  color: var(--text-primary);
}

.archive-main { min-width: 0; }
.archive-sidebar { position: sticky; top: 6rem; }
.archive-registry-header { margin-bottom: 2rem; }
.archive-registry-kicker { margin: 0 0 0.75rem; color: var(--text-muted); font-size: 0.75rem; font-weight: 700; letter-spacing: 0; }
.archive-registry-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
.archive-registry-heading h1 { margin: 0; color: var(--text-primary); font-size: 2rem; line-height: 1.15; }
.archive-registry-heading p { margin: 0.5rem 0 0; color: var(--text-secondary); }
.archive-active-filter { margin-bottom: 1.5rem; }
.archive-registry { position: relative; }
.archive-registry-year { position: absolute; right: -0.5rem; bottom: -1.75rem; z-index: 0; color: color-mix(in srgb, var(--accent-primary) 9%, transparent); font-family: Georgia, serif; font-size: 9rem; font-weight: 700; line-height: 1; pointer-events: none; }
.archive-month-group { position: relative; z-index: 1; margin-top: 2rem; }
.archive-month-group:first-child { margin-top: 0; }
.archive-month-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); }
.archive-month-heading h2 { margin: 0; color: var(--accent-primary); font-size: 1rem; font-weight: 700; }
.archive-article-row { display: grid; grid-template-columns: 3.5rem minmax(0, 1fr) auto; gap: 1rem; align-items: start; padding: 0.875rem 0.5rem; border-bottom: 1px solid var(--border-color-light); border-radius: var(--radius-md); color: inherit; text-decoration: none; transition: background-color 160ms ease, color 160ms ease, transform 160ms ease; }
.archive-article-row:hover, .archive-article-row:focus-visible { background: var(--nav-link-hover-bg); color: var(--accent-primary); outline: none; transform: translateX(0.25rem); }
.archive-article-row:focus-visible { box-shadow: 0 0 0 3px var(--focus-ring-color); }
.archive-article-date { color: var(--accent-primary); font-family: Georgia, serif; font-size: 1rem; font-variant-numeric: tabular-nums; line-height: 1.25; }
.archive-article-copy { min-width: 0; }
.archive-article-title { display: block; color: var(--text-primary); font-weight: 700; line-height: 1.45; }
.archive-article-row:hover .archive-article-title, .archive-article-row:focus-visible .archive-article-title { color: var(--accent-primary); }
.archive-article-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.375rem; }
.archive-article-arrow { width: 1rem; height: 1rem; margin-top: 0.25rem; color: var(--accent-primary); }
.archive-filter-card { border-color: var(--border-color); }
.archive-filter-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-weight: 700; }
.archive-filter-heading span { display: inline-flex; align-items: center; gap: 0.5rem; }
```

- [ ] **Step 2: Create the mobile-only override stylesheet**

Place every rule inside an approved breakpoint:

```css
@media (max-width: 992px) {
  .archive-page { margin-top: 1.25rem; margin-bottom: 3rem; }
  .archive-sidebar { position: static; margin-bottom: 1.5rem; }
  .archive-registry-year { right: 0; font-size: 7rem; }
}

@media (max-width: 576px) {
  .archive-page { padding: 0 1rem; }
  .archive-registry-heading { align-items: start; }
  .archive-registry-heading h1 { font-size: 1.65rem; }
  .archive-article-row { grid-template-columns: 2.75rem minmax(0, 1fr) auto; gap: 0.625rem; padding-inline: 0.25rem; }
  .archive-article-date { font-size: 0.875rem; }
  .archive-registry-year { font-size: 5.5rem; bottom: -1rem; }
}
```

- [ ] **Step 3: Run the icon check after adding Iconify names**

Run from `nuxt-public`:

```powershell
npm run lint:icons
```

Expected: exit code `0`; `heroicons:x-mark`, `heroicons:tag`, and `heroicons:arrow-up-right` are accepted icon names.

- [ ] **Step 4: Commit the style boundary**

```powershell
git add -- 'nuxt-public/app/features/archive/containers/ArchivePageContainer.desktop.css' 'nuxt-public/app/features/archive/containers/ArchivePageContainer.mobile.css'
git commit -m 'style: 统一归档页索引视觉'
```

### Task 3: Make Tag Filtering Accessible And Consistent

**Files:**
- Modify: `nuxt-public/app/shared/ui/ArchiveTagCloud.vue`
- Create: `nuxt-public/app/shared/ui/ArchiveTagCloud.desktop.css`
- Create: `nuxt-public/app/shared/ui/ArchiveTagCloud.mobile.css`

- [ ] **Step 1: Replace clickable spans with Nuxt UI buttons**

Replace the template with this implementation, preserving the existing props, emit, and `getTagSize` function:

```vue
<template>
  <div class="archive-tag-cloud" aria-label="文章标签">
    <UButton
      v-for="tag in tags"
      :key="tag.name"
      :label="`#${tag.name}`"
      :color="selectedTag === tag.name ? 'primary' : 'neutral'"
      :variant="selectedTag === tag.name ? 'solid' : 'subtle'"
      size="sm"
      class="archive-tag-button"
      :style="{ fontSize: getTagSize(tag.count) }"
      :aria-pressed="selectedTag === tag.name"
      @click="handleClick(tag.name)"
    >
      <template #trailing>
        <UBadge
          :color="selectedTag === tag.name ? 'primary' : 'neutral'"
          variant="soft"
          size="xs"
          :label="String(tag.count)"
        />
      </template>
    </UButton>
  </div>
</template>
```

- [ ] **Step 2: Add paired styles**

Create `ArchiveTagCloud.desktop.css`:

```css
.archive-tag-cloud { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.archive-tag-button { max-width: 100%; }
```

Create `ArchiveTagCloud.mobile.css`:

```css
@media (max-width: 576px) {
  .archive-tag-cloud { gap: 0.375rem; }
  .archive-tag-button { font-size: 0.8125rem !important; }
}
```

Delete the scoped style block and load the files in this order:

```vue
<style src="./ArchiveTagCloud.desktop.css"></style>
<style src="./ArchiveTagCloud.mobile.css"></style>
```

- [ ] **Step 3: Verify the interaction contract locally**

Run from `nuxt-public`:

```powershell
npm run dev
```

Open `/archive` and verify: clicking an inactive tag filters rows; clicking that same active tag restores all rows; Tab and Enter/Space can operate every tag; the active tag has `aria-pressed="true"`.

- [ ] **Step 4: Commit the accessible selector**

```powershell
git add -- 'nuxt-public/app/shared/ui/ArchiveTagCloud.vue' 'nuxt-public/app/shared/ui/ArchiveTagCloud.desktop.css' 'nuxt-public/app/shared/ui/ArchiveTagCloud.mobile.css'
git commit -m 'feat: 优化归档标签筛选交互'
```

### Task 4: Perform Targeted Visual Regression

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Check desktop light and dark mode**

With the development server running, visit `/archive` at `1440x960`. Switch the existing site theme between light and dark. Confirm the active filter, article date, row hover/focus, and large-year marker use the project's blue tokens and preserve readable contrast.

- [ ] **Step 2: Check responsive layouts**

At `992x900`, verify the tag filter card is above the registry and no sticky overlap remains. At `375x812`, verify article titles wrap, tag badges do not overflow, dates remain visible, and no text overlaps the large-year marker.

- [ ] **Step 3: Check loading, error, and empty states**

Use browser request blocking or a temporary offline reload to check the existing error alert. Restore the request and verify loading resolves to rows. Choose a tag absent from the current result only if the data supplies one; otherwise inspect the existing `StateEmpty` branch through Vue DevTools without changing source.

- [ ] **Step 4: Run final static verification**

Run from `nuxt-public`:

```powershell
npm run lint:icons
npx vue-tsc --noEmit
```

Expected: both commands exit `0`, or any pre-existing `vue-tsc` errors are documented separately and do not originate from the archive files changed in this plan.

- [ ] **Step 5: Commit only if verification required a source correction**

```powershell
git status --short
```

Expected: no archive source files are modified after verification. If a verification-only adjustment was necessary, stage only that adjustment and commit it with `fix: 修正归档索引回归`.

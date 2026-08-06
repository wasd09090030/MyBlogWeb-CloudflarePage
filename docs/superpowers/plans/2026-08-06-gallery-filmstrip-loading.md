# 画廊胶片加载动画 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the gallery's text-led initial loader with a sky-blue, image-backed filmstrip animation without altering preload behavior.

**Architecture:** `GalleryLoadingAnimation` derives up to three image URLs from its existing preview-image prop and renders them as decorative frames. Desktop baseline styles live in a dedicated CSS file; a paired mobile file contains only the 768px override. The parent container and its loading lifecycle remain unchanged.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, scoped CSS imports.

---

### Task 1: Render resilient filmstrip markup

**Files:**
- Modify: `nuxt-public/app/components/GalleryLoadingAnimation.vue`

- [ ] **Step 1: Replace the presentational template and inline style with the filmstrip structure**

```vue
<div class="initial-loading-overlay">
  <div v-if="filmFrames.length" class="filmstrip" aria-hidden="true">
    <div v-for="(src, index) in filmFrames" :key="`${src}-${index}`" class="film-frame">
      <img :src="src" alt="" />
    </div>
  </div>
  <div class="loading-copy">
    <p class="loading-kicker">LOADING MEMORIES</p>
    <p class="progress-percent" role="status" aria-live="polite">{{ Math.round(loadingProgress) }}%</p>
    <p class="loading-label">照片正在显影</p>
  </div>
</div>
```

- [ ] **Step 2: Add a computed frame list that filters invalid URLs and repeats available images to three frames**

```js
const filmFrames = computed(() => {
  const sources = props.previewImages
    .map(image => image?.lightboxUrl || image?.thumbnailUrl || image?.imageUrl)
    .filter(Boolean)
    .slice(0, 3)
  return sources.length ? Array.from({ length: 3 }, (_, index) => sources[index % sources.length]) : []
})
```

- [ ] **Step 3: Import the paired CSS files and remove the SFC's inline style block**

```vue
<style scoped>
@import '~/assets/css/components/GalleryLoadingAnimation.desktop.css';
@import '~/assets/css/components/GalleryLoadingAnimation.mobile.css';
</style>
```

### Task 2: Define desktop and accessible motion behavior

**Files:**
- Create: `nuxt-public/app/assets/css/components/GalleryLoadingAnimation.desktop.css`

- [ ] **Step 1: Add the full-viewport sky-blue overlay, angled filmstrip, central progress hierarchy and reduced-motion rule**

```css
.initial-loading-overlay { position: fixed; inset: 0; display: grid; place-items: center; overflow: hidden; z-index: 10000; background: #0A2433; }
.filmstrip { position: absolute; display: flex; gap: .75rem; width: max-content; transform: rotate(-8deg); animation: filmstrip-glide 4s ease-in-out infinite alternate; }
.film-frame { width: 10rem; height: 13.5rem; padding: .35rem; background: #B8F3FF; }
@keyframes filmstrip-glide { to { transform: rotate(-8deg) translateX(-8%); } }
@media (prefers-reduced-motion: reduce) { .filmstrip { animation: none; } }
```

- [ ] **Step 2: Verify the desktop file has no width breakpoint block**

Run: `rg -n "@media \(max-width" nuxt-public/app/assets/css/components/GalleryLoadingAnimation.desktop.css`

Expected: no output and exit code 1.

### Task 3: Add a constrained mobile override

**Files:**
- Create: `nuxt-public/app/assets/css/components/GalleryLoadingAnimation.mobile.css`

- [ ] **Step 1: Add only 768px-scoped mobile overrides**

```css
@media (max-width: 768px) {
  .filmstrip { gap: .5rem; transform: rotate(-5deg); }
  .film-frame { width: 7rem; height: 9.5rem; }
  .progress-percent { font-size: clamp(3rem, 20vw, 4.5rem); }
}
```

### Task 4: Validate the production build

**Files:**
- Verify: `nuxt-public/app/components/GalleryLoadingAnimation.vue`
- Verify: `nuxt-public/app/assets/css/components/GalleryLoadingAnimation.desktop.css`
- Verify: `nuxt-public/app/assets/css/components/GalleryLoadingAnimation.mobile.css`

- [ ] **Step 1: Run static style-boundary checks**

Run: `rg -n "loading-orbs|brand-letters|brand-sub" nuxt-public/app/components/GalleryLoadingAnimation.vue; rg -n "@media \(max-width" nuxt-public/app/assets/css/components/GalleryLoadingAnimation.desktop.css; rg -n "@media \(max-width: 768px\)" nuxt-public/app/assets/css/components/GalleryLoadingAnimation.mobile.css`

Expected: no legacy selector match in the component, no desktop width-breakpoint match, and one mobile breakpoint match.

- [ ] **Step 2: Build the static site**

Run: `npm run generate`

Expected: Nuxt generation exits 0 without Vue template or stylesheet import errors.

- [ ] **Step 3: Commit the implementation**

```bash
git add nuxt-public/app/components/GalleryLoadingAnimation.vue nuxt-public/app/assets/css/components/GalleryLoadingAnimation.desktop.css nuxt-public/app/assets/css/components/GalleryLoadingAnimation.mobile.css docs/superpowers/plans/2026-08-06-gallery-filmstrip-loading.md
git commit -m "feat(public): 画廊胶片加载动画"
```

# Game Gallery Bento And Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace desktop game screenshot layouts with an aspect-safe, square-cornered Bento grid and add camera-push transitions for category, grid, and fullscreen changes.

**Architecture:** Preserve month grouping, image loading, zoom, and drag. A pure utility assigns a small, repeatable set of horizontal Bento roles. `GameGallerySection` emits source bounds only for game-image opens; a pointer-transparent shared layer uses those bounds for the decorative fullscreen transition.

**Tech Stack:** Nuxt 4, Vue 3 Composition API, VueUse Motion, CSS Grid, JavaScript, Node `node:test`.

---

## File Structure

- Create: `nuxt-public/app/features/gallery-public/utils/gameBentoLayout.js` - aspect normalization and repeatable role assignment.
- Create: `nuxt-public/app/assets/css/components/GameGallerySection.desktop.css` - desktop Bento grid, square/no-shadow tile rules, entry motion.
- Create: `nuxt-public/app/assets/css/components/GameGallerySection.mobile.css` - existing one-column mobile presentation.
- Create: `nuxt-public/app/shared/ui/ImageOriginTransition.vue` - decorative fullscreen origin layer.
- Create: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs` - Node contract tests.
- Modify: `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue` - one Bento render path and source-bound click event.
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryContent.vue` - keyed category transition, game-open payload relay, origin layer.
- Modify: `nuxt-public/app/features/gallery-public/containers/GalleryPageContainer.vue` - fullscreen source rectangle state.
- Modify: `nuxt-public/app/assets/css/components/Gallery.desktop.css` - category/fullscreen transition styles.
- Modify: `nuxt-public/app/assets/css/components/Gallery.mobile.css` - reduced-size overrides only.

### Task 1: Add Testable Bento Role Assignment

**Files:**
- Create: `nuxt-public/app/features/gallery-public/utils/gameBentoLayout.js`
- Create: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`

- [ ] **Step 1: Write the failing Node contract test**

```js
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const source = await readFile(new URL('app/features/gallery-public/utils/gameBentoLayout.js', root), 'utf8')

test('Bento layout supports only horizontal source ratios', () => {
  assert.match(source, /export type GameBentoAspect = '16x9' \| '16x10'/)
  assert.match(source, /return ratio >= 1\.7 \? '16x9' : '16x10'/)
})

test('Bento layout uses roles rather than count modes', () => {
  assert.match(source, /export type GameBentoRole = 'feature' \| 'wide' \| 'standard'/)
  assert.match(source, /BENTO_ROLE_SEQUENCE/)
  assert.doesNotMatch(source, /filmstrip|skeleton/i)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because `gameBentoLayout.js` does not exist.

- [ ] **Step 3: Implement the pure layout utility**

```js
const BENTO_ROLE_SEQUENCE = ['feature', 'wide', 'standard', 'standard', 'wide', 'standard']

const toFiniteDimension = (value) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
}

export const getGameBentoAspect = (image) => {
  const width = toFiniteDimension(image?.imageWidth ?? image?.width)
  const height = toFiniteDimension(image?.imageHeight ?? image?.height)
  if (!width || !height) return '16x10'
  const ratio = width / height
  return ratio >= 1.7 ? '16x9' : '16x10'
}

export const buildGameBentoBlocks = (images) => {
  const blockSize = BENTO_ROLE_SEQUENCE.length
  return Array.from({ length: Math.ceil(images.length / blockSize) }, (_, blockIndex) => ({
    tiles: images.slice(blockIndex * blockSize, (blockIndex + 1) * blockSize).map((image, offset) => ({
      image, index: blockIndex * blockSize + offset, aspect: getGameBentoAspect(image), role: BENTO_ROLE_SEQUENCE[offset]
    }))
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS with two passing tests.

- [ ] **Step 5: Commit the utility and test**

```powershell
git add nuxt-public/app/features/gallery-public/utils/gameBentoLayout.js nuxt-public/scripts/game-gallery-bento-layout.test.mjs
git commit -m "feat(public): 添加游戏截图Bento布局规则"
```

### Task 2: Render One Desktop Bento Path

**Files:**
- Modify: `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue`
- Create: `nuxt-public/app/assets/css/components/GameGallerySection.desktop.css`
- Create: `nuxt-public/app/assets/css/components/GameGallerySection.mobile.css`
- Modify: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`

- [ ] **Step 1: Extend the contract test with markup and visual constraints**

```js
const component = await readFile(new URL('app/features/gallery-public/components/GameGallerySection.vue', root), 'utf8')
const desktopCss = await readFile(new URL('app/assets/css/components/GameGallerySection.desktop.css', root), 'utf8')

test('game gallery uses a single Bento markup path and forwards source bounds', () => {
  assert.match(component, /class="game-bento-grid"/)
  assert.match(component, /buildGameBentoBlocks/)
  assert.match(component, /getBoundingClientRect\(\)/)
  assert.doesNotMatch(component, /skeleton-[abcd]|filmstrip/i)
})

test('desktop tiles are square and shadow-free', () => {
  assert.match(desktopCss, /\.game-bento-tile\s*\{[\s\S]*?border-radius:\s*0;/)
  assert.match(desktopCss, /\.game-bento-tile\s*\{[\s\S]*?box-shadow:\s*none;/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because skeleton branches and their inline styles remain.

- [ ] **Step 3: Replace the skeleton branches with repeatable blocks**

Keep existing image loading/fallback and date formatting. Use this one markup structure for every desktop month:

```vue
<div v-for="(block, blockIndex) in bentoBlocks" :key="`bento-${blockIndex}`" class="game-bento-grid">
  <button
    v-for="tile in block.tiles"
    :key="getImageKey(tile.image, tile.index)"
    type="button"
    class="game-bento-tile"
    :class="[`game-bento-tile--${tile.role}`, `game-bento-tile--${tile.aspect}`]"
    :style="{ '--entry-delay': `${tile.index * 45}ms` }"
    @click="emitGameImageClick($event, tile.image)"
  ><GameTileImage :image="tile.image" :index="tile.index" /></button>
</div>
```

Add `bentoBlocks = computed(() => buildGameBentoBlocks(props.images))` and:

```js
const emitGameImageClick = (event, image) => {
  const rect = event.currentTarget.getBoundingClientRect()
  emit('image-click', image, { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
}
```

- [ ] **Step 4: Add paired responsive styles**

Import desktop before mobile from the component's scoped style block. Desktop uses a 12-column grid, width-first roles, and no visual card decoration:

```css
.game-bento-grid { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:10px; }
.game-bento-tile { border-radius:0; box-shadow:none; overflow:hidden; }
.game-bento-tile--feature.game-bento-tile--16x10 { grid-column:span 8; aspect-ratio:16 / 10; }
.game-bento-tile--feature.game-bento-tile--16x9 { grid-column:span 8; aspect-ratio:16 / 9; }
.game-bento-tile--wide { grid-column:span 4; }
.game-bento-tile--standard { grid-column:span 3; }
```

Put all mobile rules inside `@media (max-width: 768px)` in the new mobile file and preserve the existing one-column `16 / 10` behavior.

- [ ] **Step 5: Verify renderer contracts and types**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS with four passing tests.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

- [ ] **Step 6: Commit the renderer and styles**

```powershell
git add nuxt-public/app/features/gallery-public/components/GameGallerySection.vue nuxt-public/app/assets/css/components/GameGallerySection.desktop.css nuxt-public/app/assets/css/components/GameGallerySection.mobile.css nuxt-public/scripts/game-gallery-bento-layout.test.mjs
git commit -m "feat(public): 重构游戏截图为Bento网格"
```

### Task 3: Add Category And One-Time Grid Entry Motion

**Files:**
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryContent.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue`
- Modify: `nuxt-public/app/assets/css/components/Gallery.desktop.css`
- Modify: `nuxt-public/app/assets/css/components/Gallery.mobile.css`
- Modify: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`

- [ ] **Step 1: Write the failing category-transition contract**

```js
const content = await readFile(new URL('app/features/gallery-public/components/GalleryContent.vue', root), 'utf8')
const galleryDesktopCss = await readFile(new URL('app/assets/css/components/Gallery.desktop.css', root), 'utf8')

test('gallery category content is keyed for camera-push switching', () => {
  assert.match(content, /<Transition name="gallery-mode" mode="out-in">/)
  assert.match(content, /:key="activeTag"/)
  assert.match(galleryDesktopCss, /\.gallery-mode-enter-active/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because no keyed `gallery-mode` transition exists.

- [ ] **Step 3: Implement category scene motion and visible-once card motion**

Keep tabs, loading, and the fullscreen Teleport outside the transition. Wrap only artwork/game body content:

```vue
<Transition name="gallery-mode" mode="out-in">
  <div :key="activeTag" class="gallery-mode-panel"><!-- artwork or game branch --></div>
</Transition>
```

Use an opacity plus small upward transform: leave `160ms`, enter `320ms`. Add `v-motion` to each Bento tile with `visibleOnce`, `y: 14`, `duration: 300`, and `delay: tile.index * 45`. Do not add scanlines, flashing, bounce, or glow. The reduced-motion block makes both transition paths immediate and fully visible.

- [ ] **Step 4: Run checks and commit**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS with five passing tests.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

```powershell
git add nuxt-public/app/features/gallery-public/components/GalleryContent.vue nuxt-public/app/features/gallery-public/components/GameGallerySection.vue nuxt-public/app/assets/css/components/Gallery.desktop.css nuxt-public/app/assets/css/components/Gallery.mobile.css nuxt-public/scripts/game-gallery-bento-layout.test.mjs
git commit -m "feat(public): 添加画廊场景与Bento入场动效"
```

### Task 4: Add A Decorative Fullscreen Origin Transition

**Files:**
- Create: `nuxt-public/app/shared/ui/ImageOriginTransition.vue`
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryContent.vue`
- Modify: `nuxt-public/app/features/gallery-public/containers/GalleryPageContainer.vue`
- Modify: `nuxt-public/app/assets/css/components/Gallery.desktop.css`
- Modify: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`

- [ ] **Step 1: Write the failing origin-transition contract**

```js
const container = await readFile(new URL('app/features/gallery-public/containers/GalleryPageContainer.vue', root), 'utf8')
const originLayer = await readFile(new URL('app/shared/ui/ImageOriginTransition.vue', root), 'utf8')

test('game fullscreen requests retain source bounds and the layer is pointer-transparent', () => {
  assert.match(container, /fullscreenOriginRect/)
  assert.match(container, /payload\?\.image \?\? payload/)
  assert.match(originLayer, /pointer-events:\s*none/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because no source rectangle state or layer exists.

- [ ] **Step 3: Normalize fullscreen payloads and add the layer**

Keep existing artwork calls valid:

```js
const fullscreenOriginRect = ref(null)
const openFullscreen = (payload) => {
  selectedImage.value = payload?.image ?? payload
  fullscreenOriginRect.value = payload?.originRect ?? null
  showFullscreen.value = true
  resetZoom()
}
const closeFullscreen = () => {
  showFullscreen.value = false
  selectedImage.value = null
  fullscreenOriginRect.value = null
  resetZoom()
}
```

Relay the game event as `{ image, originRect }`. `ImageOriginTransition.vue` receives `active`, `src`, and `originRect` and renders only when bounds exist:

```vue
<div v-if="active && originRect" class="image-origin-transition" aria-hidden="true" :style="originStyle">
  <img :src="src" alt="" />
</div>
```

The fixed layer must use `pointer-events: none`, never receive focus, and be suppressed in reduced-motion mode. It enhances game-tile opens only; absent/stale bounds fall back to the current fullscreen fade. Do not alter zoom, drag, or control behavior.

- [ ] **Step 4: Run automated checks and browser regression**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS with six passing tests.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

Run: `npm run dev`

At `/gallery`, verify desktop months with `1`, `2-3`, `4-9`, and `10+` game screenshots; confirm all are square-cornered, shadow-free Bento layouts and `16:9`/`16:10` sources retain framing. Toggle category, revisit a month, open/close a game tile, and repeat with `prefers-reduced-motion: reduce`. At `768px` or narrower, confirm the existing game single column remains.

- [ ] **Step 5: Commit the fullscreen transition**

```powershell
git add nuxt-public/app/shared/ui/ImageOriginTransition.vue nuxt-public/app/features/gallery-public/components/GalleryContent.vue nuxt-public/app/features/gallery-public/containers/GalleryPageContainer.vue nuxt-public/app/assets/css/components/Gallery.desktop.css nuxt-public/scripts/game-gallery-bento-layout.test.mjs
git commit -m "feat(public): 添加游戏截图全屏镜头转场"
```

### Task 5: Final Scope Check

**Files:**
- Modify: `docs/superpowers/specs/2026-08-07-game-gallery-bento-motion-design.md` only if implementation differs from the approved design.

- [ ] **Step 1: Inspect final scope**

Run: `git diff HEAD~4..HEAD -- nuxt-public/app/features/gallery-public nuxt-public/app/shared/ui nuxt-public/app/assets/css/components nuxt-public/scripts`

Expected: only game gallery layout/motion code, paired CSS, the shared origin layer, and its targeted test.

- [ ] **Step 2: Run final checks**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS with six passing tests.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

- [ ] **Step 3: Commit a specification correction only if required**

```powershell
git add docs/superpowers/specs/2026-08-07-game-gallery-bento-motion-design.md
git commit -m "docs: 同步游戏画廊动效实现细节"
```

Skip this commit when the implementation matches the approved specification.

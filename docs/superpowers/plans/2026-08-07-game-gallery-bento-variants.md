# Game Gallery Bento Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vary desktop game gallery Bento blocks by stable month hash and keep one to three low-resolution screenshots compact.

**Architecture:** Extend the existing pure `gameBentoLayout.js` output with a deterministic month variant and per-block variant sequence. `GameGallerySection.vue` exposes those variant classes, while the desktop stylesheet defines A/B/C geometry and small-month width caps; mobile markup and behavior remain unchanged.

**Tech Stack:** Nuxt 4, Vue 3, CSS Grid, JavaScript, Node `node:test`.

---

### Task 1: Test And Implement Stable Variant Assignment

**Files:**
- Modify: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`
- Modify: `nuxt-public/app/features/gallery-public/utils/gameBentoLayout.js`

- [ ] **Step 1: Write failing behavior tests**

```js
test('assigns a stable month variant and rotates following Bento blocks', () => {
  const images = Array.from({ length: 13 }, (_, id) => ({ id, imageWidth: 1600, imageHeight: 1000 }))
  const first = buildGameBentoBlocks(images, '2026-08')
  const second = buildGameBentoBlocks(images, '2026-08')

  assert.deepEqual(first.map(block => block.variant), second.map(block => block.variant))
  assert.equal(new Set(first.map(block => block.variant)).size, 3)
})
```

- [ ] **Step 2: Verify the test fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because blocks do not expose a `variant` field.

- [ ] **Step 3: Add a small stable string hash and variant sequence**

```js
const BENTO_VARIANTS = ['a', 'b', 'c']

const hashString = (value) => {
  let hash = 0
  for (let index = 0; index < value.length; index++) hash = (hash * 31 + value.charCodeAt(index)) | 0
  return hash >>> 0
}

const getBlockVariant = (monthKey, blockIndex) => BENTO_VARIANTS[(hashString(monthKey) + blockIndex) % BENTO_VARIANTS.length]
```

Make `buildGameBentoBlocks(images, monthKey)` include `variant: getBlockVariant(monthKey, blockIndex)` in every block.

- [ ] **Step 4: Verify the test passes**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS.

### Task 2: Render Variant Classes And Compact Month Layouts

**Files:**
- Modify: `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue`
- Modify: `nuxt-public/app/assets/css/components/GameGallerySection.desktop.css`
- Modify: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`

- [ ] **Step 1: Add failing component/style contracts**

```js
test('game section exposes stable variant and compact-count classes', async () => {
  const component = await readAppFile('features/gallery-public/components/GameGallerySection.vue')
  const css = await readAppFile('assets/css/components/GameGallerySection.desktop.css')

  assert.match(component, /game-bento-grid--\$\{block\.variant\}/)
  assert.match(component, /game-bento-grid--count-\$\{images\.length\}/)
  assert.match(css, /max-width:\s*640px/)
  assert.match(css, /max-width:\s*820px/)
  assert.match(css, /max-width:\s*980px/)
})
```

- [ ] **Step 2: Verify the test fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because the current component and CSS contain no variant/count classes or compact caps.

- [ ] **Step 3: Pass the month key and expose classes**

Add `monthKey` as an optional `GameGallerySection` prop. Pass `group.key` from `GalleryContent.vue`. Compute blocks with `buildGameBentoBlocks(props.images, props.monthKey)`, and render:

```vue
:class="[
  'game-bento-grid',
  `game-bento-grid--${block.variant}`,
  `game-bento-grid--count-${images.length}`
]"
```

- [ ] **Step 4: Add desktop-only geometry**

Keep all tiles square-cornered and shadow-free. Define A as the existing feature/side composition, B as three compact columns, C as a wide primary row plus four smaller tiles. Add count caps:

```css
.game-bento-grid--count-1 { width:min(100%,640px); margin-inline:auto; }
.game-bento-grid--count-2 { width:min(100%,820px); margin-inline:auto; grid-template-columns:repeat(2,minmax(0,1fr)); }
.game-bento-grid--count-3 { width:min(100%,980px); margin-inline:auto; grid-template-columns:repeat(3,minmax(0,1fr)); }
```

For counts one through three, override every tile role to span one column and retain `aspect-ratio: 16 / 10`.

- [ ] **Step 5: Verify and type-check**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

### Task 4: Cap Variant C Feature Scale

**Files:**
- Modify: `nuxt-public/app/assets/css/components/GameGallerySection.desktop.css`
- Modify: `nuxt-public/scripts/game-gallery-bento-layout.test.mjs`

- [ ] **Step 1: Write the failing C-variant geometry contract**

```js
test('variant C keeps its feature image below full-width poster scale', async () => {
  const css = await readAppFile('assets/css/components/GameGallerySection.desktop.css')

  assert.match(css, /\.game-bento-grid--c\s*\{[\s\S]*?max-width:\s*1080px/)
  assert.match(css, /\.game-bento-grid--c\s+\.game-bento-tile--feature\s*\{[\s\S]*?grid-column:\s*span 7/)
  assert.match(css, /\.game-bento-grid--c\s+\.game-bento-tile--wide\s*\{[\s\S]*?grid-column:\s*span 5/)
})
```

- [ ] **Step 2: Verify the contract fails**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: FAIL because C uses a 12-column feature image.

- [ ] **Step 3: Apply C-only grid rules**

```css
.game-bento-grid--c { width: 100%; max-width: 1080px; margin-inline: auto; }
.game-bento-grid--c .game-bento-tile--feature { grid-column: span 7; }
.game-bento-grid--c .game-bento-tile--wide { grid-column: span 5; }
.game-bento-grid--c .game-bento-tile--standard { grid-column: span 3; }
```

- [ ] **Step 4: Verify and commit**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

### Task 3: Browser Regression

**Files:**
- No additional source files.

- [ ] **Step 1: Run development server**

Run: `npm run dev -- --host 127.0.0.1 --port 3001`

- [ ] **Step 2: Inspect desktop and mobile gallery**

At `/gallery`, inspect multiple game months and confirm month variant assignments remain unchanged on reload, a long month progresses across A/B/C, and one/two/three-image months are not enlarged beyond `640px`/`820px`/`980px`. At `768px` and below, confirm the existing one-column list remains.

- [ ] **Step 3: Run final verification**

Run: `node --test scripts/game-gallery-bento-layout.test.mjs`

Expected: PASS.

Run: `npx vue-tsc --noEmit`

Expected: exit code `0`.

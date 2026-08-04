# 缩略图命名变体 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把缩略图变换从按素材 `kind` 拆成两套参数，改为按**展示场景命名变体**（`card`/`grid`/`lightbox`），并让文章详情封面走原生原图（`/images/{publicId}`）。

**Architecture:** `blog-api` Worker 的 `/images/thumb/...` 路由解析可选变体段（缺省 `grid`），从白名单映射到固定变换参数，经 Cloudflare Images 绑定输出 WebP。后台 DTO 按场景暴露命名 URL：画廊 item 增 `lightboxUrl`，文章摘要 `thumbnailUrl` 切到 `card` 变体，文章详情增 `coverImageUrl`（原生图）。前台按展示场景选择变体 URL。

**Tech Stack:** Nuxt 4 / Nitro Worker（TypeScript）、Cloudflare Images binding、nuxt-public（Vue 3）静态站。

**Spec:** `docs/superpowers/specs/2026-08-04-thumbnail-named-variants-design.md`

## Global Constraints

- 变体白名单（代码常量，`fit: scale-down`，WebP）：`card` = `{ width: 640, quality: 75 }`、`grid` = `{ width: 960, quality: 85 }`、`lightbox` = `{ width: 1920, quality: 85 }`。
- 旧格式 `/images/thumb/{publicId}.webp` 缺省等价 `grid`，必须保留向后兼容。
- 客户端不能指定任意变换参数；未知变体返回 `400`（fail-closed）。
- 无 D1 schema 变更；`kind` 字段语义不变。
- 配额上限：19 封面 ×1 + 342 画廊 ×2 ≈ 703 唯一变换/月 < 5000（Images Free）。
- 缩略图响应 `Cache-Control: public, max-age=31536000, immutable`，Worker Cache 已启用（`[cache] enabled = true`）。
- 项目无 nuxt-admin server 路由的单元测试框架；验证沿用 `check:*` 契约脚本 + `nuxt typecheck` + `npm run build:api` + `npm run generate`。

---

## File Structure

- `nuxt-admin/server/routes/images/[...path].get.ts` — 变体解析 + 变换（改）
- `nuxt-admin/server/domain/assets.ts` — 新增 `ThumbnailVariant` 类型 + `thumbnailVariantUrl` helper（改）
- `nuxt-admin/server/domain/gallery.ts` — 公开 DTO 增 `lightboxUrl`（改）
- `nuxt-admin/server/domain/articles.ts` — 摘要切 `card` 变体、详情增 `coverImageUrl`（改）
- `nuxt-admin/scripts/check-image-transform-contract.mjs` — 校验变体白名单（改）
- `nuxt-admin/DEPLOYMENT.md` — 文档同步（改）
- `nuxt-public/app/features/gallery-public/services/gallery.repository.ts` — `GalleryItem` 增 `lightboxUrl`（改）
- `nuxt-public/app/features/gallery-public/composables/useGalleryFeature.ts` — 本地 `GalleryItem` 增 `lightboxUrl`（改）
- `nuxt-public/app/features/gallery-public/components/GalleryContent.vue` — 灯箱用 `lightboxUrl`（改）
- `nuxt-public/app/features/gallery-public/components/GalleryHeroSection.vue` — 首屏用 `lightboxUrl`（改）
- `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue` — 大图用 `lightboxUrl`（改）
- `nuxt-public/app/features/gallery-public/components/FadeSlideshow.vue` — 全幅轮播用 `lightboxUrl`（改）
- `nuxt-public/app/features/article-detail/components/CoverImage.vue` — 详情封面用 `coverImageUrl`（改）
- `nuxt-public/app/features/article-detail/composables/useArticleDetailPage.ts` — meta/og 用 `coverImageUrl`（改）
- `nuxt-public/app/types/api.ts` — `ArticleSummary` 增 `coverImageUrl`（改）

不修改：画廊网格组件（Masonry/Accordion/Coverflow/Timeline）——旧格式 `thumbnailUrl` ≡ `grid`，保持 960px；`imageLoader.ts`/`masonryLayout.ts` 类型宽松，无需改动。

---

### Task 1: assets.ts 增加变体类型与 URL helper

**Files:**
- Modify: `nuxt-admin/server/domain/assets.ts`

**Interfaces:**
- Produces: `export type ThumbnailVariant = 'card' | 'grid' | 'lightbox'`；`export function thumbnailVariantUrl(publicId: string | null | undefined, variant: ThumbnailVariant): string | null`

- [ ] **Step 1: 在 `AssetKind` 类型附近新增变体类型**

在 `server/domain/assets.ts` 的 `export type AssetKind = ...` 一行下方新增：

```ts
export type ThumbnailVariant = 'card' | 'grid' | 'lightbox'
```

- [ ] **Step 2: 新增相对变体 URL helper**

在 `thumbnailUrl()` 函数（约 117 行）下方新增：

```ts
export function thumbnailVariantUrl(publicId: string | null | undefined, variant: ThumbnailVariant): string | null {
  return isValidPublicId(publicId) ? `/images/thumb/${variant}/${encodeURIComponent(publicId)}.webp` : null
}
```

- [ ] **Step 3: Commit**

```bash
git add nuxt-admin/server/domain/assets.ts
git commit -m "feat: 新增缩略图命名变体 URL helper"
```

---

### Task 2: 路由改为命名变体解析

**Files:**
- Modify: `nuxt-admin/server/routes/images/[...path].get.ts`

**Interfaces:**
- Consumes: `resolveImageAsset(event, publicId)` → `{ asset, sourceUrl }`（来自 `server/domain/media`，保持不变）；`ThumbnailVariant` 类型（Task 1）
- Produces: 路由接受 `/images/thumb/{variant}/{publicId}.webp`、`/images/thumb/{publicId}.webp`、`/images/{publicId}` 三种形态；未知变体/坏路径 `400`。

- [ ] **Step 1: 替换文件头部常量与导入**

把文件前 13 行替换为：

```ts
import { resolveImageAsset } from '~~/server/domain/media'
import type { ThumbnailVariant } from '~~/server/domain/assets'
import { getCloudflareEnv } from '~~/server/utils/cloudflare'

const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
const THUMBNAIL_CACHE_CONTROL = 'public, max-age=31536000, immutable'

// 命名变体预设：按展示场景选择，白名单 fail-closed。
// 旧格式 /images/thumb/{publicId}.webp 缺省等价 DEFAULT_VARIANT。
const THUMBNAIL_VARIANTS: Record<ThumbnailVariant, { width: number; quality: number }> = {
  card: { width: 640, quality: 75 },
  grid: { width: 960, quality: 85 },
  lightbox: { width: 1920, quality: 85 }
}
const DEFAULT_VARIANT: ThumbnailVariant = 'grid'
const VARIANT_NAMES = new Set(Object.keys(THUMBNAIL_VARIANTS))
```

- [ ] **Step 2: 确认 `transformThumbnail` 已按 preset 取参数**

`transformThumbnail` 内变换调用应保持（工作区未提交改动已把常量替换为参数）：

```ts
.transform({ width: variant.width, fit: 'scale-down' })
.output({ format: 'image/webp', quality: variant.quality })
```

- [ ] **Step 3: 替换 handler 的路径解析与变体选择**

把 `export default defineEventHandler(async (event) => { ... })` 整体替换为：

```ts
export default defineEventHandler(async (event) => {
  const rawPath = getRouterParam(event, 'path') || ''
  const parts = rawPath.split('/').filter(Boolean)
  const isThumbnail = parts[0]?.toLowerCase() === 'thumb'

  let variant = DEFAULT_VARIANT
  let publicIdValue: string
  if (isThumbnail) {
    // 新格式 /images/thumb/{variant}/{publicId}.webp
    if (parts.length === 3 && parts[2] && /\.webp$/i.test(parts[2])) {
      const candidate = decodeURIComponent(parts[1] || '')
      if (!VARIANT_NAMES.has(candidate)) throw createError({ statusCode: 400, statusMessage: 'Invalid thumbnail variant' })
      variant = candidate as ThumbnailVariant
      publicIdValue = decodeURIComponent(parts[2].replace(/\.webp$/i, ''))
    // 旧格式 /images/thumb/{publicId}.webp，等价 DEFAULT_VARIANT(grid)
    } else if (parts.length === 2 && parts[1] && /\.webp$/i.test(parts[1])) {
      publicIdValue = decodeURIComponent(parts[1].replace(/\.webp$/i, ''))
    } else {
      throw createError({ statusCode: 400, statusMessage: 'Invalid thumbnail path' })
    }
  } else {
    publicIdValue = decodeURIComponent(parts[0] || '')
  }

  const resolved = await resolveImageAsset(event, publicIdValue)
  if (!resolved) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  if (isThumbnail) return await transformThumbnail(event, resolved.sourceUrl, THUMBNAIL_VARIANTS[variant])
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return Response.redirect(resolved.sourceUrl, 302)
})
```

- [ ] **Step 4: Commit**

```bash
git add nuxt-admin/server/routes/images/'[...path].get.ts'
git commit -m "feat: 缩略图路由改为命名变体白名单"
```

---

### Task 3: 画廊公开 DTO 增加 lightboxUrl

**Files:**
- Modify: `nuxt-admin/server/domain/gallery.ts:40-55`

**Interfaces:**
- Consumes: `thumbnailVariantUrl(publicId, variant)`（Task 2）
- Produces: 公开画廊 item 新增 `lightboxUrl: string | null`

- [ ] **Step 1: 引入 helper**

把 `server/domain/gallery.ts` 第 3 行导入改为同时引入 `thumbnailVariantUrl`：

```ts
import { assetUpsertStatement, resolveAssetReference, thumbnailVariantUrl } from './assets'
```

- [ ] **Step 2: 在 `mapGallery` 中新增 `lightboxUrl` 并放入公开 DTO**

把 `mapGallery` 中 `if (publicOnly) { return { ... } }` 块整体替换为：

```ts
  const lightboxUrl = row.image_asset_public_id
    ? thumbnailVariantUrl(row.image_asset_public_id, 'lightbox')
    : null
  if (publicOnly) {
    return {
      id: row.id,
      thumbnailUrl,
      lightboxUrl,
      imageWidth: row.image_width,
      imageHeight: row.image_height,
      tag: row.tag,
      createdAt: row.created_at
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add nuxt-admin/server/domain/gallery.ts
git commit -m "feat: 画廊公开 DTO 增加 lightboxUrl"
```

---

### Task 4: 文章 DTO —— 摘要切 card 变体、详情加 coverImageUrl

**Files:**
- Modify: `nuxt-admin/server/domain/articles.ts:44-52`

**Interfaces:**
- Consumes: `thumbnailVariantUrl(publicId, variant)`（Task 2）
- Produces: article summary/detail `thumbnailUrl` 指向 `/images/thumb/card/{publicId}.webp`；detail（及所有模式）新增 `coverImageUrl` = `/images/{publicId}`

- [ ] **Step 1: 引入 helper**

把 `server/domain/articles.ts` 第 5 行导入改为：

```ts
import { assetUpsertStatement, resolveAssetReference, thumbnailVariantUrl } from './assets'
```

- [ ] **Step 2: 修改 `mapArticle` 的 thumbnail 与 base**

把 `mapArticle` 内第 45-52 行的 thumbnail 计算与 base 对象替换为：

```ts
  const thumbnail = row.cover_image_asset_public_id
    ? thumbnailVariantUrl(row.cover_image_asset_public_id, 'card')
    : null
  const coverImageUrl = row.cover_image_asset_public_id
    ? `/images/${encodeURIComponent(row.cover_image_asset_public_id)}`
    : null
  const base = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    coverImage: mode === 'summary' || mode === 'detail' ? null : row.cover_image,
    coverImageAssetId: row.cover_image_asset_id,
    coverImageAssetPublicId: row.cover_image_asset_public_id,
    thumbnailUrl: thumbnail,
    coverImageUrl,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    aiSummary: row.ai_summary
  }
```

- [ ] **Step 3: Commit**

```bash
git add nuxt-admin/server/domain/articles.ts
git commit -m "feat: 文章摘要切 card 变体并暴露详情原生图 URL"
```

---

### Task 5: 更新图像变换契约检查

**Files:**
- Modify: `nuxt-admin/scripts/check-image-transform-contract.mjs`

- [ ] **Step 1: 替换校验规则为变体白名单**

把 `check-image-transform-contract.mjs` 第 10-20 行（校验 + 成功输出）替换为：

```js
if (!/images\s*\.input\(sourceResponse\.body\)/.test(route)) failures.push('thumbnail route must use the Images binding input stream')
if (!/card:\s*\{\s*width:\s*640,\s*quality:\s*75\s*\}/.test(route)) failures.push('card variant must be 640px at quality 75')
if (!/grid:\s*\{\s*width:\s*960,\s*quality:\s*85\s*\}/.test(route)) failures.push('grid variant must be 960px at quality 85')
if (!/lightbox:\s*\{\s*width:\s*1920,\s*quality:\s*85\s*\}/.test(route)) failures.push('lightbox variant must be 1920px at quality 85')
if (!/DEFAULT_VARIANT:\s*ThumbnailVariant\s*=\s*['"]grid['"]/.test(route)) failures.push('old-format default variant must be grid')
if (!/fit:\s*['"]scale-down['"]/.test(route)) failures.push('thumbnail route must keep scale-down fit')
if (!/format:\s*['"]image\/webp['"]/.test(route)) failures.push('thumbnail route must output WebP')
if (!/\[images\][\s\S]*binding\s*=\s*["']IMAGES["']/.test(wrangler)) failures.push('wrangler.toml must bind Images as IMAGES')
if (!/\[cache\][\s\S]*enabled\s*=\s*true/.test(wrangler)) failures.push('wrangler.toml must enable Worker Cache for transformed responses')

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, transform: 'card 640/q75 | grid 960/q85 | lightbox 1920/q85', default: 'grid', cache: 'worker' }, null, 2))
}
```

- [ ] **Step 2: 运行契约检查**

Run: `cd nuxt-admin && node scripts/check-image-transform-contract.mjs`
Expected: `{"ok":true,"transform":"card 640/q75 | grid 960/q85 | lightbox 1920/q85","default":"grid","cache":"worker"}`

- [ ] **Step 3: Commit**

```bash
git add nuxt-admin/scripts/check-image-transform-contract.mjs
git commit -m "chore: 契约检查校验缩略图命名变体白名单"
```

---

### Task 6: 前台画廊 —— 类型加 lightboxUrl，大图组件切换

**Files:**
- Modify: `nuxt-public/app/features/gallery-public/services/gallery.repository.ts:5-12`
- Modify: `nuxt-public/app/features/gallery-public/composables/useGalleryFeature.ts:7`
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryContent.vue:125`
- Modify: `nuxt-public/app/features/gallery-public/components/GalleryHeroSection.vue:125`
- Modify: `nuxt-public/app/features/gallery-public/components/GameGallerySection.vue:188,227`
- Modify: `nuxt-public/app/features/gallery-public/components/FadeSlideshow.vue:15,43`

- [ ] **Step 1: 两个 GalleryItem 类型各增 `lightboxUrl`**

`gallery.repository.ts`：

```ts
export type GalleryItem = {
  id: number
  thumbnailUrl?: string | null
  lightboxUrl?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  tag?: string
  createdAt?: string
}
```

`useGalleryFeature.ts` 第 7 行：

```ts
type GalleryItem = { id: number; thumbnailUrl?: string | null; lightboxUrl?: string | null; imageWidth?: number | null; imageHeight?: number | null; tag?: string; createdAt?: string }
```

- [ ] **Step 2: 灯箱组件用 `lightboxUrl`（回退 thumbnailUrl）**

`GalleryContent.vue:125`：

```vue
<img
  :src="(selectedImage?.lightboxUrl || selectedImage?.thumbnailUrl) || ''"
  alt="画廊图片"
  class="fullscreen-image"
  :class="{ 'is-dragging': isDragging }"
  @load="handleFullscreenImageLoad"
/>
```

- [ ] **Step 3: 首屏组件用 `lightboxUrl`（回退 thumbnailUrl）**

`GalleryHeroSection.vue:125` 的 `getPreviewImageUrl`：

```ts
const getPreviewImageUrl = (image) => image?.lightboxUrl || image?.thumbnailUrl || ''
```

（`hasImage`/`getPreviewCardStyle` 内部经 `getPreviewImageUrl` 取值，无需再改。）

- [ ] **Step 4: 游戏画廊组件用 `lightboxUrl`（回退 thumbnailUrl）**

`GameGallerySection.vue:188` 的 `hasImage` 与 `:227` 的 `img.src` 改为：

```ts
const hasImage = (image, index) => {
  const thumbnailUrl = image?.lightboxUrl || image?.thumbnailUrl
  if (!thumbnailUrl) return false
  return !imageErrorMap.value[getImageKey(image, index)]
}
```

```ts
h('img', {
  src: image.lightboxUrl || image.thumbnailUrl || '',
  // ... 其余属性保持不变
})
```

- [ ] **Step 5: 全幅轮播组件用 `lightboxUrl`（回退 thumbnailUrl）**

`FadeSlideshow.vue:15` 模板 `:src="gallery.thumbnailUrl || ''"` 改为：

```vue
:src="(gallery.lightboxUrl || gallery.thumbnailUrl) || ''"
```

`FadeSlideshow.vue:43` 的 `hasImage` 改为：

```ts
const thumbnailUrl = image?.lightboxUrl || image?.thumbnailUrl
if (!thumbnailUrl) return false
```

- [ ] **Step 6: 静态检查确认替换点**

Run: `cd nuxt-public && rg -n "thumbnailUrl" app/features/gallery-public`
Expected: 网格类组件（Masonry/Accordion/Coverflow）仍使用 `thumbnailUrl`；四个大图组件（Content/Hero/Game/FadeSlideshow）内图片取值含 `lightboxUrl`。

- [ ] **Step 7: Commit**

```bash
git add nuxt-public/app/features/gallery-public
git commit -m "feat: 画廊大图场景改用 lightboxUrl 变体"
```

---

### Task 7: 前台文章详情 —— 封面用 coverImageUrl（原生图）

**Files:**
- Modify: `nuxt-public/app/types/api.ts:87-102`
- Modify: `nuxt-public/app/features/article-detail/components/CoverImage.vue:42-46`
- Modify: `nuxt-public/app/features/article-detail/composables/useArticleDetailPage.ts:144-150,281-297`

- [ ] **Step 1: 类型增 `coverImageUrl`**

`app/types/api.ts` 的 `ArticleSummary`（87-102 行）在 `thumbnailUrl` 后加：

```ts
  coverImageUrl?: string | null
```

- [ ] **Step 2: 详情封面组件优先用原生图**

`CoverImage.vue` 的 `coverImageUrl` computed（42-46 行）替换为：

```ts
const coverImageUrl = computed(() => {
  const native = props.article?.coverImageUrl
  const thumbnailUrl = props.article?.thumbnailUrl
  const coverImage = props.article?.coverImage
  return native || thumbnailUrl || (coverImage && coverImage !== 'null' ? coverImage : '')
})
```

- [ ] **Step 3: 详情 composable 的 meta/schema 优先用原生图**

`useArticleDetailPage.ts` 的 `getArticleImage`（144-150 行）：

```ts
const getArticleImage = (value: unknown): string | undefined => {
  const detail = value as { coverImageUrl?: string; thumbnailUrl?: string; coverImage?: string } | null
  const image = detail?.coverImageUrl || detail?.thumbnailUrl || (detail?.coverImage && detail.coverImage !== 'null'
    ? detail.coverImage
    : '')
  return image || undefined
}
```

`schemaGraph` 的 `detail` 类型（281-291 行）增 `coverImageUrl?: string`，且 imageUrl 计算（295-297 行）优先它：

```ts
    const detail = article.value as {
      title?: string
      aiSummary?: string
      content?: string
      contentMarkdown?: string
      coverImage?: string
      coverImageUrl?: string
      thumbnailUrl?: string
      createdAt?: string
      updatedAt?: string
      tags?: string[]
    }
    ...
    const imageUrl = resolveUrl(detail.coverImageUrl || detail.thumbnailUrl || (detail.coverImage && detail.coverImage !== 'null'
      ? detail.coverImage
      : '/og-default.svg'))
```

- [ ] **Step 4: Commit**

```bash
git add nuxt-public/app/types/api.ts nuxt-public/app/features/article-detail
git commit -m "feat: 文章详情封面改用原生图 coverImageUrl"
```

---

### Task 8: 验证、文档与静态站重建

**Files:**
- Modify: `nuxt-admin/DEPLOYMENT.md`（缩略图变换章节）
- 验证产物：blog-api Worker、Admin SPA、nuxt-public 静态站

- [ ] **Step 1: 更新 DEPLOYMENT.md 变换章节**

把 `nuxt-admin/DEPLOYMENT.md` 中"Permanent thumbnail transformations"段落的参数描述替换为：

```text
`blog-api` binds Cloudflare Images as `env.IMAGES` for the stable
`/images/thumb/{publicId}.webp` route. Transformations are fixed per named
display variant: article cards use `card` (`640px` / q75), gallery grids use
`grid` (`960px` / q85, also the default for the legacy bare URL), and gallery
lightboxes/heroes use `lightbox` (`1920px` / q85). All variants use
`scale-down` and output WebP with a one-year immutable cache header. The
legacy `/images/thumb/{publicId}.webp` URL defaults to `grid`. Article detail
covers use the native image via the `/images/{publicId}` redirect. Client
requests cannot choose dimensions, quality, format, or source URLs.
```

- [ ] **Step 2: 运行全部本地契约检查**

Run（在 `nuxt-admin`）:
```
node scripts/check-free-worker-config.mjs
node scripts/check-image-api-contract.mjs
node scripts/check-image-transform-contract.mjs
```
Expected: 三个脚本均 `ok: true`。

- [ ] **Step 3: 类型检查与构建**

Run: `cd nuxt-admin && npx nuxt typecheck`
Expected: exit=0。

Run: `cd nuxt-admin && npm run build:api && npm run generate`
Expected: 构建成功；`.output/public` 存在。

- [ ] **Step 4: 前台静态站重建**

Run: `cd nuxt-public && npm run generate`
Expected: 成功。抽查 `.output/public` 内 gallery payload 含 `lightboxUrl`、article payload 含 `coverImageUrl` 与 `thumbnailUrl=/images/thumb/card/...`。

- [ ] **Step 5: Commit 文档与脚本改动**

```bash
git add nuxt-admin/DEPLOYMENT.md
git commit -m "docs: 缩略图命名变体部署说明"
```

- [ ] **Step 6: 部署与线上抽查（部署授权后执行）**

按 DEPLOYMENT.md 顺序部署 blog-api Worker 与两个 Pages 项目，然后抽查：
- `/images/thumb/card/i_*.webp`、`/images/thumb/grid/i_*.webp`、`/images/thumb/lightbox/i_*.webp` 分别返回 640/960/1920 宽、WebP、`immutable` 缓存头。
- `/images/thumb/i_*.webp`（旧格式）仍 960 宽。
- `/images/thumb/bad/i_*.webp` 返回 `400`。
- 文章详情封面经 `coverImageUrl` 拉到原生图。
- 旧 1 年 immutable 缓存按需 purge（Cloudflare + Worker Cache）以让新参数生效。

---

## Plan Self-Review

- **Spec coverage：** 变体预设/URL/DTO（Tasks 1-4）、契约检查（Task 5）、画廊前台（Task 6）、文章详情原生图（Task 7）、验证与文档（Task 8）覆盖 spec 全部小节。配额/缓存/安全约束在 Global Constraints 与 Task 8 验证清单体现。
- **Placeholder scan：** 无 TBD/TODO；所有代码步骤给出完整代码或明确替换目标。`h('img', ...)` 等仅列改动行，其余属性注明保持不变。
- **Type consistency：** `ThumbnailVariant` 在 Task 2 定义，Task 1/3/4 复用；`thumbnailVariantUrl(publicId, variant)` 签名在 Task 2 固定，Task 3/4 按此调用；`lightboxUrl`/`coverImageUrl` 字段在 Task 3/4 后端产出、Task 6/7 前端类型消费，命名一致。

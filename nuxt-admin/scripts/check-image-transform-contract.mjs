import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const route = readFileSync(resolve(root, 'server/routes/images/[...path].get.ts'), 'utf8')
const assets = readFileSync(resolve(root, 'server/domain/assets.ts'), 'utf8')
const wrangler = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
const failures = []

if (!/images\s*\.input\(sourceResponse\.body\)/.test(route)) failures.push('thumbnail route must use the Images binding input stream')
if (!/card:\s*\{\s*width:\s*640,\s*quality:\s*75\s*\}/.test(route)) failures.push('card variant must be 640px at quality 75')
if (!/grid:\s*\{\s*width:\s*960,\s*quality:\s*85\s*\}/.test(route)) failures.push('grid variant must be 960px at quality 85')
if (!/lightbox:\s*\{\s*width:\s*1920,\s*quality:\s*85\s*\}/.test(route)) failures.push('lightbox variant must be 1920px at quality 85')
if (!/DEFAULT_VARIANT:\s*ThumbnailVariant\s*=\s*['"]grid['"]/.test(route)) failures.push('old-format default variant must be grid')
if (!/fit:\s*['"]scale-down['"]/.test(route)) failures.push('thumbnail route must keep scale-down fit')
if (!/format:\s*['"]image\/webp['"]/.test(route)) failures.push('thumbnail route must output WebP')
if (!/\[images\][\s\S]*binding\s*=\s*["']IMAGES["']/.test(wrangler)) failures.push('wrangler.toml must bind Images as IMAGES')
if (!/\[cache\][\s\S]*enabled\s*=\s*true/.test(wrangler)) failures.push('wrangler.toml must enable Worker Cache for transformed responses')
// 展示短链 /images/{publicId}（及 /images/thumb/...）必须在写路径按 public_id 关联既有素材，
// 否则画廊单条编辑回传短链会把 image_asset_id 置空，破坏永久缩略图。
if (!/export function extractPublicIdFromImageUrl/.test(assets)) failures.push('assets.ts must expose extractPublicIdFromImageUrl for /images short links')
if (!/shortLinkPublicId\s*=\s*extractPublicIdFromImageUrl\(normalized\)/.test(assets)) failures.push('resolveAssetReference must resolve /images short links by public_id')
if (!/findImageAsset\(event,\s*shortLinkPublicId\)/.test(assets)) failures.push('resolveAssetReference must look up the existing asset for short links')

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, transform: 'card 640/q75 | grid 960/q85 | lightbox 1920/q85', default: 'grid', cache: 'worker' }, null, 2))
}

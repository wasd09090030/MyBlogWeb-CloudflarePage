import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const route = readFileSync(resolve(root, 'server/routes/images/[...path].get.ts'), 'utf8')
const wrangler = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
const failures = []

if (!/images\s*\.input\(sourceResponse\.body\)/.test(route)) failures.push('thumbnail route must use the Images binding input stream')
if (!/width:\s*THUMBNAIL_WIDTH/.test(route) || !/fit:\s*['"]scale-down['"]/.test(route)) failures.push('thumbnail route must use the fixed scale-down width')
if (!/format:\s*['"]image\/webp['"]/.test(route) || !/quality:\s*THUMBNAIL_QUALITY/.test(route)) failures.push('thumbnail route must output the fixed WebP variant')
if (!/\[images\][\s\S]*binding\s*=\s*["']IMAGES["']/.test(wrangler)) failures.push('wrangler.toml must bind Images as IMAGES')
if (!/\[cache\][\s\S]*enabled\s*=\s*true/.test(wrangler)) failures.push('wrangler.toml must enable Worker Cache for transformed responses')

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, transform: '640px scale-down WebP q72', cache: 'worker' }, null, 2))
}

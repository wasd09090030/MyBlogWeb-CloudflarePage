import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const route = readFileSync(resolve(root, 'server/routes/images/[...path].get.ts'), 'utf8')
const wrangler = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
const failures = []

if (!/images\s*\.input\(sourceResponse\.body\)/.test(route)) failures.push('thumbnail route must use the Images binding input stream')
if (!/article_cover:\s*\{\s*width:\s*640,\s*quality:\s*75\s*\}/.test(route)) failures.push('article cover thumbnail must be 640px at quality 75')
if (!/gallery:\s*\{\s*width:\s*960,\s*quality:\s*85\s*\}/.test(route)) failures.push('gallery thumbnail must be 960px at quality 85')
if (!/other:\s*\{\s*width:\s*960,\s*quality:\s*85\s*\}/.test(route)) failures.push('other thumbnail must match the 960px quality 85 default')
if (!/fit:\s*['"]scale-down['"]/.test(route)) failures.push('thumbnail route must keep scale-down fit')
if (!/format:\s*['"]image\/webp['"]/.test(route)) failures.push('thumbnail route must output WebP')
if (!/\[images\][\s\S]*binding\s*=\s*["']IMAGES["']/.test(wrangler)) failures.push('wrangler.toml must bind Images as IMAGES')
if (!/\[cache\][\s\S]*enabled\s*=\s*true/.test(wrangler)) failures.push('wrangler.toml must enable Worker Cache for transformed responses')

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, transform: 'cover 640px q75 | gallery/other 960px q85', cache: 'worker' }, null, 2))
}

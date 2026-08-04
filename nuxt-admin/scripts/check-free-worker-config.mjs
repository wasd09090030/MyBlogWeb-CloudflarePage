import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const wrangler = readFileSync(resolve(root, 'wrangler.toml'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const failures = []

if (!/^name\s*=\s*["']blog-api["']/m.test(wrangler)) failures.push('wrangler.toml must name the API Worker blog-api')
if (/\[limits\]|cpu_ms|\[\[r2_buckets\]\]|BLOG_MEDIA/.test(wrangler)) failures.push('wrangler.toml contains a Paid CPU limit or R2 binding')
if (!/binding\s*=\s*["']BLOG_DB["']/m.test(wrangler)) failures.push('wrangler.toml must declare the BLOG_DB D1 binding')
if (/IMAGE_API_TOKEN\s*=/.test(wrangler)) failures.push('IMAGE_API_TOKEN must be a Worker Secret, not a committed variable')
if (!packageJson.scripts?.generate || !packageJson.scripts?.['build:api']) failures.push('package.json must expose generate and build:api scripts')
if (!/\.output\/public(?:\/admin)?(?:\s|$)/.test(packageJson.scripts?.['deploy:pages'] || '')) failures.push('Admin Pages deployment must use .output/public or .output/public/admin')

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, worker: 'blog-api', plan: 'free', d1Only: true }, null, 2))
}

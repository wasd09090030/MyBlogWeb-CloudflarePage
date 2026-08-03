import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const adapter = readFileSync(resolve(root, 'server/utils/image-api.ts'), 'utf8')
const config = readFileSync(resolve(root, 'server/domain/config.ts'), 'utf8')
const failures = []

for (const required of ['upload', 'uploadChannel', 'returnFormat', 'api/manage/list', 'CloudflareR2', 'api/manage/delete', 'IMAGE_API_TOKEN']) {
  if (!adapter.includes(required)) failures.push(`image API adapter is missing ${required}`)
}
if (config.includes('apiToken') || config.includes('cf_image_configs')) failures.push('imagebed config must not persist provider tokens or cf_image_configs')

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry)
    if (entry === 'node_modules' || entry === '.nuxt' || entry === '.output') continue
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

for (const file of walk(resolve(root, 'app'))) {
  const source = readFileSync(file, 'utf8')
  if (/apiToken|IMAGE_API_TOKEN/.test(source)) failures.push(`SPA file must not contain provider token handling: ${file}`)
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2))
  process.exitCode = 1
} else {
  console.log(JSON.stringify({ ok: true, providerAuth: 'worker-secret', spaTokenReferences: 0 }, null, 2))
}

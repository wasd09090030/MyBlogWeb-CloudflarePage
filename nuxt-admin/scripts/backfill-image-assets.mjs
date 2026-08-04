import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const apply = process.argv.includes('--apply')
const remote = !process.argv.includes('--local')
const host = process.argv.includes('--host') ? String(process.argv[process.argv.indexOf('--host') + 1] || '') : ''
if (!host) throw new Error('Usage: node scripts/backfill-image-assets.mjs --host <hostname> [--apply] [--local]')
if (!/^[A-Za-z0-9.-]+(?::\d+)?$/.test(host)) throw new Error('Host must be a hostname with an optional port')
const command = process.execPath
const config = 'wrangler.toml'
const outputPath = resolve('.data/image-asset-backfill.sql')
const now = new Date().toISOString()

function runWrangler(args) {
  return execFileSync(command, ['./node_modules/wrangler/bin/wrangler.js', ...args], { encoding: 'utf8' })
}

function query(sql) {
  const output = runWrangler(['d1', 'execute', 'blog-db', remote ? '--remote' : '--local', '--json', '--config', config, '--command', sql])
  const parsed = JSON.parse(output)
  return parsed[0]?.results || []
}

function sql(value) {
  if (value === null) return 'NULL'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

function contentType(storageKey) {
  const extension = storageKey.split('.').pop()?.toLowerCase()
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' })[extension] || null
}

function reference(sourceUrl, kind) {
  const url = new URL(sourceUrl)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.host !== host) {
    throw new Error(`Unsupported image source: ${sourceUrl}`)
  }
  let storageKey = decodeURIComponent(url.pathname).replace(/^\/+/, '')
  if (storageKey.toLowerCase().startsWith('file/')) storageKey = storageKey.slice(5)
  if (!storageKey || storageKey.startsWith('/') || storageKey.includes('..') || /^https?:\/\//i.test(storageKey)) {
    throw new Error(`Invalid storage key: ${sourceUrl}`)
  }
  const publicId = `i_${createHash('sha256').update(storageKey).digest('base64url').slice(0, 16)}`
  return { sourceUrl, storageKey, publicId, contentType: contentType(storageKey), kind }
}

const sourcePattern = `https://${host}/%`.replaceAll("'", "''")
const articles = query(`SELECT id, cover_image AS source_url FROM articles WHERE cover_image LIKE '${sourcePattern}' AND cover_image_asset_id IS NULL ORDER BY id`)
const galleries = query(`SELECT id, image_url AS source_url FROM galleries WHERE image_url LIKE '${sourcePattern}' AND image_asset_id IS NULL ORDER BY id`)
const assets = new Map()
const links = []

for (const row of articles) {
  const asset = reference(String(row.source_url), 'article_cover')
  assets.set(asset.publicId, asset)
  links.push({ table: 'articles', id: Number(row.id), column: 'cover_image_asset_id', publicId: asset.publicId })
}
for (const row of galleries) {
  const asset = reference(String(row.source_url), 'gallery')
  assets.set(asset.publicId, asset)
  links.push({ table: 'galleries', id: Number(row.id), column: 'image_asset_id', publicId: asset.publicId })
}

const statements = []
for (const asset of assets.values()) {
  statements.push(`INSERT INTO image_assets (public_id, storage_key, source_url, content_type, version, kind, is_active, created_at, updated_at) VALUES (${sql(asset.publicId)}, ${sql(asset.storageKey)}, ${sql(asset.sourceUrl)}, ${sql(asset.contentType)}, 1, ${sql(asset.kind)}, 1, ${sql(now)}, ${sql(now)}) ON CONFLICT(public_id) DO UPDATE SET storage_key = excluded.storage_key, source_url = excluded.source_url, content_type = COALESCE(excluded.content_type, image_assets.content_type), is_active = 1, updated_at = excluded.updated_at;`)
}
for (const link of links) {
  statements.push(`UPDATE ${link.table} SET ${link.column} = (SELECT id FROM image_assets WHERE public_id = ${sql(link.publicId)} LIMIT 1), updated_at = ${sql(now)} WHERE id = ${sql(link.id)} AND ${link.column} IS NULL;`)
}

mkdirSync(resolve('.data'), { recursive: true })
writeFileSync(outputPath, `${statements.join('\n')}\n`, 'utf8')
const summary = { mode: apply ? 'apply' : 'dry-run', remote, host, articles: articles.length, galleries: galleries.length, uniqueAssets: assets.size, outputPath }
if (!apply) {
  console.log(JSON.stringify(summary))
  process.exit(0)
}

runWrangler(['d1', 'execute', 'blog-db', remote ? '--remote' : '--local', '--config', config, `--file=${outputPath}`])
console.log(JSON.stringify(summary))

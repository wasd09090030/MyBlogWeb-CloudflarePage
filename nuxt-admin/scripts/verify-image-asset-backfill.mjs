import { execFileSync } from 'node:child_process'

const command = process.execPath
const host = process.argv.includes('--host') ? String(process.argv[process.argv.indexOf('--host') + 1] || '') : ''
if (!host) throw new Error('Usage: node scripts/verify-image-asset-backfill.mjs --host <hostname>')
if (!/^[A-Za-z0-9.-]+(?::\d+)?$/.test(host)) throw new Error('Host must be a hostname with an optional port')
const articleSource = `https://${host}/%`
const query = `
  SELECT
    (SELECT COUNT(*) FROM articles WHERE cover_image LIKE '${articleSource}' AND cover_image_asset_id IS NULL) AS missing_article_assets,
    (SELECT COUNT(*) FROM galleries WHERE image_url LIKE '${articleSource}' AND image_asset_id IS NULL) AS missing_gallery_assets;
`

const output = execFileSync(command, [
  './node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'blog-db', '--remote', '--json', '--config', 'wrangler.toml', '--command', query
], { encoding: 'utf8' })

const result = JSON.parse(output)
const counts = result[0]?.results?.[0]
if (!counts) throw new Error('D1 did not return image asset backfill counts')

const missingArticles = Number(counts.missing_article_assets)
const missingGallery = Number(counts.missing_gallery_assets)
if (missingArticles !== 0 || missingGallery !== 0) {
  throw new Error(`Image asset backfill is incomplete: articles=${missingArticles}, gallery=${missingGallery}`)
}

console.log(JSON.stringify({ host, missingArticles, missingGallery }))

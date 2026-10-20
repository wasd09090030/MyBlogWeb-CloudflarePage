import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { createError } from 'h3'
import { FINGERPRINT_VERSION, fingerprintPixels, fingerprintKey, compareImages, hammingDistance, reviewCandidates } from '../shared/gallery-duplicates.ts'
import { readBoundedImage, MAX_DUPLICATE_IMAGE_BYTES } from '../server/utils/gallery-image-source.ts'

const root = new URL('../', import.meta.url)
const pixels = (fn) => Uint8ClampedArray.from({ length: 4096 }, (_, i) => {
  const pixel = Math.floor(i / 4), channel = i % 4
  return channel === 3 ? 255 : fn(pixel % 32, Math.floor(pixel / 32), channel)
})
const original = pixels((x, y, c) => 110 + 50 * Math.sin(x / 4 + c) + 40 * Math.cos(y / 3))
const changed = Uint8ClampedArray.from(original, (v, i) => i % 4 === 3 ? v : Math.round(v / 5) * 5)
const fingerprint = fingerprintPixels(original, 800, 600)
const compressed = fingerprintPixels(changed, 400, 300)
const image = (key, fp, sourceUrl = `https://images.example/${key}.jpg`) => ({ key, imageUrl: sourceUrl, sourceUrl, label: key, fingerprint: fp })
assert.ok(compareImages(image('original', fingerprint), image('compressed', compressed)), 'quantization and resizing should match')
assert.equal(hammingDistance('0000000000000000', 'ffffffffffffffff'), 64)
assert.throws(() => hammingDistance('invalid', fingerprint.hash))
assert.equal(fingerprintKey(' https://IMAGES.example/a.jpg#view '), 'https://images.example/a.jpg')
assert.equal(compareImages(image('a', fingerprint), image('crop', { ...fingerprint, width: 200 })), null)
const differentPattern = fingerprintPixels(pixels((x, y, c) => 110 + 50 * Math.sin(y / 4 + c) + 40 * Math.cos(x / 3)), 800, 600)
assert.equal(compareImages(image('a', fingerprint), image('different', differentPattern)), null, 'distinct smooth artwork must not match from a sparse hash')
const solid = (r, g, b) => fingerprintPixels(pixels((_x, _y, c) => [r, g, b][c]), 800, 600)
assert.ok(compareImages(image('white', solid(255, 255, 255)), image('white-copy', solid(253, 253, 253))))
assert.equal(compareImages(image('red', solid(255, 0, 0)), image('blue', solid(0, 0, 255))), null)
const batch = reviewCandidates([image('one', fingerprint), image('two', compressed), { ...image('failed'), error: 'unreadable' }], [])
assert.deepEqual(batch.map(item => item.keep), [true, false, false])
assert.equal(batch[1].matches[0].right.key, 'one')
assert.equal(reviewCandidates([image('new', compressed)], [image('hidden', fingerprint)])[0].keep, false)
const sameAddress = reviewCandidates([{ ...image('one'), error: 'unreadable' }, { ...image('two', undefined, 'https://images.example/one.jpg'), error: 'unreadable' }], [])
assert.equal(sameAddress[1].matches[0].exact, true)

const allowed = url => {
  if (new URL(url).host !== 'images.example') throw createError({ statusCode: 422, statusMessage: 'Unsupported host' })
  return url
}
let calls = 0
const redirectRequest = async (_url, options) => {
  calls++
  assert.equal(options.redirect, 'manual')
  assert.deepEqual(Object.keys(options.headers), ['accept'])
  return new Response(null, { status: 302, headers: { location: 'https://unapproved.example/a.jpg' } })
}
await assert.rejects(readBoundedImage('https://images.example/a.jpg', allowed, redirectRequest), /Unsupported host/)
assert.equal(calls, 1, 'unsafe redirect must not be requested')
await assert.rejects(readBoundedImage('https://unapproved.example/a.jpg', allowed, redirectRequest), /Unsupported host/)
assert.equal(calls, 1, 'unsafe initial host must not be requested')
await assert.rejects(readBoundedImage('https://images.example/a.svg', allowed, async () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } })), /supported raster/)
await assert.rejects(readBoundedImage('https://images.example/a.jpg', allowed, async () => new Response('x', { headers: { 'content-type': 'image/jpeg', 'content-length': String(MAX_DUPLICATE_IMAGE_BYTES + 1) } })), /20 MB/)
let cancelled = false
await assert.rejects(readBoundedImage('https://images.example/a.jpg', allowed, async () => new Response(new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)) },
  cancel() { cancelled = true }
}), { headers: { 'content-type': 'image/jpeg' } })), /20 MB/)
assert.ok(cancelled, 'oversized stream should be cancelled even without Content-Length')
calls = 0
await assert.rejects(readBoundedImage('https://images.example/a.jpg', allowed, async () => {
  calls++
  return new Response(null, { status: 302, headers: { location: '/loop.jpg' } })
}), /redirect limit/)
assert.equal(calls, 4)
const bytes = await readBoundedImage('https://images.example/a.jpg', allowed, async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg; foo=bar' } }))
assert.deepEqual([...bytes.bytes], [1, 2, 3])

// Exercise the actual migration and domain queries against an isolated SQLite database.
const db = new DatabaseSync(':memory:')
for (const name of readdirSync(new URL('migrations/', root)).filter(name => name.endsWith('.sql')).sort()) {
  db.exec(readFileSync(new URL(`migrations/${name}`, root), 'utf8'))
}
const adapter = {
  prepare(sql) {
    const statement = db.prepare(sql)
    return { bind: (...values) => ({
      first: async () => statement.get(...values) || null,
      all: async () => ({ results: statement.all(...values) }),
      run: async () => ({ meta: statement.run(...values) })
    }) }
  },
  batch: async statements => {
    db.exec('BEGIN')
    try {
      const results = []
      for (const statement of statements) results.push(await statement.run())
      db.exec('COMMIT')
      return results
    } catch (error) { db.exec('ROLLBACK'); throw error }
  }
}
// Nitro auto-imports these in production; keep tests explicit.
globalThis.createError = createError
const bundled = await build({ entryPoints: [new URL('server/domain/gallery-duplicates.ts', root).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true, write: false, format: 'cjs', packages: 'external', platform: 'node', alias: { '~~': new URL('.', root).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '') } })
const module = { exports: {} }
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
const domain = module.exports
const event = { context: { cloudflare: { env: { BLOG_DB: adapter } } } }
const insert = db.prepare("INSERT INTO galleries (id, image_url, is_active, created_at, updated_at) VALUES (?, ?, ?, '2026-10-18', '2026-10-18')")
for (let i = 1; i <= 2005; i++) insert.run(i, `https://images.example/${i}.jpg`, i % 2)
let cursor = 0, snapshot, found = []
do {
  const page = await domain.galleryDuplicateCatalog(event, { cursor, ...(snapshot === undefined ? {} : { snapshot }) })
  snapshot = page.snapshot
  found.push(...page.items)
  if (page.nextCursor === null) break
  assert.ok(page.nextCursor > cursor)
  cursor = page.nextCursor
  // An insertion during scan must not expand its snapshot indefinitely.
  if (cursor === 200) insert.run(2006, 'https://images.example/later.jpg', 1)
} while (true)
assert.equal(found.length, 2005)
assert.ok(found.some(item => item.isActive === false))
assert.equal(found.at(-1).id, 2005)
await assert.rejects(domain.galleryDuplicateCatalog(event, { cursor: '-1' }), /cursor/)
await domain.saveGalleryFingerprints(event, { algorithm: FINGERPRINT_VERSION, fingerprints: [{ imageUrl: 'https://images.example/a.jpg#view', ...fingerprint }] })
const cached = await domain.lookupGalleryFingerprints(event, { imageUrls: ['https://images.example/a.jpg'] })
assert.equal(cached.fingerprints[0].hash, fingerprint.hash)
await assert.rejects(domain.saveGalleryFingerprints(event, { algorithm: 'old', fingerprints: [] }), /version/)
await assert.rejects(domain.saveGalleryFingerprints(event, { algorithm: FINGERPRINT_VERSION, fingerprints: [{ imageUrl: 'x', ...fingerprint, width: NaN }] }), /dimensions/)
await assert.rejects(domain.lookupGalleryFingerprints(event, { imageUrls: Array(51).fill('x') }), /50/)
db.exec("UPDATE gallery_image_fingerprints SET checked_at = '2000-01-01'")
assert.equal((await domain.lookupGalleryFingerprints(event, { imageUrls: ['https://images.example/a.jpg'] })).fingerprints.length, 0)
// Exercise actual gallery deletion against the provider adapter and transactional D1.
const galleryBundle = await build({ entryPoints: [new URL('server/domain/gallery.ts', root).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true, write: false, format: 'cjs', packages: 'external', platform: 'node', alias: { '~~': new URL('.', root).pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '') } })
const galleryModule = { exports: {} }
new Function('require', 'module', 'exports', galleryBundle.outputFiles[0].text)(createRequire(import.meta.url), galleryModule, galleryModule.exports)
const { deleteGallery } = galleryModule.exports
Object.assign(event.context.cloudflare.env, { IMAGE_API_BASE_URL: 'https://images.example', PUBLIC_ASSET_ORIGIN: 'https://cdn.example', PUBLIC_SITE_ORIGIN: 'https://blog.example', IMAGE_API_TOKEN: 'isolated-test-token' })
const originalFetch = globalThis.fetch
let providerStatus = 200, providerSuccess = true, providerThrows = false, providerInvalid = false
const providerCalls = [], remoteFiles = new Set()
globalThis.fetch = async (url, options) => {
  const requestUrl = new URL(url)
  assert.equal(requestUrl.origin, 'https://images.example')
  assert.equal(options.method, 'GET')
  assert.equal(options.headers.get('authorization'), 'Bearer isolated-test-token')
  assert.equal(requestUrl.searchParams.has('folder'), false)
  const key = decodeURIComponent(requestUrl.pathname.slice('/api/manage/delete/'.length))
  providerCalls.push(key)
  if (providerThrows) throw new Error('Connection interrupted')
  if (providerInvalid) return new Response('<html>upstream error</html>', { status: 200 })
  if (providerStatus === 200 && providerSuccess) remoteFiles.delete(key)
  return new Response(JSON.stringify({ success: providerSuccess }), { status: providerStatus })
}
const addAsset = (id, key, publicId = `i_delete_${id}`, active = 1) => {
  db.prepare("INSERT INTO image_assets (id, public_id, storage_key, source_url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '2026-10-20', '2026-10-20')").run(id, publicId, key, `https://images.example/file/${encodeURI(key)}`, active)
  return publicId
}
const addGallery = (id, url, assetId = null) => {
  insert.run(id, url, 1)
  if (assetId) db.prepare('UPDATE galleries SET image_asset_id = ? WHERE id = ?').run(assetId, id)
}
const hasGallery = id => Boolean(db.prepare('SELECT id FROM galleries WHERE id = ?').get(id))
const saveFingerprint = async url => domain.saveGalleryFingerprints(event, { algorithm: FINGERPRINT_VERSION, fingerprints: [{ imageUrl: url, ...fingerprint }] })
const noDelete = async (status, id) => {
  const before = providerCalls.length
  await assert.rejects(deleteGallery(event, id), error => error.statusCode === status)
  assert.equal(providerCalls.length, before, 'blocked deletion must not call the provider')
  assert.ok(hasGallery(id))
}
try {
  const publicId = addAsset(3001, 'uploads/中文 100%.jpg')
  addGallery(3001, `/images/${publicId}`, 3001)
  remoteFiles.add('uploads/中文 100%.jpg')
  for (const url of [`/images/${publicId}`, `https://cdn.example/file/uploads/${encodeURIComponent('中文 100%.jpg')}`, `/images/thumb/grid/${publicId}.webp`]) await saveFingerprint(url)
  for (let index = 0; index < 55; index++) await saveFingerprint(`https://cdn.example/file/uploads/${encodeURIComponent('中文 100%.jpg')}?version=${index}`)
  await saveFingerprint('https://images.example/keep.jpg')
  await deleteGallery(event, 3001)
  assert.equal(hasGallery(3001), false)
  assert.equal(providerCalls.at(-1), 'uploads/中文 100%.jpg', 'canonical keys must not be decoded twice')
  assert.equal(remoteFiles.size, 0)
  assert.equal(db.prepare('SELECT is_active FROM image_assets WHERE id = 3001').get().is_active, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM gallery_image_fingerprints WHERE source_url LIKE ?').get(`%${publicId}%`).count, 0)
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM gallery_image_fingerprints WHERE source_url LIKE ?').get('%cdn.example%').count, 0)
  assert.equal((await domain.lookupGalleryFingerprints(event, { imageUrls: ['https://images.example/keep.jpg'] })).fingerprints.length, 1)

  // Legacy addresses and public shortlinks without a foreign key are supported.
  for (const [id, url, expected] of [[3002, 'https://images.example/file/legacy/a.jpg?download=1#view', 'legacy/a.jpg'], [3003, '/file/legacy/b.jpg', 'legacy/b.jpg'], [3004, 'legacy/c.jpg', 'legacy/c.jpg'], [3005, `/images/thumb/grid/${addAsset(3005, 'legacy/d.jpg')}.webp`, 'legacy/d.jpg']]) {
    addGallery(id, url)
    await deleteGallery(event, id)
    assert.equal(providerCalls.at(-1), expected)
    assert.equal(hasGallery(id), false)
  }
  addGallery(3010, 'https://images.example/file/failure.jpg')
  await saveFingerprint('https://images.example/file/failure.jpg')
  for (const mode of ['http', 'payload', 'network', 'invalid']) {
    providerStatus = mode === 'http' ? 500 : 200
    providerSuccess = mode !== 'payload'
    providerThrows = mode === 'network'
    providerInvalid = mode === 'invalid'
    await assert.rejects(deleteGallery(event, 3010), error => error.statusCode === 502)
    assert.ok(hasGallery(3010), 'provider failure must preserve gallery and fingerprints')
    assert.equal((await domain.lookupGalleryFingerprints(event, { imageUrls: ['https://images.example/file/failure.jpg'] })).fingerprints.length, 1)
  }
  providerStatus = 200; providerSuccess = true; providerThrows = false; providerInvalid = false
  await deleteGallery(event, 3010)

  const sharedId = addAsset(3020, 'shared.jpg')
  addGallery(3020, `/images/${sharedId}`, 3020)
  addGallery(3021, 'https://cdn.example/file/shared.jpg?cache=2')
  db.prepare('UPDATE galleries SET is_active = 0 WHERE id = 3021').run()
  await noDelete(409, 3020)
  db.prepare('DELETE FROM galleries WHERE id = 3021').run()
  addAsset(3022, 'shared.jpg')
  addGallery(3022, 'unrelated-old-display-url', 3022)
  await noDelete(409, 3020)
  db.prepare('DELETE FROM galleries WHERE id = 3022').run()
  db.prepare("INSERT INTO articles (id,title,slug,content,cover_image,cover_image_asset_id,created_at,updated_at) VALUES (3020,'test','delete-reference','body',NULL,3022,'now','now')").run()
  await noDelete(409, 3020)
  db.prepare('UPDATE articles SET cover_image_asset_id = NULL, cover_image = ? WHERE id = 3020').run(`https://blog.example/images/thumb/grid/${sharedId}.webp`)
  await noDelete(409, 3020)
  db.prepare('DELETE FROM articles WHERE id = 3020').run()
  db.prepare("INSERT INTO gallery_hero_items (id,section,image_url,created_at,updated_at) VALUES (3020,'fade','/file/shared.jpg','now','now')").run()
  await noDelete(409, 3020)
  db.prepare('DELETE FROM gallery_hero_items WHERE id = 3020').run()
  await deleteGallery(event, 3020)

  for (const [id, url] of [[3030, 'https://external.example/file/other.jpg'], [3031, '/images/i_missing_asset'], [3032, '/file/../unsafe.jpg'], [3033, '//external.example/file/other.jpg']]) {
    addGallery(id, url)
    await noDelete(422, id)
  }
  addAsset(3034, '../unsafe.jpg')
  addGallery(3034, '/images/i_delete_3034', 3034)
  await noDelete(422, 3034)
  addAsset(3035, 'external-source.jpg')
  addGallery(3035, '/images/i_delete_3035', 3035)
  db.prepare('UPDATE image_assets SET source_url = ? WHERE id = 3035').run('https://external.example/file/external-source.jpg')
  await noDelete(422, 3035)
  const beforeMissing = providerCalls.length
  await assert.rejects(deleteGallery(event, 99999), error => error.statusCode === 404)
  assert.equal(providerCalls.length, beforeMissing)

  addAsset(3040, 'retry.jpg', 'i_delete_retry')
  addGallery(3040, '/images/i_delete_retry', 3040)
  await saveFingerprint('/images/i_delete_retry')
  remoteFiles.add('retry.jpg')
  db.exec("CREATE TRIGGER fail_gallery_cleanup BEFORE DELETE ON galleries WHEN OLD.id = 3040 BEGIN SELECT RAISE(ABORT, 'injected database failure'); END")
  await assert.rejects(deleteGallery(event, 3040), error => error.statusCode === 503)
  assert.ok(hasGallery(3040))
  assert.equal(remoteFiles.has('retry.jpg'), false)
  assert.equal(db.prepare('SELECT is_active FROM image_assets WHERE id = 3040').get().is_active, 1, 'D1 must roll back the asset update')
  assert.equal((await domain.lookupGalleryFingerprints(event, { imageUrls: ['/images/i_delete_retry'] })).fingerprints.length, 1)
  db.exec('DROP TRIGGER fail_gallery_cleanup')
  db.prepare('UPDATE image_assets SET is_active = 0 WHERE id = 3040').run()
  await deleteGallery(event, 3040)
  assert.equal(hasGallery(3040), false, 'retry must finish even when the remote file is absent and the asset is inactive')
  assert.equal((await domain.lookupGalleryFingerprints(event, { imageUrls: ['/images/i_delete_retry'] })).fingerprints.length, 0)
} finally { globalThis.fetch = originalFetch }
db.close()
console.log('Gallery duplicate checks passed: pHash, sources, catalog, fingerprints, remote deletion, shared references and retry after D1 rollback.')

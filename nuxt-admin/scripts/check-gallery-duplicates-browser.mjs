// Optional local Chromium regression. Requires a generated Admin SPA and Node 22+.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('../', import.meta.url))
const browserPath = process.env.CHROMIUM_BIN || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
assert.ok(existsSync(browserPath), 'Set CHROMIUM_BIN to an installed Chromium browser')
assert.ok(existsSync(join(root, '.output/public/index.html')), 'Run npm run generate first')
const profile = mkdtempSync(join(tmpdir(), 'gallery-duplicate-browser-'))
const bundle = await build({ stdin: { contents: `export { fingerprintBlob } from './app/features/gallery-duplicates/fingerprint'; export { compareImages } from './shared/gallery-duplicates'`, resolveDir: root },
  bundle: true, write: false, format: 'esm', platform: 'browser', alias: { '~~': root } })
let fixtures = {}, gallery = [], imports = [], deleted = [], failImage = false, catalogFailure = false, deleteFailure = false
const duplicateCalls = { catalog: 0, lookup: 0, source: 0, fingerprints: 0, purge: 0 }
const fingerprintCache = new Map()
const emptyHero = { sections: { fade: [], accordion: [], coverflow: [], preview: [] } }
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const json = (value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)) }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString()
  const body = raw ? JSON.parse(raw) : {}
  if (url.pathname === '/test') { res.setHeader('content-type', 'text/html'); return res.end('<!doctype html><title>Gallery duplicate tests</title>') }
  if (url.pathname === '/test-module.js') { res.setHeader('content-type', 'application/javascript'); return res.end(bundle.outputFiles[0].text) }
  if (url.pathname === '/photo.webp') { res.setHeader('content-type', 'image/webp'); return res.end(readFileSync(join(root, '../nuxt-public/public/hero/girl-full-silhouette.webp'))) }
  if (url.pathname === '/fixtures') { fixtures = body; return json({ ok: true }) }
  if (url.pathname.startsWith('/fixtures/')) {
    const item = fixtures[url.pathname]
    if (!item) return json({}, 404)
    res.setHeader('content-type', item.type)
    return res.end(Buffer.from(item.base64, 'base64'))
  }
  if (url.pathname === '/admin/api/auth/session') return json({ authenticated: true })
  if (url.pathname === '/admin/api/gallery/hero') return json(emptyHero)
  if (url.pathname === '/admin/api/gallery/admin') return json(gallery)
  if (url.pathname === '/admin/api/gallery/duplicates/catalog') {
    duplicateCalls.catalog++
    if (catalogFailure) return json({ statusMessage: 'Catalog unavailable' }, 503)
    return json({ items: gallery.map(item => ({ ...item, sourceUrl: item.imageUrl })), nextCursor: null, snapshot: 100 })
  }
  if (url.pathname === '/admin/api/gallery/duplicates/lookup') { duplicateCalls.lookup++; return json({ fingerprints: body.imageUrls.map(imageUrl => fingerprintCache.get(imageUrl)).filter(Boolean) }) }
  if (url.pathname === '/admin/api/gallery/duplicates/fingerprints') { duplicateCalls.fingerprints++; body.fingerprints.forEach(item => fingerprintCache.set(item.imageUrl, item)); return json({ saved: body.fingerprints.length }) }
  if (url.pathname === '/admin/api/gallery/duplicates/source') {
    duplicateCalls.source++
    const path = new URL(body.imageUrl, url.origin).pathname
    if (failImage || !fixtures[path]) return json({ statusMessage: 'Fixture read failed' }, 422)
    res.setHeader('content-type', fixtures[path].type)
    return res.end(Buffer.from(fixtures[path].base64, 'base64'))
  }
  if (url.pathname === '/admin/api/gallery/duplicates/purge') {
    duplicateCalls.purge++
    const ids = body.groups.flatMap(group => group.deleteIds)
    for (const id of ids) deleted.push(id)
    gallery = gallery.filter(item => !ids.includes(item.id))
    return json({ deleted: ids.length, mediaDeleted: ids.length, recordsDeleted: 0, skipped: [], failed: [] })
  }
  if (url.pathname === '/admin/api/gallery/batch/import') {
    imports.push(...body.imageUrls)
    body.imageUrls.forEach(imageUrl => gallery.push({ id: Math.max(0, ...gallery.map(item => item.id)) + 1, imageUrl, sourceImageUrl: imageUrl, tag: body.tag, isActive: body.isActive, createdAt: '2026-10-18' }))
    return json({ data: [] })
  }
  if (url.pathname === '/admin/api/gallery' && req.method === 'POST') {
    imports.push(body.imageUrl)
    const item = { id: Math.max(0, ...gallery.map(entry => entry.id)) + 1, ...body, sourceImageUrl: body.imageUrl, createdAt: '2026-10-18' }
    gallery.push(item)
    return json(item)
  }
  if (/^\/admin\/api\/gallery\/\d+$/.test(url.pathname) && req.method === 'PATCH') {
    imports.push(body.imageUrl)
    const id = Number(url.pathname.split('/').at(-1))
    const item = gallery.find(entry => entry.id === id)
    if (item) Object.assign(item, body, { sourceImageUrl: body.imageUrl })
    return json(body)
  }
  if (/^\/admin\/api\/gallery\/\d+$/.test(url.pathname) && req.method === 'DELETE') {
    if (deleteFailure) return json({ statusMessage: 'Gallery media is still referenced', data: { message: '此文件仍被其他画廊项、文章封面或 Hero 引用，请先解除引用，再删除图片。' } }, 409)
    const id = Number(url.pathname.split('/').at(-1))
    deleted.push(id); gallery = gallery.filter(item => item.id !== id)
    return json({})
  }
  if (url.pathname.startsWith('/admin/api/')) return json({}, 404)
  let file = join(root, '.output/public', url.pathname)
  if (!url.pathname.startsWith('/admin/_nuxt/') || !existsSync(file)) file = join(root, '.output/public/index.html')
  res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' })[extname(file)] || 'application/octet-stream')
  res.end(readFileSync(file))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = spawn(browserPath, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
try {
  const activePort = join(profile, 'DevToolsActivePort')
  for (let i = 0; i < 100 && !existsSync(activePort); i++) await pause(100)
  assert.ok(existsSync(activePort), 'Browser debugging port did not start')
  const port = readFileSync(activePort, 'utf8').split('\n')[0]
  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json())
  ws = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
  let nextId = 0
  const pending = new Map()
  ws.onmessage = event => {
    const value = JSON.parse(event.data)
    if (pending.has(value.id)) { pending.get(value.id)(value); pending.delete(value.id) }
  }
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timed out: ${method}`)) }, 30_000)
    pending.set(id, value => { clearTimeout(timer); value.error ? reject(new Error(JSON.stringify(value.error))) : resolve(value.result) })
    ws.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const value = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (value.exceptionDetails) throw new Error(value.exceptionDetails.exception?.description || value.exceptionDetails.text)
    return value.result.value
  }
  const waitFor = async expression => {
    for (let i = 0; i < 200; i++) {
      try { if (await evaluate(expression)) return } catch { /* navigation replaces the JavaScript context */ }
      await pause(100)
    }
    throw new Error(`Browser condition timed out: ${expression}\n${await evaluate('document.body.innerText')}`)
  }
  const click = text => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw new Error('Button missing: ' + ${JSON.stringify(text)}); button.click() })()`)
  await send('Page.navigate', { url: `${origin}/test` })
  await waitFor('document.title === "Gallery duplicate tests"')
  const metrics = await evaluate(`(async () => {
    const { fingerprintBlob, compareImages } = await import('/test-module.js')
    const source = await createImageBitmap(await fetch('/photo.webp').then(r => r.blob()))
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = Math.round(800 * source.height / source.width)
    canvas.getContext('2d').fillStyle = '#fff'
    canvas.getContext('2d').fillRect(0, 0, canvas.width, canvas.height)
    canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height)
    const blob = (canvas, type, quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality))
    const original = await blob(canvas, 'image/png')
    const variants = {}
    for (const quality of [0.4, 0.7, 0.9]) variants['/fixtures/q' + quality + '.jpg'] = await blob(canvas, 'image/jpeg', quality)
    const resized = document.createElement('canvas'); resized.width = 320; resized.height = Math.round(canvas.height * 0.4)
    resized.getContext('2d').drawImage(canvas, 0, 0, resized.width, resized.height)
    variants['/fixtures/small.jpg'] = await blob(resized, 'image/jpeg', 0.65)
    variants['/fixtures/original.png'] = original
    const originalFp = await fingerprintBlob(original)
    const results = [], upload = {}
    for (const [url, value] of Object.entries(variants)) {
      const fp = await fingerprintBlob(value)
      const match = compareImages({ key: 'a', sourceUrl: '/original', fingerprint: originalFp }, { key: 'b', sourceUrl: url, fingerprint: fp })
      results.push({ url, matched: !!match, distance: match?.distance })
      const dataUrl = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(value) })
      upload[url] = { type: value.type, base64: dataUrl.split(',')[1] }
    }
    const uniqueCanvas = document.createElement('canvas'); uniqueCanvas.width = 256; uniqueCanvas.height = 256
    const uniqueContext = uniqueCanvas.getContext('2d')
    uniqueContext.fillStyle = '#16a34a'; uniqueContext.fillRect(0, 0, 256, 256)
    uniqueContext.fillStyle = '#db2777'; uniqueContext.beginPath(); uniqueContext.arc(128, 128, 72, 0, Math.PI * 2); uniqueContext.fill()
    uniqueContext.fillStyle = '#facc15'; uniqueContext.fillRect(24, 24, 48, 48)
    const uniqueBlob = await blob(uniqueCanvas, 'image/png')
    const uniqueDataUrl = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(uniqueBlob) })
    for (const url of ['/fixtures/unique.png', '/fixtures/unique-alias.png']) upload[url] = { type: uniqueBlob.type, base64: uniqueDataUrl.split(',')[1] }
    // After recovery this sample must not collide with the later unique-image edit test.
    upload['/fixtures/broken.jpg'] = upload['/fixtures/original.png']
    await fetch('/fixtures', { method: 'POST', body: JSON.stringify(upload) })
    return results
  })()`)
  assert.ok(metrics.every(item => item.matched), JSON.stringify(metrics))
  console.log('Browser image recompression and resize checks passed.')
  gallery = [
    { id: 1, imageUrl: '/fixtures/original.png', sourceImageUrl: '/fixtures/original.png', tag: 'artwork', isActive: false, createdAt: '2026-10-18' },
    { id: 2, imageUrl: '/fixtures/small.jpg', sourceImageUrl: '/fixtures/small.jpg', tag: 'artwork', isActive: true, createdAt: '2026-10-18' }
  ]
  await send('Page.navigate', { url: `${origin}/admin/gallery` })
  await waitFor('document.body.innerText.includes("检查重复图片")')
  await click('检查重复图片')
  await waitFor('document.body.innerText.includes("1 项疑似重复")')
  await evaluate('window.confirm = message => { window.lastDeleteConfirmation = message; return true }')
  deleteFailure = true
  await click('删除图片及记录')
  await waitFor('document.body.innerText.includes("此文件仍被其他画廊项")')
  assert.equal(deleted.length, 0, 'failed deletion must preserve duplicate entries')
  assert.ok(await evaluate('window.lastDeleteConfirmation.includes("图床原文件") && window.lastDeleteConfirmation.includes("无法撤销")'))
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '删除图片及记录' && !el.disabled)`)
  deleteFailure = false
  await evaluate(`(() => { const buttons = [...document.querySelectorAll('button')].filter(el => el.textContent.trim() === '删除图片及记录'); if (!buttons[1]) throw new Error('expected the second duplicate record action'); buttons[1].click() })()`)
  await waitFor('document.body.innerText.includes("未发现疑似重复图片")')
  assert.equal(deleted.length, 1)
  assert.ok([1, 2].includes(deleted[0]), `unexpected deleted gallery record: ${deleted[0]}`)
  await click('关闭')

  deleteFailure = true
  await evaluate(`document.querySelector('button[aria-label="删除"]').click()`)
  await waitFor('document.body.innerText.includes("删除失败") && document.body.innerText.includes("此文件仍被其他画廊项")')
  assert.equal(deleted.length, 1, 'gallery-list failure must also preserve the record')
  deleteFailure = false

  // Default single/batch saves proceed directly and never touch duplicate endpoints.
  const beforeDefaultChecks = { ...duplicateCalls }
  await click('批量导入')
  await waitFor('!!document.querySelector("textarea")')
  await evaluate(`(() => { const el = document.querySelector('textarea'); el.value = ${JSON.stringify('/fixtures/small.jpg\n/fixtures/q0.7.jpg')}; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '直接导入')`))
  await click('直接导入')
  await waitFor('document.body.innerText.includes("已导入 2 张")')
  assert.equal(imports.length, 2)
  assert.deepEqual(duplicateCalls, beforeDefaultChecks, 'default batch import must not call duplicate checking APIs')
  await click('添加图片')
  await waitFor('!!document.querySelector("form input")')
  await evaluate(`(() => { const el = document.querySelector('form input'); el.value = '/fixtures/q0.9.jpg'; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '保存图片')`))
  await click('保存图片')
  await waitFor('document.body.innerText.includes("画廊已保存")')
  assert.equal(imports.length, 3)
  assert.deepEqual(duplicateCalls, beforeDefaultChecks, 'default single add must not call duplicate checking APIs')
  console.log('Browser default single/batch saves bypass duplicate checks.')

  // Opting into batch checking retains the existing compare-and-review behavior.
  await click('批量导入')
  await waitFor('!!document.querySelector("textarea")')
  await evaluate(`(() => { const el = document.querySelector('textarea'); el.value = ${JSON.stringify('/fixtures/q0.4.jpg\n/fixtures/q0.9.jpg')}; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(el => el.textContent.includes('导入前可选检查重复图片')); if (!label) throw new Error('optional batch duplicate checkbox missing'); label.click() })()`)
  assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '检查重复并导入')`))
  await click('检查重复并导入')
  await waitFor('document.body.innerText.includes("准备保留 0 / 2 张")')
  assert.ok((await evaluate('document.body.innerText')).includes('已隐藏'), 'hidden gallery record must be shown as a match')
  await evaluate(`(() => { const el = [...document.querySelectorAll('[role="checkbox"]')].find(el => el.getAttribute('id') && document.querySelector('label[for="' + el.id + '"]')?.textContent.includes('保留此图片')); if (!el) throw new Error('retain checkbox missing'); el.click() })()`)
  await waitFor('document.body.innerText.includes("确认保留 1 张")')
  await click('确认保留 1 张')
  await waitFor('document.body.innerText.includes("已导入 1 张")')
  assert.equal(imports.length, 4)
  assert.ok(duplicateCalls.catalog > beforeDefaultChecks.catalog)
  console.log('Browser optional batch duplicate review passed.')
  await click('批量导入')
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '直接导入')`)
  assert.ok(await evaluate(`!![...document.querySelectorAll('label')].find(el => el.textContent.includes('导入前可选检查重复图片'))`), 'batch import dialog must expose its optional duplicate check')
  await evaluate(`(() => { const el = document.querySelector('textarea'); el.value = ${JSON.stringify('/fixtures/q0.4.jpg')}; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  const beforeReopenedBatch = { ...duplicateCalls }
  await click('直接导入')
  await waitFor('document.body.innerText.includes("已导入 1 张")')
  assert.deepEqual(duplicateCalls, beforeReopenedBatch, 'reopened batch import must default to no duplicate checks')
  console.log('Browser batch duplicate option resets to off.')
  // Forced failures must stay incomplete on retry, even with an older D1 cache entry.
  failImage = true
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '检查重复图片' && !el.disabled)`)
  await click('检查重复图片')
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '强制重新读取全部图片' && !el.disabled)`)
  await click('强制重新读取全部图片')
  await waitFor('document.body.innerText.includes("当前结果不完整")')
  await click('重试失败图片')
  await waitFor('document.body.innerText.includes("当前结果不完整")')
  assert.ok((await evaluate('document.body.innerText')).includes('读取失败'))
  await click('关闭')

  // A failed candidate is checked only after opting in; it still requires explicit acknowledgement.
  await click('添加图片')
  await waitFor('!!document.querySelector("form input")')
  await evaluate(`(() => { const el = document.querySelector('form input'); el.value = '/fixtures/broken.jpg'; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  await evaluate(`(() => { const label = [...document.querySelectorAll('label')].find(el => el.textContent.includes('保存前可选检查重复图片')); if (!label) throw new Error('optional single duplicate checkbox missing'); label.click() })()`)
  await click('检查重复并保存')
  await waitFor('document.body.innerText.includes("当前结果不完整")')
  assert.ok(await evaluate(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '确认保留 0 张' && el.disabled)`))
  await evaluate(`(() => { for (const label of document.querySelectorAll('label')) { if (label.textContent.includes('我理解检查不完整') || label.textContent.includes('保留此图片')) document.getElementById(label.htmlFor)?.click() } })()`)
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '确认保留 1 张' && !el.disabled)`)
  await click('确认保留 1 张')
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '检查重复图片' && !el.disabled)`)
  assert.equal(imports.length, 6)

  // A catalog failure must prevent import and remain retryable.
  catalogFailure = true
  await click('检查重复图片')
  await waitFor('document.body.innerText.includes("检查未完成")')
  assert.ok(!(await evaluate('document.body.innerText')).includes('未发现疑似重复图片'))
  catalogFailure = false
  failImage = false
  await click('重试检查')
  await waitFor(`document.body.innerText.includes('已检查 ${gallery.length} 条画廊记录')`)
  await click('关闭')
  await click('添加图片')
  await waitFor('!!document.querySelector("form input")')
  await evaluate(`(() => { const el = document.querySelector('form input'); el.value = '/fixtures/unique.png'; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  const beforeUncheckedAdd = { ...duplicateCalls }
  await click('保存图片')
  await waitFor('document.body.innerText.includes("画廊已保存")')
  assert.deepEqual(duplicateCalls, beforeUncheckedAdd, 'default single add must not call duplicate checking APIs')
  await waitFor(`(() => { let card = [...document.querySelectorAll('img')].find(el => new URL(el.getAttribute('src'), location.href).pathname === '/fixtures/unique.png'); while (card && !card.querySelector('button[aria-label="编辑"]')) card = card.parentElement; const button = card?.querySelector('button[aria-label="编辑"]'); if (!button) return false; button.click(); return true })()`)
  await waitFor('!!document.querySelector("form input")')
  await evaluate(`(() => { const el = document.querySelector('form input'); el.value = '/fixtures/unique-alias.png'; el.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  const beforeUncheckedEdit = { ...duplicateCalls }
  const beforeUncheckedEditWrites = imports.length
  await click('保存图片')
  await waitFor('document.body.innerText.includes("画廊已保存")')
  assert.deepEqual(duplicateCalls, beforeUncheckedEdit, 'changed image URLs must not force checking when the option is off')
  assert.equal(imports.length, beforeUncheckedEditWrites + 1)
  await waitFor(`(() => { let card = [...document.querySelectorAll('img')].find(el => new URL(el.getAttribute('src'), location.href).pathname === '/fixtures/unique-alias.png'); while (card && !card.querySelector('button[aria-label="编辑"]')) card = card.parentElement; const button = card?.querySelector('button[aria-label="编辑"]'); if (!button) return false; button.click(); return true })()`)
  await waitFor('!!document.querySelector("form input")')
  await evaluate(`(() => { const el = document.querySelector('form input'); el.value = '/fixtures/unique.png'; el.dispatchEvent(new Event('input', { bubbles: true })); const label = [...document.querySelectorAll('label')].find(el => el.textContent.includes('保存前可选检查重复图片')); if (!label) throw new Error('optional edit duplicate checkbox missing'); label.click() })()`)
  await click('检查重复并保存')
  await waitFor('document.body.innerText.includes("准备保留 1 / 1 张")')
  const galleryCount = gallery.length
  assert.ok((await evaluate('document.body.innerText')).includes(`已检查 ${galleryCount - 1} 条画廊记录`), 'edited record should be excluded from comparison')
  await click('确认保留 1 张')
  await waitFor(`!![...document.querySelectorAll('button')].find(el => el.textContent.trim() === '检查重复图片' && !el.disabled)`)
  assert.equal(imports.length, beforeUncheckedEditWrites + 2)
  // Bulk purge keeps the oldest copy of exact duplicates and deletes only later records.
  gallery = [
    { id: 900, imageUrl: '/fixtures/unique.png', sourceImageUrl: '/fixtures/unique.png', tag: 'artwork', isActive: true, createdAt: '2026-10-01' },
    { id: 901, imageUrl: '/fixtures/unique.png', sourceImageUrl: '/fixtures/unique.png', tag: 'artwork', isActive: true, createdAt: '2026-10-02' },
    { id: 902, imageUrl: '/fixtures/unique.png', sourceImageUrl: '/fixtures/unique.png', tag: 'artwork', isActive: true, createdAt: '2026-10-03' }
  ]
  const beforePurge = duplicateCalls.purge
  await click('检查重复图片')
  await waitFor('document.body.innerText.includes("完全相同图片（视觉距离 0 / 64）")')
  await waitFor('document.body.innerText.includes("可删除 2 张")')
  await evaluate(`(() => { const details = [...document.querySelectorAll('details')].find(el => el.textContent.includes('查看将保留与删除的记录')); if (!details) throw new Error('purge preview missing'); details.open = true })()`)
  await waitFor('document.body.innerText.includes("保留 画廊 #900")')
  const purgePreview = await evaluate('document.body.innerText')
  assert.ok(purgePreview.includes('删除 画廊 #901') && purgePreview.includes('删除 画廊 #902'), 'later copies must be listed for deletion')
  assert.equal(duplicateCalls.purge, beforePurge, 'nothing may be deleted before confirmation')
  await click('批量删除较晚的重复图片')
  await waitFor('document.body.innerText.includes("已删除 2 条重复记录")')
  assert.equal(duplicateCalls.purge, beforePurge + 1)
  assert.deepEqual([...deleted].slice(-2).sort((left, right) => left - right), [901, 902])
  assert.deepEqual(gallery.map(item => item.id), [900])
  assert.ok((await evaluate('window.lastDeleteConfirmation')).includes('无法撤销'))
  await click('关闭')
  console.log('Browser exact-duplicate bulk purge keeps the oldest record.')
  console.log(JSON.stringify({ ok: true, metrics, imported: imports.length, removedRecords: deleted.length, duplicateCalls, forcedFailureRetry: 'incomplete' }, null, 2))
} finally {
  ws?.close()
  browser.kill()
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  // Only this verified, freshly-created temporary profile is removed.
  await pause(500)
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 500 }) } catch { /* browser may briefly retain its profile locks */ }
}

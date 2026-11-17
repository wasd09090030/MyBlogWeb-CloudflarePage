import assert from 'node:assert/strict'
import { ApiError, parseResponse, formatApiError, createApiClient } from '../src/api.js'

// 服务端返回非 JSON（网关错误页）时不能崩
const html = new Response('<html>502 Bad Gateway</html>', { status: 502 })
const parsed = await parseResponse(html)
assert.equal(typeof parsed, 'object')
assert.ok(String(parsed.error).includes('502'), 'non-JSON body must still report the status')
assert.ok(formatApiError(new ApiError(502, parsed.error, parsed)).includes('502'))
// 正常 JSON 原样返回
assert.deepEqual(await parseResponse(new Response('{"a":1}', { status: 200 })), { a: 1 })
// 看起来像 JSON 但截断了：同样退回 { error }，不抛
const truncated = await parseResponse(new Response('{"a":', { status: 500 }))
assert.equal(typeof truncated, 'object')
assert.ok(String(truncated.error).startsWith('{"a":'), 'truncated JSON must surface the raw text')

// 超长非 JSON 正文只保留前 240 字
const longHtml = await parseResponse(new Response(`<html>${'x'.repeat(400)}</html>`, { status: 500 }))
assert.equal(longHtml.error.length, 240)

// 401 有专属提示
const unauthorized = formatApiError(new ApiError(401, 'Authentication required', null))
assert.ok(unauthorized.includes('blog-mcp login'))

// 空 body 不抛异常（204 按规范不能带 body，所以传 null 再交给 parseResponse 读成空串）
assert.equal(await parseResponse(new Response(null, { status: 204 })), null)

// 其他错误带上 status 与文案
const forbidden = formatApiError(new ApiError(403, 'Insufficient scope: mcp:write', null))
assert.ok(forbidden.includes('403') && forbidden.includes('Insufficient scope'))
console.log('smoke: api parsing passed')

// --- createApiClient: URL / headers / error mapping -------------------------
// 这一段用假 fetch，只验证「客户端真正发出去的东西」，不碰网络。
{
  const calls = []
  const realFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } })
    }

    const api = createApiClient({
      baseUrl: 'https://example.test/',
      token: 'tok_secret_value',
      tokenPrefix: 'tok_secret_v',
      username: 'u',
      label: 'l',
      scopes: ['mcp:read'],
      expiresAt: '2026-12-16T00:00:00.000Z'
    })

    const result = await api.request('GET', '/api/mcp/articles', {
      query: { page: 2, pageSize: 10, search: undefined }
    })
    assert.deepEqual(result, { ok: true })

    const call = calls.at(-1)
    assert.equal(call.init.method, 'GET')
    assert.equal(call.url, 'https://example.test/api/mcp/articles?page=2&pageSize=10')
    assert.equal(call.init.headers.authorization, 'Bearer tok_secret_value')
    assert.equal(call.init.headers.accept, 'application/json')

    // POST body 走 JSON
    await api.request('PUT', '/api/mcp/diary/2026-11-16', { body: { contentMarkdown: 'x' } })
    const put = calls.at(-1)
    assert.equal(put.init.method, 'PUT')
    assert.equal(put.init.body, JSON.stringify({ contentMarkdown: 'x' }))
    assert.equal(put.init.headers['content-type'], 'application/json')

    // 非 2xx → ApiError，带 status 且正文只读一次
    globalThis.fetch = async () => new Response('{"statusMessage":"boom"}', { status: 400 })
    await assert.rejects(
      () => api.request('GET', '/api/mcp/nope'),
      error => {
        assert.ok(error instanceof ApiError)
        assert.equal(error.status, 400)
        assert.equal(error.message, 'boom')
        return true
      }
    )

    // 网关 HTML 错误页：status 落到 ApiError.message
    globalThis.fetch = async () => new Response('<html>503</html>', { status: 503, statusText: 'Service Unavailable' })
    await assert.rejects(
      () => api.request('GET', '/api/mcp/nope'),
      error => error instanceof ApiError && error.status === 503 && String(error.message).includes('503')
    )

    // 错误分支不能重复读 body：只允许 read 一次
    let reads = 0
    globalThis.fetch = async () => ({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      async text() {
        reads += 1
        if (reads > 1) throw new Error('body was read twice')
        return '{"error":"duplicate"}'
      }
    })
    await assert.rejects(
      () => api.request('POST', '/api/mcp/articles', { body: { title: 't' } }),
      error => error instanceof ApiError && error.message === 'duplicate'
    )
    assert.equal(reads, 1, 'response body must be read exactly once')

    // 网络失败：用假 fetch 抛 TypeError，错误文案必须落到这个客户端真正请求的
    // baseUrl（credentials.baseUrl），而不是运行时环境变量里的地址——两边不一致时
    // 旧文案会指向一个根本没被请求过的服务器。同时请求必须带超时信号。
    const savedEnvBaseUrl = process.env.BLOG_MCP_URL
    process.env.BLOG_MCP_URL = 'https://runtime-env.test'
    try {
      let seenInit = null
      globalThis.fetch = async (url, init) => {
        seenInit = init
        throw new TypeError('fetch failed')
      }
      await assert.rejects(
        () => api.request('GET', '/api/mcp/whoami'),
        error => {
          const message = formatApiError(error)
          assert.ok(message.includes('无法连接'), message)
          assert.ok(message.includes('BLOG_MCP_URL'), message)
          assert.ok(message.includes('https://example.test'), `the message must name the requested baseUrl: ${message}`)
          assert.equal(message.includes('https://runtime-env.test'), false, 'the message must not name the runtime env baseUrl')
          return true
        }
      )
      assert.ok(seenInit.signal instanceof AbortSignal, 'requests must carry an AbortSignal timeout')
      assert.equal(seenInit.signal.aborted, false, 'the timeout signal must not be pre-aborted')

      // 超时：DOMException 名为 TimeoutError，文案必须与通用网络失败区分开。
      // 用非 TypeError 的异常形态，确保区分靠的是 name 而不是「碰巧 instanceof TypeError」。
      globalThis.fetch = async () => { throw new DOMException('The operation was aborted due to timeout', 'TimeoutError') }
      await assert.rejects(
        () => api.request('GET', '/api/mcp/whoami'),
        error => {
          const message = formatApiError(error)
          assert.ok(message.includes('超时'), message)
          assert.equal(message.includes('无法连接'), false, 'a timeout must not be reported as a connection failure')
          assert.ok(message.includes('https://example.test'), `the timeout message must name the requested baseUrl: ${message}`)
          return true
        }
      )
    } finally {
      if (savedEnvBaseUrl === undefined) delete process.env.BLOG_MCP_URL
      else process.env.BLOG_MCP_URL = savedEnvBaseUrl
    }

    // upload：表单上传，content-type 交给 fetch 生成 boundary
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const { join } = await import('node:path')
    const scratch = mkdtempSync(join(tmpdir(), 'blog-mcp-smoke-'))
    try {
      const png = join(scratch, 'a.PNG')
      writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), init })
        return new Response('{"url":"https://img/a.PNG"}', { status: 201 })
      }
      const uploaded = await api.upload(png)
      assert.deepEqual(uploaded, { url: 'https://img/a.PNG' })

      const form = calls.at(-1)
      assert.equal(form.url, 'https://example.test/api/mcp/images')
      assert.equal(form.init.method, 'POST')
      assert.ok(form.init.body instanceof FormData)
      assert.equal(form.init.body.get('file').name, 'a.PNG')
      assert.equal(
        Object.keys(form.init.headers).some(key => key.toLowerCase() === 'content-type'),
        false,
        'content-type must be left to fetch so the multipart boundary is generated'
      )
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  } finally {
    globalThis.fetch = realFetch
  }
}

// 网络失败（fetch 的 TypeError）提示里要同时提到无法连接与 BLOG_MCP_URL
const savedBaseUrl = process.env.BLOG_MCP_URL
process.env.BLOG_MCP_URL = 'https://offline.test'
const network = formatApiError(new TypeError('fetch failed'))
if (savedBaseUrl === undefined) delete process.env.BLOG_MCP_URL
else process.env.BLOG_MCP_URL = savedBaseUrl
assert.ok(network.includes('无法连接'), network)
assert.ok(network.includes('BLOG_MCP_URL'), network)
assert.ok(network.includes('https://offline.test'), network)
console.log('smoke: api client passed')

// --- 工具表、上传校验、MCP 服务与 CLI ---------------------------------------
// 这一段的断言来自 Task 7 的 Review Focus：16 个工具、删除工具必须带 confirm、
// `id` 只走路径、`image_upload` 先校验再发请求、`serve` 的 stdout 只有 JSON-RPC。
import { tools } from '../src/tools.js'
import { validateUploadPath, MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS } from '../src/upload.js'
import { createMcpServer } from '../src/server.js'
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync, truncateSync, mkdirSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import http from 'node:http'

assert.equal(tools.length, 16)
assert.deepEqual(tools.map(t => t.name).sort(), [
  'article_create', 'article_delete', 'article_get', 'article_list', 'article_summarize', 'article_update',
  'diary_delete', 'diary_list', 'diary_upsert',
  'gallery_create', 'gallery_delete', 'gallery_list', 'gallery_update',
  'image_list', 'image_upload',
  'rebuild_public_site'
])
// 删除工具必须存在，但每条都必须自带危险标注与 confirm 回填
const deleteTools = tools.filter(t => /delete/i.test(t.name))
assert.deepEqual(deleteTools.map(t => t.name).sort(), ['article_delete', 'diary_delete', 'gallery_delete'])
for (const tool of deleteTools) {
  assert.match(tool.description, /危险/, `${tool.name} must mark itself dangerous`)
  assert.match(tool.description, /不可恢复/, `${tool.name} must say it cannot be undone`)
  assert.ok(tool.inputSchema.confirm, `${tool.name} must require a confirm value`)
}
for (const tool of tools) {
  assert.ok(tool.description && tool.description.length > 10, `${tool.name} needs a real description`)
  assert.equal(typeof tool.run, 'function', `${tool.name} needs a run function`)
  assert.equal(typeof tool.inputSchema, 'object', `${tool.name} needs an input schema`)
}

// 上传路径校验：扩展名、绝对路径、存在性、大小。用临时目录造真实文件。
const scratch = mkdtempSync(join(tmpdir(), 'blog-mcp-'))
const png = join(scratch, 'a.PNG')
writeFileSync(png, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
const notImage = join(scratch, 'notes.txt')
writeFileSync(notImage, 'x')

// BLOG_MCP_UPLOAD_ROOTS 若恰好存在于开发者的环境里，这里的断言就失去意义，
// 所以整段临时摘掉它并保证恢复。
const savedRoots = process.env.BLOG_MCP_UPLOAD_ROOTS
delete process.env.BLOG_MCP_UPLOAD_ROOTS
try {
  assert.equal(validateUploadPath(png), png)
  assert.throws(() => validateUploadPath(notImage), /扩展名/)
  assert.throws(() => validateUploadPath('relative/pic.png'), /绝对路径/)
  assert.throws(() => validateUploadPath(join(scratch, 'missing.png')), /不存在/)
  assert.equal(MAX_UPLOAD_BYTES, 50 * 1024 * 1024)
  assert.deepEqual(ALLOWED_EXTENSIONS, ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])

  // 超过 50 MB：用稀疏文件，避免真写 50 MB
  const huge = join(scratch, 'huge.png')
  writeFileSync(huge, '')
  truncateSync(huge, MAX_UPLOAD_BYTES + 1)
  assert.throws(() => validateUploadPath(huge), /50 MB/)
  rmSync(huge, { force: true })

  // 上传根目录白名单
  const otherRoot = mkdtempSync(join(tmpdir(), 'blog-mcp-roots-'))
  try {
    const restricted = { ...process.env, BLOG_MCP_UPLOAD_ROOTS: otherRoot }
    assert.throws(() => validateUploadPath(png, restricted), /BLOG_MCP_UPLOAD_ROOTS/)
    // 白名单命中时放行（分隔符用 path.delimiter，两个根都有效）
    const allowed = { ...process.env, BLOG_MCP_UPLOAD_ROOTS: `${otherRoot}${process.platform === 'win32' ? ';' : ':'}${scratch}` }
    assert.equal(validateUploadPath(png, allowed), png)

    // 白名单里的链接不能成为逃逸通道：字面上在允许目录内，真实路径在外。
    // Windows 上建文件符号链接需要开发者模式/管理员权限，但目录 junction
    // 不需要；非 Windows 直接用文件符号链接。建不出来就跳过（不影响其余断言）。
    const linkedDir = mkdtempSync(join(tmpdir(), 'blog-mcp-outside-'))
    let escapePath = null
    try {
      if (process.platform === 'win32') {
        symlinkSync(scratch, join(linkedDir, 'escape'), 'junction')
        escapePath = join(linkedDir, 'escape', 'a.PNG')
      } else {
        symlinkSync(png, join(linkedDir, 'linked.png'), 'file')
        escapePath = join(linkedDir, 'linked.png')
      }
    } catch {
      escapePath = null
    }
    if (escapePath !== null) {
      const onlyOther = { ...process.env, BLOG_MCP_UPLOAD_ROOTS: linkedDir }
      assert.throws(() => validateUploadPath(escapePath, onlyOther), /BLOG_MCP_UPLOAD_ROOTS/, 'a link must not escape the allowed roots')
      // 链接目标所在目录也在白名单里时应当放行
      const bothRoots = `${linkedDir}${process.platform === 'win32' ? ';' : ':'}${scratch}`
      assert.equal(validateUploadPath(escapePath, { ...process.env, BLOG_MCP_UPLOAD_ROOTS: bothRoots }), escapePath)
    } else {
      console.log('smoke: link escape case skipped (cannot create links here)')
    }
    rmSync(linkedDir, { recursive: true, force: true })
  } finally {
    rmSync(otherRoot, { recursive: true, force: true })
  }
} finally {
  if (savedRoots !== undefined) process.env.BLOG_MCP_UPLOAD_ROOTS = savedRoots
}

// 工具 → 请求映射
const calls = []
const fakeApi = {
  request: async (method, path, opts) => { calls.push({ method, path, opts }); return { ok: true } },
  upload: async (filePath) => { calls.push({ upload: filePath }); return { ok: true } }
}
const byName = Object.fromEntries(tools.map(t => [t.name, t]))

await byName.article_list.run({ page: 2, pageSize: 10 }, fakeApi)
assert.deepEqual(calls.at(-1), { method: 'GET', path: '/api/mcp/articles', opts: { query: { page: 2, pageSize: 10 } } })

await byName.article_get.run({ id: 42 }, fakeApi)
assert.equal(calls.at(-1).path, '/api/mcp/articles/42')
assert.equal(calls.at(-1).method, 'GET')

await byName.article_create.run({ title: 'T', contentMarkdown: 'M', tags: ['a'], category: 'study' }, fakeApi)
assert.equal(calls.at(-1).method, 'POST')
assert.equal(calls.at(-1).path, '/api/mcp/articles')
assert.deepEqual(calls.at(-1).opts.body, { title: 'T', contentMarkdown: 'M', tags: ['a'], category: 'study' })

await byName.article_update.run({ id: 7, title: 'T' }, fakeApi)
assert.equal(calls.at(-1).method, 'PUT')
assert.equal(calls.at(-1).path, '/api/mcp/articles/7')
assert.deepEqual(calls.at(-1).opts.body, { title: 'T' }, 'undefined fields must not be sent')
// id 只走路径：只传 id 时连 body 都不该出现
await byName.article_update.run({ id: 7 }, fakeApi)
assert.deepEqual(calls.at(-1).opts, {}, 'id never goes into the body')

// 可清空字段：null 必须原样进入 body，不能被当成「未填写」丢掉
await byName.article_update.run({ id: 7, coverImage: null, aiSummary: null }, fakeApi)
assert.deepEqual(calls.at(-1).opts.body, { coverImage: null, aiSummary: null })

// 删除工具的 confirm 必须在发请求之前生效
let deleteCalls = 0
const countingApi = { request: async () => { deleteCalls += 1; return { ok: true } }, upload: async () => ({}) }
await assert.rejects(() => byName.article_delete.run({ id: 7, confirm: 8 }, countingApi), /confirm/)
await assert.rejects(() => byName.diary_delete.run({ date: '2026-11-17', confirm: '2026-11-16' }, countingApi), /confirm/)
await assert.rejects(() => byName.gallery_delete.run({ id: 7, confirm: 70 }, countingApi), /confirm/)
assert.equal(deleteCalls, 0, 'a mismatched confirm must never reach the API')

await byName.article_delete.run({ id: 7, confirm: 7 }, fakeApi)
assert.equal(calls.at(-1).method, 'DELETE')
assert.equal(calls.at(-1).path, '/api/mcp/articles/7')
assert.equal(calls.at(-1).opts, undefined)
await byName.gallery_delete.run({ id: 3, confirm: 3 }, fakeApi)
assert.equal(calls.at(-1).method, 'DELETE')
assert.equal(calls.at(-1).path, '/api/mcp/gallery/3')
await byName.diary_delete.run({ date: '2026-11-17', confirm: '2026-11-17' }, fakeApi)
assert.equal(calls.at(-1).method, 'DELETE')
assert.equal(calls.at(-1).path, '/api/mcp/diary/2026-11-17')

await byName.article_summarize.run({ title: 'T', content: 'C' }, fakeApi)
assert.equal(calls.at(-1).method, 'POST')
assert.equal(calls.at(-1).path, '/api/mcp/ai/summary')
assert.deepEqual(calls.at(-1).opts.body, { title: 'T', content: 'C' })

await byName.image_list.run({ dir: 'blog', recursive: true }, fakeApi)
assert.deepEqual(calls.at(-1), {
  method: 'GET',
  path: '/api/mcp/images',
  opts: { query: { dir: 'blog', recursive: true } }
})

await byName.image_upload.run({ filePath: png }, fakeApi)
assert.deepEqual(calls.at(-1), { upload: png })
// 校验在发请求之前：坏路径根本到不了 upload
const callsBeforeUpload = calls.length
await assert.rejects(() => byName.image_upload.run({ filePath: notImage }, fakeApi), /扩展名/)
assert.equal(calls.length, callsBeforeUpload, 'a rejected path must never reach api.upload')

await byName.gallery_list.run({ page: 1, pageSize: 5 }, fakeApi)
assert.deepEqual(calls.at(-1), { method: 'GET', path: '/api/mcp/gallery', opts: { query: { page: 1, pageSize: 5 } } })

await byName.gallery_create.run({ imageUrl: 'https://img/x.png' }, fakeApi)
assert.equal(calls.at(-1).method, 'POST')
assert.equal(calls.at(-1).path, '/api/mcp/gallery')
assert.deepEqual(calls.at(-1).opts.body, { imageUrl: 'https://img/x.png' })

await byName.gallery_update.run({ id: 3, isActive: false }, fakeApi)
assert.equal(calls.at(-1).method, 'PATCH')
assert.equal(calls.at(-1).path, '/api/mcp/gallery/3')
assert.deepEqual(calls.at(-1).opts.body, { isActive: false }, 'id never goes into the body')

await byName.diary_list.run({}, fakeApi)
assert.deepEqual(calls.at(-1), { method: 'GET', path: '/api/mcp/diary', opts: {} })

await byName.diary_upsert.run({ date: '2026-11-16', contentMarkdown: 'x' }, fakeApi)
assert.equal(calls.at(-1).method, 'PUT')
assert.equal(calls.at(-1).path, '/api/mcp/diary/2026-11-16')
assert.deepEqual(calls.at(-1).opts.body, { contentMarkdown: 'x' }, 'isPublic must not be invented client-side')

await byName.rebuild_public_site.run({}, fakeApi)
assert.deepEqual(calls.at(-1), { method: 'POST', path: '/api/mcp/ops/pages/deploy', opts: {} })

// 未传 query 时不能出现空 query 对象
await byName.article_list.run({}, fakeApi)
assert.deepEqual(calls.at(-1).opts, {})

// gallery_create 没有 createdAt（domain 层会忽略）
assert.equal('createdAt' in byName.gallery_create.inputSchema, false)
assert.equal('createdAt' in byName.gallery_update.inputSchema, true)
// diary_upsert 的日期格式由 schema 收紧
assert.equal(byName.diary_upsert.inputSchema.date.safeParse('16-11-2026').success, false)
assert.equal(byName.diary_upsert.inputSchema.date.safeParse('2026-11-16').success, true)

// 描述文字是给模型看的提示，必须与真实行为一致：
// 排序是升序（domain 的两个列表查询都 ORDER BY sort_order ASC），
// 而且 image_list 会让服务端把文件登记进 image_assets，不是纯只读。
assert.ok(byName.gallery_create.description.includes('会直接修改线上数据'))
assert.ok(byName.gallery_create.inputSchema.sortOrder.description.includes('越小越靠前'))
assert.ok(byName.gallery_update.inputSchema.sortOrder.description.includes('越小越靠前'))
assert.equal(byName.image_list.description.includes('只读'), false, 'image_list registers asset rows, so it is not purely read-only')
assert.ok(byName.image_upload.description.includes('公开可访问'))
assert.ok(byName.rebuild_public_site.description.includes('几分钟'))
assert.ok(byName.diary_upsert.description.includes('默认不公开'))
// search 描述写了「最长 200 字」，schema 必须真的挡住
assert.equal(byName.image_list.inputSchema.search.safeParse('x'.repeat(200)).success, true)
assert.equal(byName.image_list.inputSchema.search.safeParse('x'.repeat(201)).success, false)
console.log('smoke: tools mapping passed')

// --- MCP 服务：工具注册、结果序列化、错误映射 ---------------------------------
{
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')

  async function withClient(api, fn) {
    const server = createMcpServer(api)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 'blog-mcp-smoke', version: '0.0.0' })
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    try {
      return await fn(client)
    } finally {
      await client.close()
      await server.close()
    }
  }

  await withClient(fakeApi, async (client) => {
    const { tools: listed } = await client.listTools()
    assert.equal(listed.length, 16)
    assert.deepEqual(listed.map(t => t.name).sort(), tools.map(t => t.name).sort())

    const result = await client.callTool({ name: 'article_list', arguments: { page: 3, pageSize: 4 } })
    assert.equal(result.isError, undefined)
    assert.deepEqual(JSON.parse(result.content[0].text), { ok: true })
    assert.deepEqual(calls.at(-1), {
      method: 'GET',
      path: '/api/mcp/articles',
      opts: { query: { page: 3, pageSize: 4 } }
    })

    // schema 校验失败要变成工具错误，而不是让协议层抛异常
    const invalid = await client.callTool({ name: 'article_create', arguments: { title: 'T' } })
    assert.equal(invalid.isError, true)
    assert.ok(invalid.content[0].text.length > 0)
  })

  // 服务端 2xx 但正文不是 JSON：parseResponse 给的是 { error }，必须当失败上报
  const nonJsonApi = { request: async () => ({ error: '<html>502 Bad Gateway</html>' }), upload: async () => ({}) }
  await withClient(nonJsonApi, async (client) => {
    const result = await client.callTool({ name: 'article_get', arguments: { id: 1 } })
    assert.equal(result.isError, true, 'an error-only body must not be reported as data')
    assert.ok(result.content[0].text.includes('502'))
  })

  // 抛出的异常走 formatApiError：401 提示重新登录
  const unauthorizedApi = {
    request: async () => { throw new ApiError(401, 'Authentication required', null) },
    upload: async () => { throw new ApiError(401, 'Authentication required', null) }
  }
  await withClient(unauthorizedApi, async (client) => {
    const result = await client.callTool({ name: 'article_list', arguments: {} })
    assert.equal(result.isError, true)
    assert.ok(result.content[0].text.includes('blog-mcp login'), result.content[0].text)
  })
}
console.log('smoke: mcp server passed')

// --- CLI：login / status / logout 与 serve 的 stdout 纯净度 -------------------
// 用本地 stub 服务，把凭证目录指到临时目录，绝不碰开发者真实的 %APPDATA%。
{
  const requested = []
  const stub = http.createServer((req, res) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      requested.push({ method: req.method, url: req.url, authorization: req.headers.authorization, body })
      const send = (status, payload) => {
        res.writeHead(status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(payload))
      }
      if (req.method === 'POST' && req.url === '/api/mcp/token') {
        return send(201, {
          token: 'bmcp_smoketoken_0123456789abcdef',
          id: 'tok-smoke',
          tokenPrefix: 'bmcp_smoket',
          username: 'admin',
          label: JSON.parse(body || '{}').label,
          scopes: JSON.parse(body || '{}').scopes || ['mcp:read', 'mcp:write'],
          createdAt: '2026-11-16T00:00:00.000Z',
          lastUsedAt: null,
          expiresAt: '2026-12-16T00:00:00.000Z',
          revokedAt: null
        })
      }
      if (req.method === 'GET' && req.url === '/api/mcp/whoami') {
        return send(200, {
          username: 'admin',
          label: 'smoke',
          scopes: ['mcp:read'],
          expiresAt: '2026-12-16T00:00:00.000Z'
        })
      }
      if (req.method === 'POST' && req.url === '/api/mcp/token/revoke') return send(200, { success: true })
      send(404, { statusMessage: 'not found' })
    })
  })
  await new Promise(resolveReady => stub.listen(0, '127.0.0.1', resolveReady))
  const baseUrl = `http://127.0.0.1:${stub.address().port}`

  const configHome = mkdtempSync(join(tmpdir(), 'blog-mcp-config-'))
  const credentialsDir = join(configHome, 'blog-mcp')
  const credentialsFile = join(credentialsDir, 'credentials.json')
  const cli = fileURLToPath(new URL('../src/index.js', import.meta.url))
  const env = {
    ...process.env,
    BLOG_MCP_URL: baseUrl,
    // 两个平台的环境变量都指向临时目录，credentialsPath() 用哪个都落在这里
    APPDATA: configHome,
    XDG_CONFIG_HOME: configHome
  }

  /** 跑一条 CLI 命令，返回 { code, stdout, stderr }。 */
  function runCli(args, stdin) {
    return new Promise(resolveRun => {
      const child = spawn(process.execPath, [cli, ...args], { env, stdio: ['pipe', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''
      child.stdout.on('data', chunk => { stdout += chunk })
      child.stderr.on('data', chunk => { stderr += chunk })
      child.on('close', code => resolveRun({ code, stdout, stderr }))
      if (stdin !== undefined) child.stdin.write(stdin)
      child.stdin.end()
    })
  }

  try {
    mkdirSync(credentialsDir, { recursive: true })

    // 没有凭证时 status/serve 必须给出可执行的下一步，且不碰 stdout（serve）
    const noCredentialsStatus = await runCli(['status'])
    assert.equal(noCredentialsStatus.code, 1)
    assert.ok(`${noCredentialsStatus.stdout}${noCredentialsStatus.stderr}`.includes('blog-mcp login'))

    const noCredentialsServe = await runCli(['serve'])
    assert.equal(noCredentialsServe.code, 1)
    assert.equal(noCredentialsServe.stdout, '', 'serve must not write diagnostics to stdout')
    assert.ok(noCredentialsServe.stderr.includes('blog-mcp login'))

    // 参数错误要在提示输入之前就失败
    const badDays = await runCli(['login', '--days', '0'])
    assert.equal(badDays.code, 1)
    assert.ok(badDays.stderr.includes('--days'))

    // --help 必须真的可解析（曾经被 parseArgs 的未知参数挡在 2 号退出码）
    const help = await runCli(['--help'])
    assert.equal(help.code, 0, `--help failed: ${help.stdout}${help.stderr}`)
    assert.ok(help.stdout.includes('blog-mcp login'))
    const noArgs = await runCli([])
    assert.equal(noArgs.code, 2)

    // CRLF 输入：Windows 的 cmd / PowerShell 管道就是 CRLF。
    // `\r` 派发成 return、`\n` 再派发成 enter，第二行绝不能因此被当成空密码。
    const crlfLogin = await runCli(['login', '--label', 'crlf'], 'admin\r\nlocal-dev-password-123\r\n')
    assert.equal(crlfLogin.code, 0, `CRLF login failed: ${crlfLogin.stdout}${crlfLogin.stderr}`)
    assert.ok(crlfLogin.stdout.includes('已登录'), crlfLogin.stdout)
    assert.equal(`${crlfLogin.stdout}${crlfLogin.stderr}`.includes('bmcp_smoketoken_0123456789abcdef'), false)
    {
      const body = JSON.parse(requested.filter(r => r.url === '/api/mcp/token').at(-1).body)
      assert.equal(body.username, 'admin')
      assert.equal(body.password, 'local-dev-password-123', 'the password must survive CRLF input')
      // 没有 --read-only 时 scopes 必须整个省略（服务端拒绝 []）
      assert.equal('scopes' in body, false, 'scopes must be omitted unless --read-only is passed')
      assert.equal('expiresInDays' in body, false, 'omitting --days must not send expiresInDays')
    }

    const login = await runCli(['login', '--label', 'smoke', '--read-only'], 'admin\nlocal-dev-password-123\n')
    assert.equal(login.code, 0, `login failed: ${login.stdout}${login.stderr}`)
    assert.ok(login.stdout.includes('已登录'), login.stdout)
    const loginOutput = `${login.stdout}${login.stderr}`
    assert.equal(loginOutput.includes('bmcp_smoketoken_0123456789abcdef'), false, 'the token must never be printed')

    assert.ok(existsSync(credentialsFile), 'login must write credentials')
    const stored = JSON.parse(readFileSync(credentialsFile, 'utf8'))
    assert.equal(stored.token, 'bmcp_smoketoken_0123456789abcdef')
    assert.equal(stored.baseUrl, baseUrl)
    assert.equal(stored.label, 'smoke')
    assert.deepEqual(stored.scopes, ['mcp:read'])

    // --read-only 必须发 scopes: ['mcp:read']（不能是空数组，服务端会 400）
    const tokenRequest = requested.filter(r => r.url === '/api/mcp/token').at(-1)
    const tokenBody = JSON.parse(tokenRequest.body)
    assert.deepEqual(tokenBody.scopes, ['mcp:read'])
    assert.equal(tokenBody.username, 'admin')

    // --days N → expiresInDays: N
    const daysLogin = await runCli(['login', '--label', 'days', '--days', '7'], 'admin\nlocal-dev-password-123\n')
    assert.equal(daysLogin.code, 0, `--days login failed: ${daysLogin.stdout}${daysLogin.stderr}`)
    const daysBody = JSON.parse(requested.filter(r => r.url === '/api/mcp/token').at(-1).body)
    assert.equal(daysBody.expiresInDays, 7)
    assert.equal('scopes' in daysBody, false)

    const status = await runCli(['status'])
    assert.equal(status.code, 0, `status failed: ${status.stdout}${status.stderr}`)
    assert.ok(status.stdout.includes('admin'), status.stdout)
    assert.ok(status.stdout.includes('smoke'), status.stdout)
    assert.ok(status.stdout.includes('mcp:read'), status.stdout)
    assert.ok(status.stdout.includes(baseUrl), status.stdout)
    assert.equal(`${status.stdout}${status.stderr}`.includes('bmcp_smoketoken_0123456789abcdef'), false, 'status must never print the token')
    const whoami = requested.find(r => r.url === '/api/mcp/whoami')
    assert.equal(whoami.authorization, 'Bearer bmcp_smoketoken_0123456789abcdef')

    // serve：stdout 只允许出现 JSON-RPC
    const serve = spawn(process.execPath, [cli, 'serve'], { env, stdio: ['pipe', 'pipe', 'pipe'] })
    let serveOut = ''
    let serveErr = ''
    serve.stdout.on('data', chunk => { serveOut += chunk })
    serve.stderr.on('data', chunk => { serveErr += chunk })
    const serveExit = new Promise(resolveExit => serve.on('close', code => resolveExit(code)))
    const send = (message) => serve.stdin.write(`${JSON.stringify(message)}\n`)
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0.0.0' } }
    })
    send({ jsonrpc: '2.0', method: 'notifications/initialized' })
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' })

    const deadline = Date.now() + 15000
    while (Date.now() < deadline && !serveOut.split('\n').some(line => line.includes('"id":2'))) {
      await new Promise(resolveTick => setTimeout(resolveTick, 50))
    }
    serve.kill()
    await serveExit

    const serveLines = serveOut.split('\n').filter(line => line.trim() !== '')
    assert.ok(serveLines.length >= 2, `serve produced no JSON-RPC: ${serveOut}`)
    for (const line of serveLines) {
      let parsedLine
      assert.doesNotThrow(() => { parsedLine = JSON.parse(line) }, `non JSON-RPC text on stdout: ${JSON.stringify(line)}`)
      assert.equal(parsedLine.jsonrpc, '2.0', `stdout line is not JSON-RPC: ${line}`)
    }
    const listResponse = serveLines.map(line => JSON.parse(line)).find(message => message.id === 2)
    assert.ok(listResponse, 'serve must answer tools/list')
    assert.equal(listResponse.result.tools.length, 16)
    assert.equal(serveOut.includes('smoke:'), false)

    const logout = await runCli(['logout'])
    assert.equal(logout.code, 0, `logout failed: ${logout.stdout}${logout.stderr}`)
    assert.equal(existsSync(credentialsFile), false, 'logout must delete the credentials file')
    assert.ok(requested.some(r => r.method === 'POST' && r.url === '/api/mcp/token/revoke'), 'logout must revoke the token')
    assert.equal(serveErr.includes('smoke:'), false, 'serve keeps its diagnostics off stdout')
  } finally {
    stub.close()
    rmSync(configHome, { recursive: true, force: true })
    rmSync(scratch, { recursive: true, force: true })
  }
}
console.log('smoke: cli passed')

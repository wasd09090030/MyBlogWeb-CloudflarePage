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

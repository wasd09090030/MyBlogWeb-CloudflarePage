import test from 'node:test'
import assert from 'node:assert/strict'
import router, { fetchAdminPages } from './router.js'

function request(path, init = {}) {
  return new Request(`https://blog.example${path}`, init)
}

test('routes API and image paths to BLOG_API', async () => {
  const seen = []
  const env = {
    BLOG_API: { fetch: async req => { seen.push(new URL(req.url).pathname); return new Response('api') } }
  }
  const response = await router.fetch(request('/admin/api/auth/session'), env)
  assert.equal(response.status, 200)
  assert.deepEqual(seen, ['/admin/api/auth/session'])
})

test('serves Admin deep links from SPA entry after Pages 404', async () => {
  const paths = []
  const hosts = []
  const originalFetch = globalThis.fetch
  globalThis.fetch = async req => {
    const url = new URL(req.url)
    paths.push(url.pathname)
    hosts.push(req.headers.get('host'))
    return url.pathname === '/admin/gallery' ? new Response('missing', { status: 404 }) : new Response('admin shell')
  }
  try {
    const response = await router.fetch(request('/admin/gallery'), { ADMIN_PAGES_ORIGIN: 'https://admin.pages.test' })
    assert.equal(response.status, 200)
    assert.deepEqual(paths, ['/admin/gallery', '/'])
    assert.deepEqual(hosts, [null, null])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('forwards public paths to Public Pages', async () => {
  const originalFetch = globalThis.fetch
  let target = ''
  globalThis.fetch = async req => { target = req.url; return new Response('public') }
  try {
    const response = await router.fetch(request('/article/hello?preview=1'), { PUBLIC_PAGES_ORIGIN: 'https://public.pages.test' })
    assert.equal(response.status, 200)
    assert.equal(target, 'https://public.pages.test/article/hello?preview=1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('admin HTML gets no-transform cache-control to block Web Analytics injection', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('admin shell', { headers: { 'cache-control': 'public, max-age=0, must-revalidate' } })
  try {
    const htmlResponse = await router.fetch(request('/admin'), { ADMIN_PAGES_ORIGIN: 'https://admin.pages.test' })
    assert.equal(htmlResponse.headers.get('cache-control'), 'public, max-age=0, must-revalidate, no-transform')
    const assetResponse = await router.fetch(request('/admin/_nuxt/entry.js'), { ADMIN_PAGES_ORIGIN: 'https://admin.pages.test' })
    assert.equal(assetResponse.headers.get('cache-control'), 'public, max-age=0, must-revalidate')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('falls back to the real myblog-admin project when ADMIN_PAGES_ORIGIN is unset', async () => {
  const originalFetch = globalThis.fetch
  let target = ''
  globalThis.fetch = async req => { target = req.url; return new Response('admin shell') }
  try {
    await fetchAdminPages(request('/admin'), {}, new URL('https://blog.example/admin'))
    assert.equal(target, 'https://myblog-admin-8n8.pages.dev/admin')
  } finally {
    globalThis.fetch = originalFetch
  }
})

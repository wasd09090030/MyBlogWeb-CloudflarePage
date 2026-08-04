import test from 'node:test'
import assert from 'node:assert/strict'
import router from './router.js'

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

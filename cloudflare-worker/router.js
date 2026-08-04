const API_PATHS = ['/admin/api', '/api', '/images']

function isPath(pathname, prefixes) {
  return prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function originFrom(env, key, fallback) {
  const configured = typeof env[key] === 'string' ? env[key].trim() : ''
  return configured || fallback
}

function forwardRequest(request) {
  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Host', new URL(request.url).hostname)
  return new Request(request, { headers, redirect: 'manual' })
}

function pagesRequest(request, targetUrl) {
  const headers = new Headers(request.headers)
  // Pages must receive the target Pages hostname, not the public router hostname.
  headers.delete('host')
  return new Request(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  })
}

async function fetchAdminPages(request, env, url) {
  const origin = originFrom(env, 'ADMIN_PAGES_ORIGIN', 'https://myblog-admin.pages.dev')
  const target = new URL(url.pathname + url.search, origin)
  let response = await fetch(pagesRequest(request, target))

  const isAsset = url.pathname.startsWith('/admin/_nuxt/') || /\.[A-Za-z0-9]{1,12}$/.test(url.pathname)
  if (response.status === 404 && request.method === 'GET' && !isAsset) {
    response = await fetch(pagesRequest(request, new URL('/', origin)))
  }
  return response
}

function publicPagesUrl(request, env) {
  const url = new URL(request.url)
  const origin = originFrom(env, 'PUBLIC_PAGES_ORIGIN', 'https://myblogweb-cloudflarepage.pages.dev')
  return new URL(url.pathname + url.search, origin)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (isPath(url.pathname, API_PATHS)) {
      if (!env.BLOG_API || typeof env.BLOG_API.fetch !== 'function') return new Response('blog-api binding is unavailable', { status: 503 })
      return env.BLOG_API.fetch(forwardRequest(request))
    }

    if (isPath(url.pathname, ['/admin'])) return await fetchAdminPages(request, env, url)

    if (env.ASSETS) return env.ASSETS.fetch(request)
    return fetch(pagesRequest(request, publicPagesUrl(request, env)))
  }
}

export { isPath, fetchAdminPages, publicPagesUrl }

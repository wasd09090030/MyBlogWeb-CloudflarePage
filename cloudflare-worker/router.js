const SERVER_PATHS = ['/admin', '/api', '/images', '/_ssr']

function isServerPath(pathname) {
  return SERVER_PATHS.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function pagesOrigin(env) {
  const configured = typeof env.PAGES_ORIGIN === 'string' ? env.PAGES_ORIGIN.trim() : ''
  return configured || 'https://myblogweb-cloudflarepage.pages.dev'
}

function forwardRequest(request) {
  const headers = new Headers(request.headers)
  headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
  headers.set('X-Forwarded-Host', new URL(request.url).hostname)
  return new Request(request, { headers, redirect: 'manual' })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (isServerPath(url.pathname)) {
      if (!env.BLOG_ADMIN || typeof env.BLOG_ADMIN.fetch !== 'function') return new Response('Admin Worker binding is unavailable', { status: 503 })
      return env.BLOG_ADMIN.fetch(forwardRequest(request))
    }

    if (env.ASSETS) return env.ASSETS.fetch(request)
    const pagesUrl = new URL(url.pathname + url.search, pagesOrigin(env))
    return fetch(new Request(pagesUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual'
    }))
  }
}

/**
 * Cloudflare Worker — 混合架构路由分发
 *
 * 同一域名下，根据路径将请求分发到：
 * - Cloudflare Pages（静态博客）
 * - 云服务器（动态 SSR：admin）
 */

// ===== 配置 =====
const PAGES_ORIGIN = 'https://myblogweb-cloudflarepage.pages.dev'  // Cloudflare Pages 部署地址
const SERVER_ORIGIN = 'https://server.wasd09090030.top'
const THUMBNAIL_ROUTE_RE = /^\/images\/thumb\/(i_[A-Za-z0-9_-]{8,48})\.webp$/

// 需要转发到云服务器的路径前缀
const SERVER_ROUTES = ['/admin', '/api', '/images', '/_ssr']

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function trimLeadingSlash(value) {
  return value.replace(/^\/+/, '')
}

function getEnvValue(env, key) {
  const value = env[key]
  return typeof value === 'string' ? value.trim() : ''
}

function isValidStorageKey(storageKey) {
  return storageKey
    && !/^https?:\/\//i.test(storageKey)
    && !storageKey.includes('..')
}

async function handlePermanentThumbnailRequest(path, env) {
  const match = path.match(THUMBNAIL_ROUTE_RE)
  if (!match) {
    return new Response('Invalid thumbnail path', { status: 400 })
  }

  const publicId = match[1]
  const resolveUrl = getEnvValue(env, 'IMAGE_ASSET_RESOLVE_URL')
  const resolveToken = getEnvValue(env, 'IMAGE_ASSET_RESOLVE_TOKEN')
  const originBase = getEnvValue(env, 'IMAGE_ORIGIN_BASE')

  if (!resolveUrl || !resolveToken || !originBase) {
    return new Response('Service Unavailable', { status: 503 })
  }

  let resolveResponse
  try {
    resolveResponse = await fetch(`${trimTrailingSlash(resolveUrl)}/${publicId}`, {
      headers: {
        Authorization: `Bearer ${resolveToken}`,
        Accept: 'application/json'
      },
      cf: {
        cacheTtl: 300,
        cacheEverything: true
      }
    })
  } catch {
    return new Response('Bad Gateway', { status: 502 })
  }

  if (resolveResponse.status === 404) {
    return new Response('Not Found', { status: 404 })
  }

  if (!resolveResponse.ok) {
    return new Response('Bad Gateway', { status: 502 })
  }

  let asset
  try {
    asset = await resolveResponse.json()
  } catch {
    return new Response('Bad Gateway', { status: 502 })
  }

  const storageKey = typeof asset?.storageKey === 'string' ? asset.storageKey.trim() : ''
  if (!isValidStorageKey(storageKey)) {
    return new Response('Bad Gateway', { status: 502 })
  }

  const sourceUrl = `${trimTrailingSlash(originBase)}/${trimLeadingSlash(storageKey)}`

  let imageResponse
  try {
    imageResponse = await fetch(sourceUrl, {
      cf: {
        image: {
          fit: 'scale-down',
          width: 640,
          quality: 72,
          format: 'webp'
        },
        cacheTtl: 31536000,
        cacheEverything: true
      }
    })
  } catch {
    return new Response('Bad Gateway', { status: 502 })
  }

  if (!imageResponse.ok) {
    return new Response('Bad Gateway', { status: 502 })
  }

  const headers = new Headers(imageResponse.headers)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  headers.set('Content-Type', imageResponse.headers.get('Content-Type') || 'image/webp')
  headers.delete('Set-Cookie')

  return new Response(imageResponse.body, {
    status: imageResponse.status,
    statusText: imageResponse.statusText,
    headers
  })
}

// ===== Worker =====
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    if (path.startsWith('/images/thumb/')) {
      return handlePermanentThumbnailRequest(path, env)
    }

    // 判断是否走云服务器
    const isServerRoute = SERVER_ROUTES.some(prefix => path.startsWith(prefix))

    if (isServerRoute) {
      // 转发到云服务器
      const target = new URL(path + url.search, SERVER_ORIGIN)
      const newRequest = new Request(target, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      })
      // 传递客户端真实 IP
      newRequest.headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || '')
      newRequest.headers.set('X-Forwarded-Host', url.hostname)
      return fetch(newRequest)
    }

    // 其余请求走 Cloudflare Pages
    // 方式一：如果 Worker 绑定了 Pages（推荐）
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    // 方式二：直接 fetch Pages 域名
    const pagesUrl = new URL(path + url.search, PAGES_ORIGIN)
    return fetch(pagesUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body
    })
  }
}

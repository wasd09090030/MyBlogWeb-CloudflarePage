import type { H3Event } from 'h3'

type CloudflareRuntime = {
  env?: BlogCloudflareEnv
  context?: ExecutionContext
  request?: Request
}

type CloudflareEvent = H3Event & {
  context?: H3Event['context'] & { cloudflare?: CloudflareRuntime }
  req?: H3Event['req'] & { runtime?: { cloudflare?: CloudflareRuntime } }
}

function runtimeFromEvent(event: H3Event): CloudflareRuntime | undefined {
  const cloudflareEvent = event as CloudflareEvent
  return cloudflareEvent.req?.runtime?.cloudflare || cloudflareEvent.context?.cloudflare
}

/**
 * Nitro exposes bindings on different paths for the Workers and Pages adapters.
 * Keeping the lookup here prevents route handlers from depending on adapter internals.
 */
export function getCloudflareRuntime(event: H3Event): CloudflareRuntime {
  const runtime = runtimeFromEvent(event)
  if (!runtime?.env) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Cloudflare runtime bindings are unavailable'
    })
  }
  return runtime
}

export function getCloudflareEnv(event: H3Event): BlogCloudflareEnv {
  return getCloudflareRuntime(event).env as BlogCloudflareEnv
}

export function getCloudflareDatabase(event: H3Event): D1Database {
  return getCloudflareEnv(event).BLOG_DB
}

export function getCloudflareContext(event: H3Event): ExecutionContext | undefined {
  return getCloudflareRuntime(event).context
}

export function getRequiredSecret(event: H3Event, key: keyof BlogCloudflareEnv): string {
  const value = getCloudflareEnv(event)[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 503, statusMessage: `${String(key)} is not configured` })
  }
  return value.trim()
}

export function getRequestOrigin(event: H3Event): string {
  const env = getCloudflareEnv(event)
  const configured = env.PUBLIC_SITE_ORIGIN?.trim() || env.ADMIN_ORIGIN?.trim()
  return configured || getRequestURL(event).origin
}

/**
 * The origin the browser is actually on, derived from the original request URL.
 *
 * The blog-router forwards requests to this Worker through a service binding,
 * preserving the original browser-facing URL (scheme + host). That URL is the
 * only reliable source of the real origin here: h3's getRequestURL rebuilds the
 * URL from Host / x-forwarded-proto, and the router does not forward
 * x-forwarded-proto, so its scheme can degrade to http even over HTTPS.
 * Same-origin SPA calls must present an Origin equal to this value.
 */
export function getActualRequestOrigin(event: H3Event): string {
  const runtime = getCloudflareRuntime(event)
  if (runtime.request?.url) {
    try {
      return new URL(runtime.request.url).origin
    } catch {
      // malformed forwarded URL — fall through to request reconstruction
    }
  }
  return getRequestURL(event).origin
}

export function getClientAddress(event: H3Event): string | undefined {
  const runtime = getCloudflareRuntime(event)
  return runtime.request?.headers.get('CF-Connecting-IP')
    || getHeader(event, 'cf-connecting-ip')
    || getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
}

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

export function getCloudflareMedia(event: H3Event): R2Bucket {
  return getCloudflareEnv(event).BLOG_MEDIA
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
  const configured = getCloudflareEnv(event).ADMIN_ORIGIN?.trim()
  return configured || getRequestURL(event).origin
}

export function getClientAddress(event: H3Event): string | undefined {
  const runtime = getCloudflareRuntime(event)
  return runtime.request?.headers.get('CF-Connecting-IP')
    || getHeader(event, 'cf-connecting-ip')
    || getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
}

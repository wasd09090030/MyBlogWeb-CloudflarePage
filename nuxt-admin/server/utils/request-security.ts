import type { H3Event } from 'h3'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function assertSafeMutation(event: H3Event) {
  if (!unsafeMethods.has(event.method.toUpperCase())) return
  const origin = getHeader(event, 'origin')
  const expectedOrigin = useRuntimeConfig(event).public.adminOrigin
  const requestOrigin = getRequestURL(event).origin
  const isLocalDevelopment = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(getRequestHost(event).split(':')[0] || '')
  const originAllowed = origin
    ? (origin === expectedOrigin || (process.env.NODE_ENV !== 'production' && origin === requestOrigin))
    : isLocalDevelopment
  if (!originAllowed) throw createError({ statusCode: 403, statusMessage: 'Cross-origin request rejected' })
  const contentType = getHeader(event, 'content-type') || ''
  if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data')) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported content type' })
  }
}

import type { H3Event } from 'h3'
import { getActualRequestOrigin, getRequestOrigin } from '~~/server/utils/cloudflare'

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function hasRequestBody(event: H3Event): boolean {
  const length = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(length) && length > 0) return true
  const transferEncoding = (getHeader(event, 'transfer-encoding') || '').toLowerCase()
  return transferEncoding.includes('chunked')
}

export function assertSafeMutation(event: H3Event) {
  if (!unsafeMethods.has(event.method.toUpperCase())) return
  const origin = getHeader(event, 'origin')
  const requestOrigin = getActualRequestOrigin(event)
  const configuredOrigin = getRequestOrigin(event)
  const isLocalDevelopment = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '::1'].includes(getRequestHost(event).split(':')[0] || '')
  const originAllowed = origin
    ? (origin === requestOrigin || origin === configuredOrigin)
    : isLocalDevelopment
  if (!originAllowed) throw createError({ statusCode: 403, statusMessage: 'Cross-origin request rejected' })
  // Content-Type is only meaningful when a body is present. Body-less mutations
  // (e.g. DELETE, logout, imagebed single delete) carry no Content-Type, so the
  // CSRF-oriented check below must not reject them with 415.
  if (hasRequestBody(event)) {
    const contentType = getHeader(event, 'content-type') || ''
    if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data')) {
      throw createError({ statusCode: 415, statusMessage: 'Unsupported content type' })
    }
  }
}

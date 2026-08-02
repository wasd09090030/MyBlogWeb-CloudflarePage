import { resolveImageAsset } from '~~/server/domain/media'

export default defineEventHandler(async (event) => {
  const rawPath = getRouterParam(event, 'path') || ''
  const parts = rawPath.split('/').filter(Boolean)
  const isThumbnail = parts[0]?.toLowerCase() === 'thumb'
  const publicId = decodeURIComponent(isThumbnail ? String(parts[1] || '').replace(/\.webp$/i, '') : String(parts[0] || ''))
  const resolved = await resolveImageAsset(event, publicId)
  if (!resolved) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  const { asset, object } = resolved
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  if (asset.content_type && !headers.has('content-type')) headers.set('content-type', asset.content_type)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  if (getHeader(event, 'if-none-match') === object.httpEtag) {
    setResponseStatus(event, 304)
    return null
  }
  return new Response(object.body, { status: 200, headers })
})

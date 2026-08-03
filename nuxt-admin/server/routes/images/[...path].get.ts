import { resolveImageAsset } from '~~/server/domain/media'

export default defineEventHandler(async (event) => {
  const rawPath = getRouterParam(event, 'path') || ''
  const parts = rawPath.split('/').filter(Boolean)
  const isThumbnail = parts[0]?.toLowerCase() === 'thumb'
  const publicId = decodeURIComponent(isThumbnail ? String(parts[1] || '').replace(/\.webp$/i, '') : String(parts[0] || ''))
  const resolved = await resolveImageAsset(event, publicId)
  if (!resolved) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return Response.redirect(resolved.sourceUrl, 302)
})

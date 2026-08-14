import { changeAdminPassword, requireAdminSession } from '~~/server/domain/auth'
import { createArticle, deleteArticle, getAdminArticle, listAdminArticles, updateArticle } from '~~/server/domain/articles'
import { listAdminComments, deleteComment, updateCommentStatus } from '~~/server/domain/comments'
import { batchImportGallery, backfillGalleryAssets, createGallery, deleteGallery, getAdminGallery, listAdminGallery, refreshGalleryDimensions, toggleGalleryActive, updateGallery, updateGallerySortOrder } from '~~/server/domain/gallery'
import { listAdminGalleryHero, replaceGalleryHero } from '~~/server/domain/gallery-hero'
import { generateArticleSummary } from '~~/server/domain/operations'
import { assertSafeMutation } from '~~/server/utils/request-security'

function rejectAuthorizationHeader(event: Parameters<typeof defineEventHandler>[0] extends never ? never : any) {
  if (getHeader(event, 'authorization')) throw createError({ statusCode: 400, statusMessage: 'Authorization headers are not accepted for admin BFF requests' })
}

function routeParts(event: any): string[] {
  return String(getRouterParam(event, 'path') || '').split('/').filter(Boolean).map(value => decodeURIComponent(value))
}

function method(event: any) { return event.method.toUpperCase() }

export default defineEventHandler(async (event) => {
  rejectAuthorizationHeader(event)
  assertSafeMutation(event)
  const parts = routeParts(event)
  if (parts[0] === 'beatmaps') throw createError({ statusCode: 410, statusMessage: 'Beatmap API has been retired', data: { code: 'BEATMAP_API_RETIRED' } })
  await requireAdminSession(event)
  const currentMethod = method(event)
  const body = ['GET', 'HEAD'].includes(currentMethod) ? undefined : await readBody<Record<string, unknown>>(event)

  if (parts[0] === 'articles') {
    if (parts.length === 1 && currentMethod === 'GET') return await listAdminArticles(event)
    if (parts.length === 1 && currentMethod === 'POST') { setResponseStatus(event, 201); return await createArticle(event, body || {}) }
    const id = parts[1]
    if (parts.length === 2 && currentMethod === 'GET') return await getAdminArticle(event, id)
    if (parts.length === 2 && currentMethod === 'PUT') return await updateArticle(event, id, body || {})
    if (parts.length === 2 && currentMethod === 'DELETE') { await deleteArticle(event, id); setResponseStatus(event, 204); return null }
  }

  if (parts[0] === 'comments' && parts[1] === 'admin') {
    if (parts.length === 3 && currentMethod === 'GET' && (parts[2] === 'all' || parts[2] === 'pending')) return await listAdminComments(event, parts[2] === 'pending')
    if (parts.length === 4 && parts[3] === 'status' && currentMethod === 'PATCH') return await updateCommentStatus(event, parts[2], body || {})
    if (parts.length === 3 && currentMethod === 'DELETE') { await deleteComment(event, parts[2]); setResponseStatus(event, 204); return null }
  }

  if (parts[0] === 'gallery') {
    if (parts.length === 2 && parts[1] === 'hero' && currentMethod === 'GET') return await listAdminGalleryHero(event)
    if (parts.length === 2 && parts[1] === 'hero' && currentMethod === 'PUT') return await replaceGalleryHero(event, body || {})
    if (parts.length === 2 && parts[1] === 'admin' && currentMethod === 'GET') return await listAdminGallery(event)
    if (parts.length === 1 && currentMethod === 'POST') { setResponseStatus(event, 201); return await createGallery(event, body || {}) }
    if (parts.length === 1 && currentMethod === 'GET') return await listAdminGallery(event)
    if (parts.length === 2 && /^\d+$/.test(parts[1] || '') && currentMethod === 'GET') return await getAdminGallery(event, parts[1]!)
    if (parts.length === 2 && /^\d+$/.test(parts[1] || '') && currentMethod === 'PATCH') return await updateGallery(event, parts[1]!, body || {})
    if (parts.length === 2 && /^\d+$/.test(parts[1] || '') && currentMethod === 'DELETE') { await deleteGallery(event, parts[1]!); setResponseStatus(event, 204); return null }
    if (parts.length === 3 && parts[2] === 'toggle-active' && currentMethod === 'PATCH') return await toggleGalleryActive(event, parts[1]!)
    if (parts.length === 3 && parts[2] === 'dimensions' && currentMethod === 'GET') {
      const row = await getAdminGallery(event, parts[1]!)
      return { id: row.id, imageWidth: row.imageWidth, imageHeight: row.imageHeight }
    }
    if (parts.length === 2 && parts[1] === 'refresh-dimensions' && currentMethod === 'POST') return await refreshGalleryDimensions(event)
    if (parts.length === 2 && parts[1] === 'backfill-image-assets' && currentMethod === 'POST') return await backfillGalleryAssets(event)
    if (parts.length === 3 && parts[1] === 'batch' && parts[2] === 'sort-order' && currentMethod === 'PATCH') return await updateGallerySortOrder(event, body)
    if (parts.length === 3 && parts[1] === 'batch' && parts[2] === 'import' && currentMethod === 'POST') return await batchImportGallery(event, body || {})
  }

  if (parts[0] === 'ai' && parts[1] === 'summary' && currentMethod === 'POST') return await generateArticleSummary(event, body || {})
  if (parts[0] === 'auth' && parts[1] === 'change-password' && currentMethod === 'POST') return await changeAdminPassword(event, body?.currentPassword, body?.newPassword)

  throw createError({ statusCode: 404, statusMessage: 'Unsupported administration API route' })
})

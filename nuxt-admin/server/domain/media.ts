import type { H3Event } from 'h3'
import { readMultipartFormData } from 'h3'
import { execute, getDb, nowIso, parsePositiveInt, queryAll, queryFirst } from '~~/server/utils/d1'
import { getCloudflareEnv, getCloudflareMedia } from '~~/server/utils/cloudflare'
import { extractStorageKey, findImageAsset, isValidPublicId, isValidStorageKey } from './assets'
import { sha256Id } from '~~/server/utils/asset-id'
import { getImagebedConfig } from './config'

function sanitizeFileName(value: string): string {
  const normalized = value.trim().replaceAll('\\', '/').split('/').pop() || 'upload.bin'
  const safe = normalized.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '').slice(0, 160)
  return safe || 'upload.bin'
}

function contentTypeFor(name: string, supplied?: string | null): string {
  if (supplied?.startsWith('image/')) return supplied
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'avif') return 'image/avif'
  return 'application/octet-stream'
}

function normalizePrefix(value: unknown): string {
  const prefix = String(value || '').trim().replaceAll('\\', '/').replace(/^\/+/, '')
  if (prefix.includes('..') || prefix.startsWith('http:') || prefix.startsWith('https:')) throw createError({ statusCode: 400, statusMessage: 'Invalid media prefix' })
  return prefix.replace(/\/+$/, '')
}

function publicUrl(event: H3Event, publicId: string) {
  return `${getRequestURL(event).origin}/images/${encodeURIComponent(publicId)}`
}

export async function uploadMedia(event: H3Event) {
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (contentLength > 50 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Image upload is limited to 50 MB' })
  const contentType = getHeader(event, 'content-type') || ''
  let fileName = getHeader(event, 'x-file-name') || 'upload.bin'
  let fileType = contentType.split(';')[0] || null
  let body: ArrayBuffer | ArrayBufferView | Blob | ReadableStream | string | null = null
  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'file' && part.data)
    if (!file?.data?.length) throw createError({ statusCode: 400, statusMessage: 'A file field is required' })
    fileName = file.filename || fileName
    fileType = file.type || fileType
    body = file.data
  } else {
    const rawBody = await readRawBody(event, false)
    if (!rawBody) throw createError({ statusCode: 400, statusMessage: 'Request body is empty' })
    body = rawBody
  }
  const safeName = sanitizeFileName(fileName)
  const folder = normalizePrefix((await getImagebedConfig(event)).uploadFolder || getCloudflareEnv(event).DEFAULT_UPLOAD_FOLDER || 'uploads')
  const key = `${folder ? `${folder}/` : ''}${Date.now()}_${crypto.randomUUID()}_${safeName}`
  if (!isValidStorageKey(key)) throw createError({ statusCode: 400, statusMessage: 'Generated storage key is invalid' })
  const bucket = getCloudflareMedia(event)
  const type = contentTypeFor(safeName, fileType)
  try {
    await bucket.put(key, body, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } })
    const publicId = await sha256Id(key)
    const now = nowIso()
    await execute(getDb(event), `
      INSERT INTO image_assets (public_id, storage_key, source_url, content_type, version, kind, is_active, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 1, 'other', 1, ?, ?)
      ON CONFLICT(public_id) DO UPDATE SET storage_key = excluded.storage_key, content_type = excluded.content_type, is_active = 1, updated_at = excluded.updated_at
    `, publicId, key, type, now, now)
    const url = publicUrl(event, publicId)
    return { success: true, src: url, url, fileName: safeName, name: key, publicId, contentType: type }
  } catch (error) {
    await bucket.delete(key).catch(() => undefined)
    throw error
  }
}

type ListedObject = { key: string; size: number; uploaded: Date; httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string, string> }

export async function listMedia(event: H3Event, query: Record<string, unknown>) {
  const directory = normalizePrefix(query.dir)
  const search = String(query.search || '').trim().toLowerCase()
  const limit = parsePositiveInt(query.count, 50, 100)
  const prefix = directory ? `${directory}/` : ''
  const listed = await getCloudflareMedia(event).list({ prefix, delimiter: '/', limit })
  const config = await getImagebedConfig(event)
  const files = (listed.objects as ListedObject[])
    .filter(item => !search || item.key.toLowerCase().includes(search))
    .map(item => ({
      name: item.key,
      size: item.size,
      type: item.httpMetadata?.contentType || contentTypeFor(item.key),
      channel: 'CloudflareR2',
      timestamp: item.uploaded instanceof Date ? item.uploaded.toISOString() : String(item.uploaded),
      url: `${config.domain.replace(/\/$/, '')}/file/${encodeURI(item.key)}`,
      metadata: item.customMetadata || {}
    }))
  const directories = (listed.delimitedPrefixes || []).map(value => value.replace(/^\//, '').replace(/\/$/, ''))
  return { files, directories, totalCount: files.length, returnedCount: files.length, domain: config.domain }
}

export async function deleteMedia(event: H3Event, fileValue: unknown) {
  const key = extractStorageKey(decodeURIComponent(String(fileValue || '')))
  if (!key || !isValidStorageKey(key)) throw createError({ statusCode: 400, statusMessage: 'Invalid media key' })
  await getCloudflareMedia(event).delete(key)
  await execute(getDb(event), 'UPDATE image_assets SET is_active = 0, updated_at = ? WHERE storage_key = ?', nowIso(), key)
  return { success: true, deleted: key }
}

export async function bulkDeleteMedia(event: H3Event, files: unknown) {
  if (!Array.isArray(files) || files.length < 1 || files.length > 100) throw createError({ statusCode: 400, statusMessage: 'Select between 1 and 100 files' })
  let deleted = 0
  let failed = 0
  for (const file of files) {
    try { await deleteMedia(event, file); deleted += 1 } catch { failed += 1 }
  }
  return { deleted, failed }
}

export async function resolveImageAsset(event: H3Event, publicIdValue: unknown) {
  const publicId = String(publicIdValue || '')
  if (!isValidPublicId(publicId)) return null
  const asset = await findImageAsset(event, publicId)
  if (!asset || !isValidStorageKey(asset.storage_key)) return null
  const object = await getCloudflareMedia(event).get(asset.storage_key)
  if (!object) return null
  return { asset, object }
}

import type { H3Event } from 'h3'
import { readMultipartFormData } from 'h3'
import { batch, execute, getDb, nowIso, parseNonNegativeInt, parsePositiveInt } from '~~/server/utils/d1'
import { getCloudflareEnv, getCloudflareRuntime } from '~~/server/utils/cloudflare'
import { extractStorageKey, findImageAsset, isValidPublicId, isValidStorageKey, assetUpsertStatement } from './assets'
import { sha256Id } from '~~/server/utils/asset-id'
import { getImagebedConfig } from './config'
import { deleteFromImageApi, listFromImageApi, normalizeImageSourceUrl, uploadToImageApi } from '~~/server/utils/image-api'

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_BULK_DELETE = 25

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

type UploadInput = {
  body: BodyInit
  contentType?: string
  fileName: string
  fileType: string | null
}

async function readUploadInput(event: H3Event): Promise<UploadInput> {
  const contentType = getHeader(event, 'content-type') || ''
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (contentLength > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Image upload is limited to 50 MB' })
  const fileName = getHeader(event, 'x-file-name') || 'upload.bin'
  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    let runtimeRequest: Request | undefined
    try { runtimeRequest = getCloudflareRuntime(event).request }
    catch { runtimeRequest = undefined }
    if (runtimeRequest?.body) {
      return { body: runtimeRequest.body as BodyInit, contentType, fileName, fileType: getHeader(event, 'x-file-type') || null }
    }
    const parts = await readMultipartFormData(event)
    const file = parts?.find(part => part.name === 'file' && part.data)
    if (!file?.data?.length) throw createError({ statusCode: 400, statusMessage: 'A file field is required' })
    const safeName = sanitizeFileName(file.filename || fileName)
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(file.data)], { type: file.type || 'application/octet-stream' }), safeName)
    return { body: form, fileName: safeName, fileType: file.type || null }
  }
  throw createError({ statusCode: 400, statusMessage: 'Upload must use multipart/form-data' })
}

function providerFileName(value: unknown): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null
  let decoded = raw
  try { decoded = decodeURIComponent(raw) } catch { /* keep the original path */ }
  const key = extractStorageKey(decoded)
  return key && isValidStorageKey(key) ? key : null
}

function providerMetadata(file: Record<string, unknown>): Record<string, unknown> {
  return file.metadata && typeof file.metadata === 'object' ? file.metadata as Record<string, unknown> : {}
}

function providerFileType(file: Record<string, unknown>): string | null {
  const metadata = providerMetadata(file)
  const value = metadata['File-Mime'] || metadata['Content-Type'] || file.type
  return value ? String(value) : null
}

function providerFileSize(file: Record<string, unknown>): number {
  const metadata = providerMetadata(file)
  const value = metadata['File-Size'] || file.size
  const size = Number(value)
  return Number.isFinite(size) && size >= 0 ? size : 0
}

function providerFileTimestamp(file: Record<string, unknown>): string {
  const metadata = providerMetadata(file)
  return String(metadata.TimeStamp || file.uploaded || '')
}

export async function uploadMedia(event: H3Event) {
  const input = await readUploadInput(event)
  const config = await getImagebedConfig(event)
  const folder = normalizePrefix(config.uploadFolder || getCloudflareEnv(event).DEFAULT_UPLOAD_FOLDER || 'uploads')
  const uploaded = await uploadToImageApi(event, input.body, input.contentType, folder)
  const sourceUrl = normalizeImageSourceUrl(event, uploaded.src, config.domain)
  const storageKey = providerFileName(sourceUrl)
  if (!storageKey) throw createError({ statusCode: 502, statusMessage: 'Image provider returned an invalid storage key' })
  const safeName = sanitizeFileName(input.fileName)
  const type = contentTypeFor(safeName, input.fileType)
  const publicId = await sha256Id(storageKey)
  const now = nowIso()
  try {
    await execute(getDb(event), `
      INSERT INTO image_assets (public_id, storage_key, source_url, content_type, version, kind, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, 'other', 1, ?, ?)
      ON CONFLICT(public_id) DO UPDATE SET storage_key = excluded.storage_key, source_url = excluded.source_url,
        content_type = excluded.content_type, is_active = 1, updated_at = excluded.updated_at
    `, publicId, storageKey, sourceUrl, type, now, now)
  } catch (error) {
    await deleteFromImageApi(event, storageKey).catch(() => undefined)
    throw error
  }
  return { success: true, src: sourceUrl, url: sourceUrl, fileName: safeName, name: storageKey, publicId, contentType: type }
}

export async function listMedia(event: H3Event, query: Record<string, unknown>) {
  const directory = normalizePrefix(query.dir)
  const search = String(query.search || '').trim().slice(0, 200)
  const start = parseNonNegativeInt(query.start, 0, 100_000)
  const count = parsePositiveInt(query.count, 50, 100)
  const result = await listFromImageApi(event, { start, count, search, dir: directory, recursive: query.recursive === true || query.recursive === 'true' })
  const config = await getImagebedConfig(event)
  const now = nowIso()
  const files = []
  const statements = []
  for (const raw of result.files || []) {
    const file = raw as Record<string, unknown>
    const name = providerFileName(file.name)
    if (!name) continue
    const sourceUrl = normalizeImageSourceUrl(event, `/file/${encodeURI(name)}`, config.domain)
    const contentType = providerFileType(file)
    const publicId = await sha256Id(name)
    statements.push(assetUpsertStatement({ publicId, storageKey: name, sourceUrl, contentType, kind: 'other' }, now))
    files.push({
      name,
      size: providerFileSize(file),
      type: contentType || 'unknown',
      channel: 'CloudflareR2',
      timestamp: providerFileTimestamp(file),
      url: sourceUrl,
      metadata: providerMetadata(file)
    })
  }
  if (statements.length) await batch(getDb(event), statements)
  const directories = (result.directories || []).map(value => normalizePrefix(value)).filter(Boolean)
  const totalCount = Number(result.totalCount)
  const returnedCount = Number(result.returnedCount)
  return {
    files,
    directories,
    totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : files.length,
    returnedCount: Number.isFinite(returnedCount) && returnedCount >= 0 ? returnedCount : files.length,
    domain: config.domain
  }
}

export async function deleteMedia(event: H3Event, fileValue: unknown) {
  const key = providerFileName(String(fileValue || ''))
  if (!key) throw createError({ statusCode: 400, statusMessage: 'Invalid media key' })
  await deleteFromImageApi(event, key)
  await execute(getDb(event), 'UPDATE image_assets SET is_active = 0, updated_at = ? WHERE storage_key = ?', nowIso(), key)
  return { success: true, deleted: key }
}

export async function bulkDeleteMedia(event: H3Event, files: unknown) {
  if (!Array.isArray(files) || files.length < 1 || files.length > MAX_BULK_DELETE) throw createError({ statusCode: 400, statusMessage: `Select between 1 and ${MAX_BULK_DELETE} files` })
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
  if (!asset?.source_url || !isValidStorageKey(asset.storage_key)) return null
  const config = await getImagebedConfig(event)
  let sourceUrl: string
  try { sourceUrl = normalizeImageSourceUrl(event, asset.source_url, config.domain) } catch { return null }
  return { asset, sourceUrl }
}

import { createError, setHeader, type H3Event } from 'h3'
import { FINGERPRINT_TTL_MS, FINGERPRINT_VERSION, fingerprintKey, type ImageFingerprint } from '~~/shared/gallery-duplicates'
import { batch, getDb, nowIso, queryAll, queryFirst } from '~~/server/utils/d1'
import { getImageApiBaseUrl, normalizeImageSourceUrl } from '~~/server/utils/image-api'
import { extractPublicIdFromImageUrl, resolveAssetReference } from './assets'
import { resolveImageAsset } from './media'
import { readBoundedImage } from '~~/server/utils/gallery-image-source'

function imageUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) {
    throw createError({ statusCode: 400, statusMessage: 'Provide an image URL of at most 2048 characters' })
  }
  return fingerprintKey(value)
}

function cursor(value: unknown, fallback = 0): number {
  if (value === undefined) return fallback
  const number = Number(value)
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(number) || number < 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid gallery cursor' })
  }
  return number
}

export async function galleryDuplicateCatalog(event: H3Event, query: Record<string, unknown>) {
  const after = cursor(query.cursor)
  const maximum = query.snapshot === undefined
    ? await queryFirst<{ id: number | null }>(getDb(event), 'SELECT MAX(id) AS id FROM galleries') : null
  const snapshot = cursor(query.snapshot, maximum?.id || 0)
  const rows = await queryAll<{ id: number; image_url: string; public_id: string | null; is_active: number; created_at: string }>(getDb(event), `
    SELECT g.id, g.image_url, ia.public_id, g.is_active, g.created_at
    FROM galleries g LEFT JOIN image_assets ia ON ia.id = g.image_asset_id AND ia.is_active = 1
    WHERE g.id > ? AND g.id <= ? ORDER BY g.id ASC LIMIT 201
  `, after, snapshot)
  const page = rows.slice(0, 200)
  return { items: page.map(row => ({ id: row.id,
    imageUrl: row.public_id ? `/images/${encodeURIComponent(row.public_id)}` : row.image_url,
    sourceUrl: row.image_url, isActive: row.is_active === 1, createdAt: row.created_at })),
  nextCursor: rows.length > 200 ? page.at(-1)!.id : null, snapshot }
}

export async function lookupGalleryFingerprints(event: H3Event, input: Record<string, unknown>) {
  if (!Array.isArray(input.imageUrls) || input.imageUrls.length < 1 || input.imageUrls.length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Provide between 1 and 50 image URLs' })
  }
  const urls = [...new Set(input.imageUrls.map(imageUrl))]
  const rows = await queryAll<ImageFingerprint & { source_url: string; checked_at: string }>(getDb(event), `
    SELECT source_url, hash, width, height, red, green, blue, deviation, checked_at
    FROM gallery_image_fingerprints WHERE algorithm = ? AND source_url IN (${urls.map(() => '?').join(',')}) AND checked_at >= ?
  `, FINGERPRINT_VERSION, ...urls, new Date(Date.now() - FINGERPRINT_TTL_MS).toISOString())
  return { fingerprints: rows.map(({ source_url, checked_at, ...fingerprint }) => ({ imageUrl: source_url, checkedAt: checked_at, ...fingerprint })) }
}

export async function saveGalleryFingerprints(event: H3Event, input: Record<string, unknown>) {
  if (input.algorithm !== FINGERPRINT_VERSION || !Array.isArray(input.fingerprints) || !input.fingerprints.length || input.fingerprints.length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid fingerprint version or batch size' })
  }
  const now = nowIso()
  const statements = input.fingerprints.map(value => {
    if (!value || typeof value !== 'object') throw createError({ statusCode: 400, statusMessage: 'Invalid fingerprint' })
    const item = value as Record<string, unknown>
    const source = imageUrl(item.imageUrl)
    if (typeof item.hash !== 'string' || !/^[a-f0-9]{16}$/.test(item.hash)) throw createError({ statusCode: 400, statusMessage: 'Invalid perceptual hash' })
    const numbers = ['width', 'height', 'red', 'green', 'blue', 'deviation'].map(key => item[key])
    if (numbers.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0)
      || !Number.isSafeInteger(item.width) || !Number.isSafeInteger(item.height)
      || Number(item.width) < 1 || Number(item.height) < 1 || Number(item.width) > 100_000 || Number(item.height) > 100_000
      || numbers.slice(2).some(value => Number(value) > 255)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid fingerprint dimensions or statistics' })
    }
    return { sql: `INSERT INTO gallery_image_fingerprints
      (source_url, algorithm, hash, width, height, red, green, blue, deviation, checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source_url, algorithm) DO UPDATE SET hash=excluded.hash, width=excluded.width, height=excluded.height,
      red=excluded.red, green=excluded.green, blue=excluded.blue, deviation=excluded.deviation, checked_at=excluded.checked_at`,
    values: [source, FINGERPRINT_VERSION, item.hash, ...numbers as number[], now] }
  })
  await batch(getDb(event), statements)
  return { saved: statements.length }
}

export async function galleryDuplicateSource(event: H3Event, input: Record<string, unknown>) {
  const source = imageUrl(input.imageUrl)
  const base = getImageApiBaseUrl(event)
  const publicId = extractPublicIdFromImageUrl(source)
  let resolved: string
  if (publicId) {
    const result = await resolveImageAsset(event, publicId)
    if (!result) throw createError({ statusCode: 422, statusMessage: 'Image asset has no readable source' })
    resolved = result.sourceUrl
  } else if (/^https?:\/\//i.test(source)) {
    resolved = normalizeImageSourceUrl(event, source, base)
  } else {
    const reference = await resolveAssetReference(event, source, 'gallery')
    if (!reference) throw createError({ statusCode: 422, statusMessage: 'Unsupported image source' })
    resolved = normalizeImageSourceUrl(event, `/file/${encodeURI(reference.storageKey)}`, base)
  }
  const result = await readBoundedImage(resolved, url => normalizeImageSourceUrl(event, url, base))
  setHeader(event, 'Content-Type', result.contentType)
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  return result.bytes
}

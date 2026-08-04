import type { H3Event } from 'h3'
import { assetUpsertStatement, resolveAssetReference, thumbnailVariantUrl } from './assets'
import { batch, execute, getDb, nowIso, parseNonNegativeInt, parsePositiveInt, queryAll, queryFirst, requireId } from '~~/server/utils/d1'

type GalleryRow = {
  id: number
  image_url: string
  image_asset_id: number | null
  image_asset_public_id: string | null
  image_asset_storage_key: string | null
  image_asset_content_type: string | null
  image_width: number | null
  image_height: number | null
  sort_order: number
  is_active: number
  tag: string
  created_at: string
  updated_at: string
}

export type GalleryInput = {
  imageUrl?: unknown
  sortOrder?: unknown
  isActive?: unknown
  tag?: unknown
  createdAt?: unknown
}

const select = `
  SELECT g.id, g.image_url, g.image_asset_id,
         ia.public_id AS image_asset_public_id,
         ia.storage_key AS image_asset_storage_key,
         ia.content_type AS image_asset_content_type,
         g.image_width, g.image_height, g.sort_order, g.is_active, g.tag,
         g.created_at, g.updated_at
  FROM galleries g
  LEFT JOIN image_assets ia ON ia.id = g.image_asset_id AND ia.is_active = 1
`

function mapGallery(event: H3Event, row: GalleryRow, publicOnly = false) {
  const imageUrl = row.image_asset_public_id
    ? `/images/${encodeURIComponent(row.image_asset_public_id)}`
    : row.image_url
  const thumbnailUrl = row.image_asset_public_id
    ? `/images/thumb/${encodeURIComponent(row.image_asset_public_id)}.webp`
    : null
  const lightboxUrl = row.image_asset_public_id
    ? thumbnailVariantUrl(row.image_asset_public_id, 'lightbox')
    : null
  if (publicOnly) {
    return {
      id: row.id,
      thumbnailUrl,
      lightboxUrl,
      imageWidth: row.image_width,
      imageHeight: row.image_height,
      tag: row.tag,
      createdAt: row.created_at
    }
  }
  return {
    id: row.id,
    imageUrl,
    sourceImageUrl: row.image_url,
    thumbnailUrl,
    imageAssetId: row.image_asset_id,
    imageAssetPublicId: row.image_asset_public_id,
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    sortOrder: row.sort_order,
    isActive: row.is_active === 1,
    tag: row.tag,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function getRow(event: H3Event, idValue: unknown): Promise<GalleryRow | null> {
  return await queryFirst<GalleryRow>(getDb(event), `${select} WHERE g.id = ? LIMIT 1`, requireId(idValue, 'gallery id'))
}

function normalizeImageUrl(value: unknown): string {
  const result = String(value ?? '').trim()
  if (!result || result.length > 2048) throw createError({ statusCode: 400, statusMessage: 'Image URL is required and must be at most 2048 characters' })
  return result
}

function normalizeTag(value: unknown): string {
  const result = String(value ?? 'artwork').trim()
  return (result || 'artwork').slice(0, 120)
}

function normalizeCreatedAt(value: unknown, fallback: string): string {
  if (value === undefined || value === null || value === '') return fallback
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) throw createError({ statusCode: 400, statusMessage: 'Invalid createdAt' })
  return date.toISOString()
}

async function assetForGallery(event: H3Event, imageUrl: string) {
  return await resolveAssetReference(event, imageUrl, 'gallery')
}

export async function listPublicGallery(event: H3Event) {
  const rows = await queryAll<GalleryRow>(getDb(event), `${select} WHERE g.is_active = 1 ORDER BY g.sort_order ASC, g.id ASC LIMIT 2000`)
  return rows.map(row => mapGallery(event, row, true))
}

export async function listAdminGallery(event: H3Event) {
  const rows = await queryAll<GalleryRow>(getDb(event), `${select} ORDER BY g.sort_order ASC, g.id ASC LIMIT 2000`)
  return rows.map(row => mapGallery(event, row))
}

export async function getAdminGallery(event: H3Event, idValue: unknown) {
  const row = await getRow(event, idValue)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Gallery item not found' })
  return mapGallery(event, row)
}

export async function getPublicGalleryDimensions(event: H3Event, idValue: unknown) {
  const row = await getRow(event, idValue)
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Gallery item not found' })
  return { id: row.id, imageWidth: row.image_width, imageHeight: row.image_height }
}

export async function createGallery(event: H3Event, input: GalleryInput) {
  const imageUrl = normalizeImageUrl(input.imageUrl)
  const reference = await assetForGallery(event, imageUrl)
  const now = nowIso()
  const max = await queryFirst<{ max_sort: number | null }>(getDb(event), 'SELECT MAX(sort_order) AS max_sort FROM galleries')
  const sortOrder = input.sortOrder === undefined || input.sortOrder === null || input.sortOrder === ''
    ? Number(max?.max_sort ?? -1) + 1
    : parseNonNegativeInt(input.sortOrder, 0, 1_000_000)
  const statements = []
  if (reference) statements.push(assetUpsertStatement(reference, now))
  statements.push({
    sql: `
      INSERT INTO galleries
        (image_url, image_asset_id, image_width, image_height, sort_order, is_active, tag, created_at, updated_at)
      VALUES (?, ${reference ? '(SELECT id FROM image_assets WHERE public_id = ? LIMIT 1)' : 'NULL'}, NULL, NULL, ?, ?, ?, ?, ?)
    `,
    values: reference
      ? [imageUrl, reference.publicId, sortOrder, input.isActive === false || input.isActive === 0 ? 0 : 1, normalizeTag(input.tag), now, now]
      : [imageUrl, sortOrder, input.isActive === false || input.isActive === 0 ? 0 : 1, normalizeTag(input.tag), now, now]
  })
  await batch(getDb(event), statements)
  const row = await queryFirst<{ id: number }>(getDb(event), 'SELECT id FROM galleries WHERE image_url = ? AND created_at = ? ORDER BY id DESC LIMIT 1', imageUrl, now)
  return await getAdminGallery(event, row?.id)
}

export async function updateGallery(event: H3Event, idValue: unknown, input: GalleryInput) {
  const id = requireId(idValue, 'gallery id')
  const current = await getRow(event, id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Gallery item not found' })
  const fields: string[] = []
  const values: Array<string | number | null> = []
  let reference = null
  if (input.imageUrl !== undefined) {
    const imageUrl = normalizeImageUrl(input.imageUrl)
    reference = await assetForGallery(event, imageUrl)
    fields.push('image_url = ?', 'image_asset_id = ?')
    values.push(imageUrl)
    if (reference) {
      fields[fields.length - 1] = 'image_asset_id = (SELECT id FROM image_assets WHERE public_id = ? LIMIT 1)'
      values.push(reference.publicId)
    } else {
      values.push(null)
    }
  }
  if (input.sortOrder !== undefined) { fields.push('sort_order = ?'); values.push(parseNonNegativeInt(input.sortOrder, current.sort_order, 1_000_000)) }
  if (input.isActive !== undefined) { fields.push('is_active = ?'); values.push(input.isActive === false || input.isActive === 0 ? 0 : 1) }
  if (input.tag !== undefined) { fields.push('tag = ?'); values.push(normalizeTag(input.tag)) }
  if (input.createdAt !== undefined) { fields.push('created_at = ?'); values.push(normalizeCreatedAt(input.createdAt, current.created_at)) }
  fields.push('updated_at = ?'); values.push(nowIso())
  const statements = []
  if (reference) statements.push(assetUpsertStatement(reference, String(values[values.length - 1])))
  statements.push({ sql: `UPDATE galleries SET ${fields.join(', ')} WHERE id = ?`, values: [...values, id] })
  await batch(getDb(event), statements)
  return await getAdminGallery(event, id)
}

export async function deleteGallery(event: H3Event, idValue: unknown) {
  const result = await execute(getDb(event), 'DELETE FROM galleries WHERE id = ?', requireId(idValue, 'gallery id'))
  if (!result.meta?.changes) throw createError({ statusCode: 404, statusMessage: 'Gallery item not found' })
  return null
}

export async function toggleGalleryActive(event: H3Event, idValue: unknown) {
  const id = requireId(idValue, 'gallery id')
  const result = await execute(getDb(event), 'UPDATE galleries SET is_active = CASE is_active WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?', nowIso(), id)
  if (!result.meta?.changes) throw createError({ statusCode: 404, statusMessage: 'Gallery item not found' })
  return await getAdminGallery(event, id)
}

export async function updateGallerySortOrder(event: H3Event, updates: unknown) {
  if (!Array.isArray(updates) || updates.length < 1 || updates.length > 2000) throw createError({ statusCode: 400, statusMessage: 'Sort order updates are invalid' })
  const now = nowIso()
  const statements = updates.map((item) => {
    const value = item as Record<string, unknown>
    return {
      sql: 'UPDATE galleries SET sort_order = ?, updated_at = ? WHERE id = ?',
      values: [parseNonNegativeInt(value.sortOrder, 0, 1_000_000), now, requireId(value.id, 'gallery id')]
    }
  })
  await batch(getDb(event), statements)
  return { message: 'Sort order updated successfully' }
}

export async function batchImportGallery(event: H3Event, input: Record<string, unknown>) {
  if (!Array.isArray(input.imageUrls) || input.imageUrls.length < 1 || input.imageUrls.length > 500) throw createError({ statusCode: 400, statusMessage: 'Provide between 1 and 500 image URLs' })
  const max = await queryFirst<{ max_sort: number | null }>(getDb(event), 'SELECT MAX(sort_order) AS max_sort FROM galleries')
  let sortOrder = Number(max?.max_sort ?? -1) + 1
  const now = nowIso()
  const statements = []
  let accepted = 0
  for (const value of input.imageUrls) {
    const imageUrl = String(value ?? '').trim()
    if (!imageUrl) continue
    const reference = await assetForGallery(event, imageUrl)
    if (reference) statements.push(assetUpsertStatement(reference, now))
    statements.push({
      sql: `INSERT INTO galleries (image_url, image_asset_id, image_width, image_height, sort_order, is_active, tag, created_at, updated_at)
            VALUES (?, ${reference ? '(SELECT id FROM image_assets WHERE public_id = ? LIMIT 1)' : 'NULL'}, NULL, NULL, ?, ?, ?, ?, ?)`,
      values: reference
        ? [imageUrl, reference.publicId, sortOrder++, input.isActive === false || input.isActive === 0 ? 0 : 1, normalizeTag(input.tag), now, now]
        : [imageUrl, sortOrder++, input.isActive === false || input.isActive === 0 ? 0 : 1, normalizeTag(input.tag), now, now]
    })
    accepted += 1
  }
  if (!accepted) throw createError({ statusCode: 400, statusMessage: 'No valid image URLs were provided' })
  await batch(getDb(event), statements)
  const rows = await queryAll<GalleryRow>(getDb(event), `${select} WHERE g.created_at = ? ORDER BY g.id ASC LIMIT ?`, now, accepted)
  return { message: `Imported ${rows.length} gallery items`, data: rows.map(row => mapGallery(event, row)) }
}

export async function backfillGalleryAssets(event: H3Event) {
  const rows = await queryAll<{ id: number; image_url: string }>(getDb(event), 'SELECT id, image_url FROM galleries WHERE image_asset_id IS NULL ORDER BY id ASC LIMIT 2000')
  const statements = []
  let updated = 0
  const now = nowIso()
  for (const row of rows) {
    const reference = await assetForGallery(event, row.image_url)
    if (!reference) continue
    statements.push(assetUpsertStatement(reference, now))
    statements.push({ sql: 'UPDATE galleries SET image_asset_id = (SELECT id FROM image_assets WHERE public_id = ? LIMIT 1), updated_at = ? WHERE id = ?', values: [reference.publicId, now, row.id] })
    updated += 1
  }
  if (statements.length) await batch(getDb(event), statements)
  return { total: rows.length, updated, skipped: rows.length - updated }
}

export async function refreshGalleryDimensions(event: H3Event) {
  const total = await queryFirst<{ count: number }>(getDb(event), 'SELECT COUNT(*) AS count FROM galleries')
  return { total: Number(total?.count || 0), updated: 0, failed: 0, message: 'Image dimensions are provider-managed and are not read by blog-api' }
}

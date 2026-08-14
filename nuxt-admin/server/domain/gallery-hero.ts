import type { H3Event } from 'h3'
import { assetUpsertStatement, resolveAssetReference, thumbnailVariantUrl } from '~~/server/domain/assets'
import { batch, getDb, nowIso, queryAll, type D1StatementInput } from '~~/server/utils/d1'

export const galleryHeroSections = ['fade', 'accordion', 'coverflow', 'preview'] as const
export type GalleryHeroSection = typeof galleryHeroSections[number]

const sectionLimits: Record<GalleryHeroSection, number> = {
  fade: 5,
  accordion: 5,
  coverflow: 5,
  preview: 3
}

type GalleryHeroRow = {
  id: number
  section: GalleryHeroSection
  image_url: string
  image_asset_id: number | null
  image_asset_public_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

type GalleryHeroInput = {
  sections?: unknown
}

const select = `
  SELECT h.id, h.section, h.image_url, h.image_asset_id, ia.public_id AS image_asset_public_id,
         h.sort_order, h.created_at, h.updated_at
  FROM gallery_hero_items h
  LEFT JOIN image_assets ia ON ia.id = h.image_asset_id AND ia.is_active = 1
`

function emptySections<T>(factory: () => T): Record<GalleryHeroSection, T> {
  return {
    fade: factory(),
    accordion: factory(),
    coverflow: factory(),
    preview: factory()
  }
}

function mapHeroItem(row: GalleryHeroRow, publicOnly = false) {
  const thumbnailUrl = row.image_asset_public_id
    ? `/images/thumb/${encodeURIComponent(row.image_asset_public_id)}.webp`
    : row.image_url
  const lightboxUrl = row.image_asset_public_id
    ? thumbnailVariantUrl(row.image_asset_public_id, 'lightbox')
    : row.image_url

  if (publicOnly) return { id: row.id, thumbnailUrl, lightboxUrl }

  return {
    id: row.id,
    section: row.section,
    imageUrl: row.image_asset_public_id ? `/images/${encodeURIComponent(row.image_asset_public_id)}` : row.image_url,
    sourceImageUrl: row.image_url,
    sortOrder: row.sort_order
  }
}

async function listHero(event: H3Event, publicOnly: boolean) {
  const rows = await queryAll<GalleryHeroRow>(getDb(event), `${select} ORDER BY h.section ASC, h.sort_order ASC, h.id ASC LIMIT 18`)
  const sections = emptySections<Array<ReturnType<typeof mapHeroItem>>>(() => [])
  for (const row of rows) sections[row.section].push(mapHeroItem(row, publicOnly))
  return { isConfigured: rows.length > 0, sections }
}

function normalizeImageUrl(value: unknown): string {
  const imageUrl = String(value ?? '').trim()
  if (!imageUrl || imageUrl.length > 2048) {
    throw createError({ statusCode: 400, statusMessage: 'Hero image URL is required and must be at most 2048 characters' })
  }
  return imageUrl
}

function normalizeSections(value: unknown): Record<GalleryHeroSection, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Hero sections are required' })
  }
  const source = value as Record<string, unknown>
  const sections = emptySections<string[]>(() => [])
  for (const section of galleryHeroSections) {
    const items = source[section]
    if (!Array.isArray(items) || items.length > sectionLimits[section]) {
      throw createError({ statusCode: 400, statusMessage: `Hero section ${section} is invalid` })
    }
    sections[section] = items.map((item) => normalizeImageUrl(
      typeof item === 'object' && item !== null ? (item as Record<string, unknown>).imageUrl : item
    ))
  }
  return sections
}

export async function listPublicGalleryHero(event: H3Event) {
  return await listHero(event, true)
}

export async function listAdminGalleryHero(event: H3Event) {
  return await listHero(event, false)
}

export async function replaceGalleryHero(event: H3Event, input: GalleryHeroInput) {
  const sections = normalizeSections(input.sections)
  const now = nowIso()
  const statements: D1StatementInput[] = [
    { sql: 'DELETE FROM gallery_hero_items' }
  ]

  for (const section of galleryHeroSections) {
    for (const [sortOrder, imageUrl] of sections[section].entries()) {
      const reference = await resolveAssetReference(event, imageUrl, 'gallery')
      if (reference) statements.push(assetUpsertStatement(reference, now))
      statements.push({
        sql: `
          INSERT INTO gallery_hero_items
            (section, image_url, image_asset_id, sort_order, created_at, updated_at)
          VALUES (?, ?, ${reference ? '(SELECT id FROM image_assets WHERE public_id = ? LIMIT 1)' : 'NULL'}, ?, ?, ?)
        `,
        values: reference
          ? [section, imageUrl, reference.publicId, sortOrder, now, now]
          : [section, imageUrl, sortOrder, now, now]
      })
    }
  }

  await batch(getDb(event), statements)
  return await listAdminGalleryHero(event)
}

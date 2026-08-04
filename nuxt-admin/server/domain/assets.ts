import type { H3Event } from 'h3'
import { getCloudflareEnv, getRequestOrigin } from '~~/server/utils/cloudflare'
import { execute, getDb, queryFirst, nowIso, type D1StatementInput } from '~~/server/utils/d1'
import { sha256Id } from '~~/server/utils/asset-id'

export type AssetKind = 'article_cover' | 'gallery' | 'other'

export type ThumbnailVariant = 'card' | 'grid' | 'lightbox'

export type ImageAssetRow = {
  id: number
  public_id: string
  storage_key: string
  source_url: string | null
  content_type: string | null
  version: number
  kind: string
  is_active: number
  created_at: string
  updated_at: string
}

export type AssetReference = {
  publicId: string
  storageKey: string
  sourceUrl: string | null
  contentType: string | null
  kind: AssetKind
}

export function isValidStorageKey(value: string): boolean {
  return Boolean(value)
    && !value.startsWith('/')
    && !value.startsWith('\\')
    && !value.includes('..')
    && !/^https?:\/\//i.test(value)
}

export function isValidPublicId(value: unknown): value is string {
  return typeof value === 'string' && /^i_[A-Za-z0-9_-]{8,48}$/.test(value)
}

export function extractStorageKey(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\/images\//i.test(trimmed) || /^\/images\/thumb\//i.test(trimmed)) return null
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed)
      let path = decodeURIComponent(url.pathname).replace(/^\/+/, '')
      if (path.toLowerCase().startsWith('file/')) path = path.slice(5)
      return isValidStorageKey(path) ? path : null
    } catch {
      return null
    }
  }
  const path = trimmed.replace(/^\/+/, '')
  return isValidStorageKey(path) ? path : null
}

function guessContentType(storageKey: string): string | null {
  const extension = storageKey.split('.').pop()?.toLowerCase()
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'gif') return 'image/gif'
  if (extension === 'avif') return 'image/avif'
  return null
}

export async function resolveAssetReference(event: H3Event, imageUrl: string | null | undefined, kind: AssetKind): Promise<AssetReference | null> {
  if (!imageUrl?.trim()) return null
  const normalized = imageUrl.trim()
  const storageKey = extractStorageKey(normalized)
  if (!storageKey) return null

  const env = getCloudflareEnv(event)
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const sourceUrl = new URL(normalized)
      const allowedHosts = [env.IMAGE_API_BASE_URL, env.PUBLIC_ASSET_ORIGIN].filter(Boolean).flatMap(value => {
        try { return [new URL(value!).host] } catch { return [] }
      })
      if (allowedHosts.length && !allowedHosts.includes(sourceUrl.host)) return null
    } catch { return null }
  }

  return {
    publicId: await sha256Id(storageKey),
    storageKey,
    sourceUrl: /^https?:\/\//i.test(normalized) ? normalized : null,
    contentType: guessContentType(storageKey),
    kind
  }
}

export function assetUpsertStatement(reference: AssetReference, now: string): D1StatementInput {
  return {
    sql: `
      INSERT INTO image_assets
        (public_id, storage_key, source_url, content_type, version, kind, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, 1, ?, ?)
      ON CONFLICT(public_id) DO UPDATE SET
        storage_key = excluded.storage_key,
        source_url = excluded.source_url,
        content_type = COALESCE(excluded.content_type, image_assets.content_type),
        kind = excluded.kind,
        is_active = 1,
        updated_at = excluded.updated_at
    `,
    values: [reference.publicId, reference.storageKey, reference.sourceUrl, reference.contentType, reference.kind, now, now]
  }
}

export function publicImageUrl(event: H3Event, publicId: string): string {
  return `${getRequestOrigin(event).replace(/\/$/, '')}/images/${encodeURIComponent(publicId)}`
}

export function thumbnailUrl(event: H3Event, publicId: string | null | undefined): string | null {
  return isValidPublicId(publicId) ? `${getRequestOrigin(event).replace(/\/$/, '')}/images/thumb/${encodeURIComponent(publicId)}.webp` : null
}

export function thumbnailVariantUrl(publicId: string | null | undefined, variant: ThumbnailVariant): string | null {
  return isValidPublicId(publicId) ? `/images/thumb/${variant}/${encodeURIComponent(publicId)}.webp` : null
}

export async function findImageAsset(event: H3Event, publicId: string): Promise<ImageAssetRow | null> {
  if (!isValidPublicId(publicId)) return null
  return await queryFirst<ImageAssetRow>(getDb(event), `
    SELECT id, public_id, storage_key, source_url, content_type, version, kind,
           is_active, created_at, updated_at
    FROM image_assets
    WHERE public_id = ? AND is_active = 1
    LIMIT 1
  `, publicId)
}

export async function findImageAssetById(event: H3Event, id: number): Promise<ImageAssetRow | null> {
  return await queryFirst<ImageAssetRow>(getDb(event), `
    SELECT id, public_id, storage_key, source_url, content_type, version,
           kind, is_active, created_at, updated_at
    FROM image_assets WHERE id = ? LIMIT 1
  `, id)
}

export async function getOrCreateImageAssetId(event: H3Event, imageUrl: string | null | undefined, kind: AssetKind): Promise<number | null> {
  const reference = await resolveAssetReference(event, imageUrl, kind)
  if (!reference) return null
  const db = getDb(event)
  const existing = await queryFirst<{ id: number }>(db, 'SELECT id FROM image_assets WHERE public_id = ? LIMIT 1', reference.publicId)
  if (existing) return existing.id

  const now = nowIso()
  const statement = assetUpsertStatement(reference, now)
  await execute(db, statement.sql, ...(statement.values || []))
  const inserted = await queryFirst<{ id: number }>(db, 'SELECT id FROM image_assets WHERE public_id = ? LIMIT 1', reference.publicId)
  return inserted?.id ?? null
}

export async function buildAssetFileUrl(event: H3Event, asset: ImageAssetRow): Promise<string> {
  const env = getCloudflareEnv(event)
  const publicOrigin = env.PUBLIC_ASSET_ORIGIN?.trim()
  if (publicOrigin) return `${publicOrigin.replace(/\/file\/?$/i, '').replace(/\/$/, '')}/file/${encodeURI(asset.storage_key.replace(/^\/+/, ''))}`
  return publicImageUrl(event, asset.public_id)
}

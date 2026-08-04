import type { H3Event } from 'h3'
import { batch, execute, getDb, nowIso, parseJsonArray, parsePagination, parsePositiveInt, queryAll, queryFirst, requireId } from '~~/server/utils/d1'
import { assetUpsertStatement, resolveAssetReference, thumbnailVariantUrl } from './assets'
import { fallbackSlug } from '~~/server/utils/slug'

const articleSelect = `
  SELECT a.id, a.title, a.slug, a.content, a.content_markdown, a.cover_image,
         a.cover_image_asset_id, ia.public_id AS cover_image_asset_public_id,
         a.category, a.tags, a.ai_summary, a.created_at, a.updated_at
  FROM articles a
  LEFT JOIN image_assets ia ON ia.id = a.cover_image_asset_id AND ia.is_active = 1
`

type ArticleRow = {
  id: number
  title: string
  slug: string | null
  content: string
  content_markdown: string | null
  cover_image: string | null
  cover_image_asset_id: number | null
  cover_image_asset_public_id: string | null
  category: string
  tags: string | null
  ai_summary: string | null
  created_at: string
  updated_at: string
}

type ArticleInput = {
  title?: string
  slug?: string | null
  content?: string
  contentMarkdown?: string | null
  coverImage?: string | null
  category?: string | null
  tags?: unknown
  aiSummary?: string | null
}

const categoryValues = new Set(['study', 'game', 'work', 'resource', 'other'])

function mapArticle(event: H3Event, row: ArticleRow, mode: 'admin' | 'summary' | 'detail') {
  const tags = parseJsonArray(row.tags)
  const thumbnail = row.cover_image_asset_public_id
    ? thumbnailVariantUrl(row.cover_image_asset_public_id, 'card')
    : null
  const coverImageUrl = row.cover_image_asset_public_id
    ? `/images/${encodeURIComponent(row.cover_image_asset_public_id)}`
    : null
  const base = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    coverImage: mode === 'summary' || mode === 'detail' ? null : row.cover_image,
    coverImageAssetId: row.cover_image_asset_id,
    coverImageAssetPublicId: row.cover_image_asset_public_id,
    thumbnailUrl: thumbnail,
    coverImageUrl,
    category: row.category,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    aiSummary: row.ai_summary
  }
  if (mode === 'summary') {
    return {
      ...base,
      content: row.content.length > 240 ? row.content.slice(0, 240) : row.content,
      contentMarkdown: row.content_markdown && row.content_markdown.length > 240 ? row.content_markdown.slice(0, 200) : row.content_markdown
    }
  }
  if (mode === 'detail') return { ...base, content: row.content, contentMarkdown: row.content_markdown }
  return { ...base, content: row.content, contentMarkdown: row.content_markdown }
}

function normalizeCategory(value: unknown): string {
  const category = String(value || 'other').trim().toLowerCase()
  return categoryValues.has(category) ? category : 'other'
}

function normalizeTags(value: unknown): string {
  if (Array.isArray(value)) return JSON.stringify(value.map(String).filter(Boolean))
  if (typeof value === 'string') {
    try {
      return JSON.stringify(parseJsonArray(value))
    } catch {
      return '[]'
    }
  }
  return '[]'
}

async function findUniqueSlug(event: H3Event, source: string, excludeId?: number): Promise<string> {
  const db = getDb(event)
  const base = fallbackSlug(source)
  let candidate = base
  for (let suffix = 1; suffix <= 1000; suffix += 1) {
    const row = await queryFirst<{ id: number }>(db, `SELECT id FROM articles WHERE slug = ? ${excludeId ? 'AND id <> ?' : ''} LIMIT 1`, ...(excludeId ? [candidate, excludeId] : [candidate]))
    if (!row) return candidate
    candidate = `${base}-${suffix + 1}`
  }
  throw createError({ statusCode: 409, statusMessage: 'Unable to generate a unique slug' })
}

async function getArticleRow(event: H3Event, id: number): Promise<ArticleRow | null> {
  return await queryFirst<ArticleRow>(getDb(event), `${articleSelect} WHERE a.id = ? LIMIT 1`, id)
}

export async function listAdminArticles(event: H3Event) {
  const rows = await queryAll<ArticleRow>(getDb(event), `${articleSelect} ORDER BY a.created_at DESC, a.id DESC LIMIT 500`)
  return rows.map(row => mapArticle(event, row, 'admin'))
}

export async function getAdminArticle(event: H3Event, idValue: unknown) {
  const row = await getArticleRow(event, requireId(idValue, 'article id'))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return mapArticle(event, row, 'admin')
}

export async function listPublicArticles(event: H3Event, query: Record<string, unknown>) {
  const category = query.category ? normalizeCategory(query.category) : null
  const { page, pageSize, offset } = parsePagination(query, { page: 1, pageSize: 10, maxPageSize: 100 })
  const db = getDb(event)
  const where = category ? 'WHERE a.category = ?' : ''
  const values = category ? [category] : []
  const count = await queryFirst<{ total: number }>(db, `SELECT COUNT(*) AS total FROM articles a ${where}`, ...values)
  const rows = await queryAll<ArticleRow>(db, `${articleSelect} ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`, ...values, pageSize, offset)
  const total = Number(count?.total || 0)
  return {
    data: rows.map(row => mapArticle(event, row, 'summary')),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize))
  }
}

export async function listPublicArticlesByCategory(event: H3Event, value: unknown) {
  const category = normalizeCategory(value)
  const rows = await queryAll<ArticleRow>(getDb(event), `${articleSelect} WHERE a.category = ? ORDER BY a.created_at DESC, a.id DESC LIMIT 500`, category)
  return rows.map(row => mapArticle(event, row, 'summary'))
}

export async function searchPublicArticles(event: H3Event, value: unknown) {
  const keyword = String(value || '').trim()
  if (!keyword) throw createError({ statusCode: 400, statusMessage: 'Search keyword is required' })
  const like = `%${keyword}%`
  const rows = await queryAll<ArticleRow>(getDb(event), `${articleSelect}
    WHERE a.title LIKE ? OR a.content LIKE ? OR a.content_markdown LIKE ?
    ORDER BY a.created_at DESC, a.id DESC LIMIT 50
  `, like, like, like)
  return rows.map(row => mapArticle(event, row, 'summary'))
}

export async function listFeaturedArticles(event: H3Event, value: unknown) {
  const limit = parsePositiveInt(value, 6, 20)
  const rows = await queryAll<ArticleRow>(getDb(event), `${articleSelect} ORDER BY RANDOM() LIMIT ?`, limit)
  return rows.map(row => mapArticle(event, row, 'summary'))
}

export async function getPublicArticle(event: H3Event, idValue: unknown) {
  const row = await getArticleRow(event, requireId(idValue, 'article id'))
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return mapArticle(event, row, 'detail')
}

export async function createArticle(event: H3Event, input: ArticleInput) {
  const title = String(input.title || '').trim()
  const markdown = input.contentMarkdown === null || input.contentMarkdown === undefined ? null : String(input.contentMarkdown)
  const content = String(input.content || markdown || '').trim()
  if (!title || !content) throw createError({ statusCode: 400, statusMessage: 'Title and content are required' })
  const slug = await findUniqueSlug(event, String(input.slug || title))
  const coverImage = input.coverImage === null || input.coverImage === undefined ? null : String(input.coverImage).trim() || null
  const coverImageAsset = await resolveAssetReference(event, coverImage, 'article_cover')
  const now = nowIso()
  const db = getDb(event)
  const statements = []
  if (coverImageAsset) statements.push(assetUpsertStatement(coverImageAsset, now))
  statements.push({
    sql: `
    INSERT INTO articles
      (title, slug, content, content_markdown, cover_image, cover_image_asset_id, category, tags, ai_summary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ${coverImageAsset ? '(SELECT id FROM image_assets WHERE public_id = ? LIMIT 1)' : 'NULL'}, ?, ?, ?, ?, ?)
  `,
    values: coverImageAsset
      ? [title, slug, content, markdown, coverImage, coverImageAsset.publicId, normalizeCategory(input.category), normalizeTags(input.tags), input.aiSummary ? String(input.aiSummary) : null, now, now]
      : [title, slug, content, markdown, coverImage, normalizeCategory(input.category), normalizeTags(input.tags), input.aiSummary ? String(input.aiSummary) : null, now, now]
  })
  await batch(db, statements)
  const id = await queryFirst<{ id: number }>(db, 'SELECT id FROM articles WHERE slug = ? LIMIT 1', slug)
  return await getAdminArticle(event, id?.id)
}

export async function updateArticle(event: H3Event, idValue: unknown, input: ArticleInput) {
  const id = requireId(idValue, 'article id')
  const current = await getArticleRow(event, id)
  if (!current) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  const fields: string[] = []
  const values: Array<string | number | null> = []
  let coverImageAsset: Awaited<ReturnType<typeof resolveAssetReference>> = null
  if (input.title !== undefined) {
    const title = String(input.title).trim()
    if (!title) throw createError({ statusCode: 400, statusMessage: 'Title is required' })
    fields.push('title = ?'); values.push(title)
  }
  if (input.slug !== undefined) {
    fields.push('slug = ?'); values.push(await findUniqueSlug(event, String(input.slug || input.title || current.title), id))
  } else if (!current.slug) {
    fields.push('slug = ?'); values.push(await findUniqueSlug(event, current.title, id))
  }
  if (input.content !== undefined) { fields.push('content = ?'); values.push(String(input.content)) }
  if (input.contentMarkdown !== undefined) {
    const markdown = input.contentMarkdown === null ? null : String(input.contentMarkdown)
    fields.push('content_markdown = ?'); values.push(markdown)
    if (input.content === undefined && markdown) { fields.push('content = ?'); values.push(markdown) }
  }
  if (input.coverImage !== undefined) {
    const coverImage = input.coverImage === null ? null : String(input.coverImage).trim() || null
    coverImageAsset = await resolveAssetReference(event, coverImage, 'article_cover')
    fields.push('cover_image = ?'); values.push(coverImage)
    if (coverImageAsset) {
      fields.push('cover_image_asset_id = (SELECT id FROM image_assets WHERE public_id = ? LIMIT 1)'); values.push(coverImageAsset.publicId)
    } else {
      fields.push('cover_image_asset_id = NULL')
    }
  }
  if (input.category !== undefined) { fields.push('category = ?'); values.push(normalizeCategory(input.category)) }
  if (input.tags !== undefined) { fields.push('tags = ?'); values.push(normalizeTags(input.tags)) }
  if (input.aiSummary !== undefined) { fields.push('ai_summary = ?'); values.push(input.aiSummary === null ? null : String(input.aiSummary)) }
  if (fields.length) {
    fields.push('updated_at = ?'); values.push(nowIso(), id)
    const statements = []
    if (coverImageAsset) statements.push(assetUpsertStatement(coverImageAsset, String(values[values.length - 2])))
    statements.push({ sql: `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`, values })
    await batch(getDb(event), statements)
  }
  return await getAdminArticle(event, id)
}

export async function deleteArticle(event: H3Event, idValue: unknown) {
  const id = requireId(idValue, 'article id')
  const result = await execute(getDb(event), 'DELETE FROM articles WHERE id = ?', id)
  if (!result.meta?.changes) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  return null
}

import type { H3Event } from 'h3'
import { getClientAddress, getCloudflareEnv } from '~~/server/utils/cloudflare'
import { batch, execute, getDb, nowIso, parsePositiveInt, queryAll, queryFirst, requireId } from '~~/server/utils/d1'
import { hashIdentifier } from '~~/server/utils/edge-crypto'

type CommentRow = {
  id: number
  content: string
  author: string
  email: string | null
  website: string | null
  article_id: number
  parent_id: number | null
  likes: number
  status: string
  user_ip: string | null
  created_at: string
  updated_at: string
}

function mapComment(row: CommentRow, publicOnly = false) {
  const result = {
    id: row.id,
    content: row.content,
    author: row.author,
    articleId: row.article_id,
    parentId: row.parent_id,
    likes: row.likes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
  if (publicOnly) return result
  return { ...result, email: row.email, website: row.website, userIp: row.user_ip }
}

const select = `
  SELECT id, content, author, email, website, article_id, parent_id,
         likes, status, user_ip, created_at, updated_at
  FROM comments
`

function validateCommentInput(input: Record<string, unknown>) {
  const content = String(input.content || '').trim()
  const author = String(input.author || '').trim()
  if (!content || content.length > 10_000) throw createError({ statusCode: 400, statusMessage: 'Comment content is required and must be at most 10000 characters' })
  if (!author || author.length > 120) throw createError({ statusCode: 400, statusMessage: 'Comment author is required and must be at most 120 characters' })
  const email = input.email ? String(input.email).trim().slice(0, 320) : null
  const website = input.website ? String(input.website).trim().slice(0, 512) : null
  const articleId = requireId(input.articleId, 'article id')
  const parentId = input.parentId === null || input.parentId === undefined || input.parentId === '' ? null : requireId(input.parentId, 'parent id')
  return { content, author, email, website, articleId, parentId }
}

export async function createPublicComment(event: H3Event, input: Record<string, unknown>) {
  const values = validateCommentInput(input)
  const db = getDb(event)
  const article = await queryFirst<{ id: number }>(db, 'SELECT id FROM articles WHERE id = ? LIMIT 1', values.articleId)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  if (values.parentId) {
    const parent = await queryFirst<{ id: number; article_id: number }>(db, 'SELECT id, article_id FROM comments WHERE id = ? LIMIT 1', values.parentId)
    if (!parent || parent.article_id !== values.articleId) throw createError({ statusCode: 400, statusMessage: 'Invalid parent comment' })
  }
  const recent = await queryFirst<{ count: number }>(db, 'SELECT COUNT(*) AS count FROM comments WHERE user_ip = ? AND created_at >= ?', getClientAddress(event) || 'unknown', new Date(Date.now() - 60_000).toISOString())
  if (Number(recent?.count || 0) >= 3) throw createError({ statusCode: 429, statusMessage: 'Too many comments submitted recently' })
  const now = nowIso()
  await execute(db, `
    INSERT INTO comments (content, author, email, website, article_id, parent_id, likes, status, user_ip, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, 'pending', ?, ?, ?)
  `, values.content, values.author, values.email, values.website, values.articleId, values.parentId, getClientAddress(event) || 'unknown', now, now)
  const row = await queryFirst<CommentRow>(db, `${select} WHERE article_id = ? ORDER BY id DESC LIMIT 1`, values.articleId)
  if (!row) throw createError({ statusCode: 500, statusMessage: 'Comment was not persisted' })
  return mapComment(row, true)
}

export async function listPublicComments(event: H3Event, articleIdValue: unknown) {
  const articleId = requireId(articleIdValue, 'article id')
  const limit = parsePositiveInt('50', 50, 100)
  const rows = await queryAll<CommentRow>(getDb(event), `${select} WHERE article_id = ? AND status = 'approved' ORDER BY created_at ASC, id ASC LIMIT ?`, articleId, limit)
  return rows.map(row => mapComment(row, true))
}

export async function listAdminComments(event: H3Event, pendingOnly = false) {
  const rows = await queryAll<CommentRow>(getDb(event), `${select} ${pendingOnly ? "WHERE status = 'pending'" : ''} ORDER BY created_at DESC, id DESC LIMIT 500`)
  return rows.map(row => mapComment(row))
}

export async function updateCommentStatus(event: H3Event, idValue: unknown, input: Record<string, unknown>) {
  const id = requireId(idValue, 'comment id')
  const status = String(input.status || '').trim().toLowerCase()
  if (!['pending', 'approved', 'rejected'].includes(status)) throw createError({ statusCode: 400, statusMessage: 'Invalid comment status' })
  const result = await execute(getDb(event), 'UPDATE comments SET status = ?, updated_at = ? WHERE id = ?', status, nowIso(), id)
  if (!result.meta?.changes) throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  const row = await queryFirst<CommentRow>(getDb(event), `${select} WHERE id = ? LIMIT 1`, id)
  return row ? mapComment(row) : null
}

export async function deleteComment(event: H3Event, idValue: unknown) {
  const id = requireId(idValue, 'comment id')
  const result = await execute(getDb(event), 'DELETE FROM comments WHERE id = ?', id)
  if (!result.meta?.changes) throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  return null
}

export async function likeComment(event: H3Event, idValue: unknown) {
  const id = requireId(idValue, 'comment id')
  const db = getDb(event)
  const comment = await queryFirst<CommentRow>(db, `${select} WHERE id = ? LIMIT 1`, id)
  if (!comment) throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  const pepper = getCloudflareEnv(event).SESSION_PEPPER?.trim()
  if (!pepper) throw createError({ statusCode: 503, statusMessage: 'Session secret is not configured' })
  const identifier = await hashIdentifier(`${getClientAddress(event) || 'unknown'}:${getHeader(event, 'user-agent') || ''}`, pepper)
  const now = nowIso()
  await batch(db, [
    {
      sql: `INSERT OR IGNORE INTO likes (article_id, user_identifier, type, target_id, created_at)
            VALUES (?, ?, 'comment', ?, ?)`,
      values: [comment.article_id, identifier, id, now]
    },
    {
      sql: `UPDATE comments SET likes = likes + 1, updated_at = ?
            WHERE id = ? AND EXISTS (SELECT 1 FROM likes WHERE article_id = ? AND user_identifier = ? AND type = 'comment' AND target_id = ? AND created_at = ?)`,
      values: [now, id, comment.article_id, identifier, id, now]
    }
  ])
  const updated = await queryFirst<CommentRow>(db, `${select} WHERE id = ? LIMIT 1`, id)
  return updated ? mapComment(updated, true) : null
}

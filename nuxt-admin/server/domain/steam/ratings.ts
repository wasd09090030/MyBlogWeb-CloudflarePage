import type { H3Event } from 'h3'
import { batch, getDb, nowIso, queryAll, queryFirst, type D1StatementInput } from '~~/server/utils/d1'

/**
 * 「我的评分」：Steam 接口拿不到个人主观评分，所以单独落一张表。
 * 分数 1~10、0.5 档；短评一句话；顺序由 position 决定（后台可拖拽）。
 */

export const RATING_MIN = 1
export const RATING_MAX = 10
export const RATING_COMMENT_MAX = 60
export const RATING_MAX_ITEMS = 60

export type RatingEntry = {
  appid: number
  score: number
  comment: string | null
}

export type AdminRating = RatingEntry & {
  name: string
  headerUrl: string | null
  minutesTotal: number
}

export type RatingLibraryItem = {
  appid: number
  name: string
  headerUrl: string | null
  minutesTotal: number
}

export class RatingError extends Error {
  field: string
  constructor(field: string, message: string) {
    super(message)
    this.name = 'RatingError'
    this.field = field
  }
}

function clampScore(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new RatingError('score', '分数必须是数字')
  const rounded = Math.round(parsed * 2) / 2
  if (rounded < RATING_MIN || rounded > RATING_MAX) {
    throw new RatingError('score', `分数需在 ${RATING_MIN} 到 ${RATING_MAX} 之间`)
  }
  return rounded
}

function normalizeComment(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (!text) return null
  if (text.length > RATING_COMMENT_MAX) {
    throw new RatingError('comment', `短评最多 ${RATING_COMMENT_MAX} 个字`)
  }
  return text
}

/** 校验整张评分表；位置由数组顺序推导，批量写入保证事务性。 */
export function normalizeRatingList(input: unknown): RatingEntry[] {
  if (!Array.isArray(input)) throw new RatingError('ratings', '评分列表必须是数组')
  if (input.length > RATING_MAX_ITEMS) throw new RatingError('ratings', `最多只能保存 ${RATING_MAX_ITEMS} 条评分`)
  const seen = new Set<number>()
  return input.map((item, index) => {
    const raw = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const appid = Number(raw.appid)
    if (!Number.isSafeInteger(appid) || appid <= 0) {
      throw new RatingError(`ratings[${index}].appid`, '缺少有效的 appid')
    }
    if (seen.has(appid)) throw new RatingError(`ratings[${index}].appid`, `重复评分：${appid}`)
    seen.add(appid)
    return {
      appid,
      score: clampScore(raw.score),
      comment: normalizeComment(raw.comment)
    }
  })
}

export async function listRatings(event: H3Event): Promise<AdminRating[]> {
  const rows = await queryAll<Record<string, unknown>>(
    getDb(event),
    `SELECT r.appid, r.score, r.comment, g.name, g.header_url, g.minutes_total
       FROM steam_ratings r
       JOIN steam_games g ON g.appid = r.appid
      ORDER BY r.position ASC`
  )
  return rows.map(row => ({
    appid: Number(row.appid),
    score: Number(row.score),
    comment: (row.comment as string | null) ?? null,
    name: String(row.name ?? ''),
    headerUrl: (row.header_url as string | null) ?? null,
    minutesTotal: Number(row.minutes_total ?? 0)
  }))
}

/** 后台选游戏用：库里所有可见游戏，只有前端搜索需要的字段。 */
export async function listRatingLibrary(event: H3Event): Promise<RatingLibraryItem[]> {
  const rows = await queryAll<Record<string, unknown>>(
    getDb(event),
    `SELECT appid, name, header_url, minutes_total
       FROM steam_games
      WHERE is_visible = 1
      ORDER BY minutes_total DESC`
  )
  return rows.map(row => ({
    appid: Number(row.appid),
    name: String(row.name ?? ''),
    headerUrl: (row.header_url as string | null) ?? null,
    minutesTotal: Number(row.minutes_total ?? 0)
  }))
}

export async function saveRatings(event: H3Event, input: { ratings?: unknown }): Promise<{ ratings: AdminRating[] }> {
  const db = getDb(event)
  let normalized: RatingEntry[]
  try {
    normalized = normalizeRatingList(input.ratings)
  } catch (error) {
    if (error instanceof RatingError) {
      throw createError({ statusCode: 400, statusMessage: error.message, data: { field: error.field } })
    }
    throw error
  }

  if (normalized.length) {
    const placeholders = normalized.map(() => '?').join(', ')
    const known = await queryAll<{ appid: number }>(
      db,
      `SELECT appid FROM steam_games WHERE is_visible = 1 AND appid IN (${placeholders})`,
      ...normalized.map(item => item.appid)
    )
    const knownIds = new Set(known.map(row => Number(row.appid)))
    const missing = normalized.find(item => !knownIds.has(item.appid))
    if (missing) {
      throw createError({ statusCode: 400, statusMessage: `库里找不到 appid ${missing.appid}（可能已隐藏或下架）` })
    }
  }

  const now = nowIso()
  const statements: D1StatementInput[] = [{ sql: 'DELETE FROM steam_ratings', values: [] }]
  normalized.forEach((entry, index) => {
    statements.push({
      sql: 'INSERT INTO steam_ratings (appid, score, comment, position, updated_at) VALUES (?, ?, ?, ?, ?)',
      values: [entry.appid, entry.score, entry.comment, index + 1, now]
    })
  })
  await batch(db, statements)
  return { ratings: await listRatings(event) }
}

/** 公开投影：favorite 只关心自己那一款有没有分。 */
export async function ratingForAppid(event: H3Event, appid: number): Promise<{ score: number, comment: string | null } | null> {
  const row = await queryFirst<{ score: number, comment: string | null }>(
    getDb(event),
    'SELECT score, comment FROM steam_ratings WHERE appid = ?',
    appid
  )
  if (!row) return null
  return { score: Number(row.score), comment: (row.comment as string | null) ?? null }
}

import type { H3Event } from 'h3'
import {
  defaultShowcaseEntries,
  normalizeShowcaseList,
  parseShowcaseConfig,
  STEAM_SHOWCASES,
  SteamShowcaseError,
  type NormalizedShowcase,
  type SteamShowcaseEntry,
  type SteamShowcaseRow,
  type SteamShowcaseType
} from '~~/shared/steam-showcases'
import { batch, getDb, nowIso, queryAll, queryFirst, type D1StatementInput } from '~~/server/utils/d1'

export type PublicGame = {
  appid: number
  name: string
  headerUrl: string | null
  minutesTotal: number
  minutes2Weeks: number
  lastPlayedAt: string | null
  achievementsUnlocked: number | null
  achievementsTotal: number | null
}

export type PublicAchievement = {
  appid: number
  game: string
  apiName: string
  displayName: string
  description: string | null
  percent: number | null
  unlockedAt: string | null
  iconUrl: string | null
}

export type PublicRating = {
  score: number
  comment: string | null
}

export type PublicWishlistItem = {
  appid: number
  name: string
  headerUrl: string | null
  addedAt: string
  daysWaiting: number
}

export type ComposedShowcase = {
  type: SteamShowcaseType
  label: string
  span: number
  config: Record<string, unknown>
  empty: boolean
  data: unknown
}

function daysSince(value: string | null): number {
  if (!value) return 0
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 0
  return Math.max(0, Math.round((Date.now() - timestamp) / 86_400_000))
}

function toPublicGame(row: Record<string, unknown>): PublicGame {
  return {
    appid: Number(row.appid),
    name: String(row.name ?? ''),
    headerUrl: (row.header_url as string | null) ?? null,
    minutesTotal: Number(row.minutes_total ?? 0),
    minutes2Weeks: Number(row.minutes_2weeks ?? 0),
    lastPlayedAt: (row.last_played_at as string | null) ?? null,
    achievementsUnlocked: row.achievements_unlocked === null || row.achievements_unlocked === undefined ? null : Number(row.achievements_unlocked),
    achievementsTotal: row.achievements_total === null || row.achievements_total === undefined ? null : Number(row.achievements_total)
  }
}

const GAME_COLUMNS = 'appid, name, header_url, minutes_total, minutes_2weeks, last_played_at, achievements_unlocked, achievements_total'

export async function listShowcases(event: H3Event): Promise<SteamShowcaseEntry[]> {
  const db = getDb(event)
  const rows = await queryAll<SteamShowcaseRow>(
    db,
    'SELECT id, type, position, visible, config FROM steam_showcases ORDER BY position ASC'
  )
  return rows
    .filter(row => row.type in STEAM_SHOWCASES)
    .map(row => ({
      type: row.type as SteamShowcaseType,
      position: row.position,
      visible: row.visible === 1,
      config: parseShowcaseConfig(safeJson(row.config))
    }))
}

function safeJson(value: string | null): unknown {
  if (!value) return {}
  try { return JSON.parse(value) } catch { return {} }
}

export type SaveResult = { showcases: SteamShowcaseEntry[] }

/**
 * Replaces the whole ordered list in one D1 batch (a batch is transactional).
 * `updatedAt` is the newest row timestamp the editor saw; a mismatch means another
 * session saved first, so the write is rejected with 409.
 */
export async function saveShowcases(event: H3Event, input: { showcases?: unknown, updatedAt?: unknown }): Promise<SaveResult> {
  const db = getDb(event)
  let normalized: NormalizedShowcase[]
  try {
    normalized = normalizeShowcaseList(input.showcases)
  } catch (error) {
    if (error instanceof SteamShowcaseError) {
      throw createError({ statusCode: 400, statusMessage: error.message, data: { field: error.field } })
    }
    throw error
  }

  const latest = await queryFirst<{ updated_at: string | null }>(db, 'SELECT MAX(updated_at) AS updated_at FROM steam_showcases')
  const provided = typeof input.updatedAt === 'string' ? input.updatedAt : null
  if (provided && latest?.updated_at && provided !== latest.updated_at) {
    throw createError({ statusCode: 409, statusMessage: '展柜配置已被另一个会话修改，请刷新后重试' })
  }

  const now = nowIso()
  const statements: D1StatementInput[] = [{ sql: 'DELETE FROM steam_showcases', values: [] }]
  normalized.forEach((entry, index) => {
    statements.push({
      sql: 'INSERT INTO steam_showcases (type, position, visible, config, updated_at) VALUES (?, ?, ?, ?, ?)',
      values: [entry.type, index + 1, entry.visible ? 1 : 0, JSON.stringify(entry.config), now]
    })
  })
  await batch(db, statements)
  return { showcases: await listShowcases(event) }
}

async function favoriteData(event: H3Event, appid: number | undefined) {
  const db = getDb(event)
  const row = appid
    ? await queryFirst<Record<string, unknown>>(db, `SELECT ${GAME_COLUMNS} FROM steam_games WHERE appid = ? AND is_visible = 1`, appid)
    : await queryFirst<Record<string, unknown>>(db, `SELECT ${GAME_COLUMNS} FROM steam_games WHERE is_visible = 1 ORDER BY minutes_total DESC LIMIT 1`)
  if (!row) return null
  const game = toPublicGame(row)
  const rating = await queryFirst<{ score: number, comment: string | null }>(
    db,
    'SELECT score, comment FROM steam_ratings WHERE appid = ?',
    game.appid
  )
  return {
    ...game,
    rating: rating ? { score: Number(rating.score), comment: (rating.comment as string | null) ?? null } : null
  }
}

async function collectorData(event: H3Event) {
  const db = getDb(event)
  const totals = await queryFirst<{ games: number, minutes: number, perfect: number }>(
    db,
    `SELECT COUNT(*) AS games,
            COALESCE(SUM(minutes_total), 0) AS minutes,
            COALESCE(SUM(CASE WHEN achievements_total > 0 AND achievements_unlocked = achievements_total THEN 1 ELSE 0 END), 0) AS perfect
       FROM steam_games WHERE is_visible = 1`
  )
  const recent = await queryAll<Record<string, unknown>>(
    db,
    `SELECT ${GAME_COLUMNS} FROM steam_games WHERE is_visible = 1 ORDER BY COALESCE(last_played_at, '') DESC LIMIT 4`
  )
  const games = Number(totals?.games ?? 0)
  const minutes = Number(totals?.minutes ?? 0)
  return {
    gameCount: games,
    totalMinutes: minutes,
    averageMinutes: games > 0 ? Math.round(minutes / games) : 0,
    perfectCount: Number(totals?.perfect ?? 0),
    recent: recent.map(toPublicGame)
  }
}

async function recentData(event: H3Event, limit: number) {
  const db = getDb(event)
  const rows = await queryAll<Record<string, unknown>>(
    db,
    `SELECT ${GAME_COLUMNS} FROM steam_games WHERE is_visible = 1 AND minutes_2weeks > 0
      ORDER BY minutes_2weeks DESC LIMIT ?`,
    limit
  )
  return rows.map(toPublicGame)
}

const RATING_BUCKETS = [
  { key: 'great', label: '9–10' },
  { key: 'good', label: '8–9' },
  { key: 'fair', label: '7–8' },
  { key: 'meh', label: '< 7' }
] as const

type RatingBucketKey = typeof RATING_BUCKETS[number]['key']

function bucketOf(score: number): RatingBucketKey {
  if (score >= 9) return 'great'
  if (score >= 8) return 'good'
  if (score >= 7) return 'fair'
  return 'meh'
}

/**
 * 评分展柜：列表受 limit 限制，但平均分与分布按全部已评游戏统计，
 * 这样调小列表也不会让「平均 8.9」跟着变。
 */
async function ratingData(event: H3Event, limit: number) {
  const db = getDb(event)
  const rows = await queryAll<Record<string, unknown>>(
    db,
    `SELECT g.appid, g.name, g.header_url, g.minutes_total, g.minutes_2weeks, g.last_played_at,
            g.achievements_unlocked, g.achievements_total, r.score, r.comment
       FROM steam_ratings r
       JOIN steam_games g ON g.appid = r.appid
      WHERE g.is_visible = 1
      ORDER BY r.position ASC`
  )
  if (!rows.length) return null

  const rated = rows.map(row => ({
    ...toPublicGame(row),
    score: Number(row.score),
    comment: (row.comment as string | null) ?? null
  }))

  const total = rated.length
  const average = Math.round((rated.reduce((sum, item) => sum + item.score, 0) / total) * 10) / 10
  const best = rated.reduce((top, item) => (item.score > top.score ? item : top), rated[0]!)
  const distribution = RATING_BUCKETS.map(bucket => ({
    key: bucket.key,
    label: bucket.label,
    count: rated.filter(item => bucketOf(item.score) === bucket.key).length
  }))
  const peakCount = distribution.reduce((max, bucket) => Math.max(max, bucket.count), 0)

  return {
    items: rated.slice(0, Math.max(1, limit)),
    total,
    average,
    best: { name: best.name, score: best.score },
    distribution,
    peakCount
  }
}

async function topPlaytimeData(event: H3Event, limit: number, sort: 'total' | 'recent') {  const db = getDb(event)
  const order = sort === 'recent' ? 'minutes_2weeks DESC, minutes_total DESC' : 'minutes_total DESC'
  const rows = await queryAll<Record<string, unknown>>(
    db,
    `SELECT ${GAME_COLUMNS} FROM steam_games WHERE is_visible = 1 AND minutes_total > 0 ORDER BY ${order} LIMIT ?`,
    limit
  )
  const total = Number(
    (await queryFirst<{ minutes: number }>(db, 'SELECT COALESCE(SUM(minutes_total), 0) AS minutes FROM steam_games WHERE is_visible = 1'))?.minutes ?? 0
  )
  const games = rows.map(toPublicGame)
  return {
    games,
    totalMinutes: total,
    share: (game: PublicGame) => (total > 0 ? game.minutesTotal / total : 0)
  }
}

async function completionistData(event: H3Event, limit: number) {
  const db = getDb(event)
  const rows = await queryAll<Record<string, unknown>>(
    db,
    `SELECT ${GAME_COLUMNS} FROM steam_games
      WHERE is_visible = 1 AND achievements_total > 0 AND achievements_unlocked = achievements_total
      ORDER BY minutes_total DESC LIMIT ?`,
    limit
  )
  return rows.map(toPublicGame)
}

async function rarestAchievementData(event: H3Event, limit: number) {
  const db = getDb(event)
  const rows = await queryAll<Record<string, unknown>>(
    db,
    `SELECT a.appid, a.api_name, a.display_name, a.description, a.global_percent, a.unlocked_at, a.icon_url, g.name AS game
       FROM steam_achievements a
       JOIN steam_games g ON g.appid = a.appid
      WHERE a.achieved = 1 AND a.global_percent IS NOT NULL AND g.is_visible = 1
      ORDER BY a.global_percent ASC LIMIT ?`,
    limit
  )
  return rows.map<PublicAchievement>(row => ({
    appid: Number(row.appid),
    game: String(row.game ?? ''),
    apiName: String(row.api_name ?? ''),
    displayName: String(row.display_name ?? row.api_name ?? ''),
    description: (row.description as string | null) ?? null,
    percent: row.global_percent === null || row.global_percent === undefined ? null : Number(row.global_percent),
    unlockedAt: (row.unlocked_at as string | null) ?? null,
    iconUrl: (row.icon_url as string | null) ?? null
  }))
}

async function wishlistData(event: H3Event, limit: number) {
  const db = getDb(event)
  const rows = await queryAll<Record<string, unknown>>(
    db,
    `SELECT appid, name, header_url, date_added FROM steam_wishlist ORDER BY position ASC LIMIT ?`,
    limit
  )
  return rows
    .filter(row => row.name)
    .map<PublicWishlistItem>(row => {
      const addedAt = row.date_added ? new Date(Number(row.date_added) * 1000).toISOString() : nowIso()
      return {
        appid: Number(row.appid),
        name: String(row.name),
        headerUrl: (row.header_url as string | null) ?? null,
        addedAt,
        daysWaiting: daysSince(addedAt)
      }
    })
}

const DEFAULT_LIMITS: Record<string, number> = { rating: 6, recent: 4, 'top-playtime': 6, completionist: 5, 'rarest-achievement': 3, wishlist: 8 }

/**
 * Builds the public projection: order comes from D1, data is resolved per type and
 * every module carries `empty` so the page never renders an empty frame.
 */
export async function composeShowcases(event: H3Event, onlyVisible = true): Promise<ComposedShowcase[]> {
  const entries = await listShowcases(event)
  const result: ComposedShowcase[] = []
  for (const entry of entries) {
    if (onlyVisible && !entry.visible) continue
    const definition = STEAM_SHOWCASES[entry.type]
    const limit = Math.max(1, Number(entry.config.limit ?? DEFAULT_LIMITS[entry.type] ?? 6))
    let data: unknown = null
    switch (entry.type) {
      case 'favorite':
        data = await favoriteData(event, entry.config.appid)
        break
      case 'rating':
        data = await ratingData(event, limit)
        break
      case 'collector':
        data = await collectorData(event)
        break
      case 'recent':
        data = await recentData(event, limit)
        break
      case 'top-playtime': {
        const payload = await topPlaytimeData(event, limit, entry.config.sort === 'recent' ? 'recent' : 'total')
        data = { totalMinutes: payload.totalMinutes, games: payload.games.map(game => ({ ...game, share: payload.share(game) })) }
        break
      }
      case 'completionist':
        data = await completionistData(event, limit)
        break
      case 'rarest-achievement':
        data = await rarestAchievementData(event, limit)
        break
      case 'wishlist':
        data = await wishlistData(event, limit)
        break
      default:
        data = null
    }
    const empty = Array.isArray(data) ? data.length === 0 : data === null
    result.push({
      type: entry.type,
      label: definition.label,
      span: definition.span,
      config: entry.config as Record<string, unknown>,
      empty,
      data
    })
  }
  return result
}

export async function resetShowcases(event: H3Event) {
  const db = getDb(event)
  const entries = defaultShowcaseEntries()
  const now = nowIso()
  const statements: D1StatementInput[] = [{ sql: 'DELETE FROM steam_showcases', values: [] }]
  entries.forEach((entry, index) => {
    statements.push({
      sql: 'INSERT INTO steam_showcases (type, position, visible, config, updated_at) VALUES (?, ?, ?, ?, ?)',
      values: [entry.type, index + 1, entry.visible ? 1 : 0, JSON.stringify(entry.config), now]
    })
  })
  await batch(db, statements)
  return { showcases: await listShowcases(event) }
}

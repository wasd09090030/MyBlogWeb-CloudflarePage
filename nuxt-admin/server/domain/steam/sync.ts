import type { H3Event } from 'h3'
import { batch, execute, getDb, nowIso, queryAll, queryFirst, type D1StatementInput } from '~~/server/utils/d1'
import { createSteamClient, SteamApiError, type SteamClient, type SteamOwnedGame } from '~~/server/utils/steam-client'
import { resolveSteamCredentials } from './credentials'

/** Free plan allows 50 subrequests per invocation; keep a margin for D1 and retries. */
const REQUEST_BUDGET = 40
const SYNC_LOCK_MS = 10 * 60 * 1000
/**
 * Cron 每天 05:00（上海）跑一次。这里留一天多的余量：
 * 只有「上一轮彻底没跑」才会把快照判定为过期，避免白天一直显示「快照过期」。
 */
const SNAPSHOT_FRESH_MS = 26 * 60 * 60 * 1000
const MAX_ACHIEVEMENT_GAMES = 12
const MAX_STORE_LOOKUPS = 6
const MAX_WISHLIST_LOOKUPS = 4

export type SteamSyncTrigger = 'cron' | 'manual'

export type SteamSyncResult = {
  status: 'success' | 'partial' | 'failed' | 'skipped' | 'privacy_blocked' | 'unconfigured'
  runId: number | null
  apiCalls: number
  gamesUpserted: number
  achievementsUpserted: number
  message?: string
}

export type SteamEnvironment = { steamId: string, apiKey: string, source: 'db' | 'env' }


function headerImage(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`
}

function iconImage(appid: number, icon: string | undefined): string | null {
  return icon ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${icon}.jpg` : null
}

function toIso(seconds: number | undefined | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000).toISOString()
}

async function chunkedBatch(db: D1Database, statements: D1StatementInput[], size = 50) {
  for (let index = 0; index < statements.length; index += size) {
    await batch(db, statements.slice(index, index + size))
  }
}

/** 把 id 列表按 50 个一组切开，避开 D1 单条语句 100 个绑定参数的上限。 */
function chunkIds(ids: number[], size = 50): number[][] {
  const groups: number[][] = []
  for (let index = 0; index < ids.length; index += size) groups.push(ids.slice(index, index + size))
  return groups
}

async function readState(db: D1Database, key: string): Promise<string | null> {
  const row = await queryFirst<{ value: string }>(db, 'SELECT value FROM steam_sync_state WHERE key = ?', key)
  return row?.value ?? null
}

async function writeState(db: D1Database, key: string, value: string) {
  await execute(
    db,
    'INSERT INTO steam_sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    key,
    value,
    nowIso()
  )
}

async function startRun(db: D1Database, trigger: SteamSyncTrigger): Promise<number> {
  const result = await execute(
    db,
    'INSERT INTO steam_sync_runs (started_at, status, trigger) VALUES (?, ?, ?)',
    nowIso(),
    'running',
    trigger
  )
  return Number(result.meta.last_row_id ?? 0)
}

async function finishRun(
  db: D1Database,
  runId: number,
  status: SteamSyncResult['status'],
  client: SteamClient,
  counts: { gamesUpserted: number, achievementsUpserted: number },
  errorCode: string | null = null,
  errorMessage: string | null = null
) {
  await execute(
    db,
    `UPDATE steam_sync_runs
        SET finished_at = ?, status = ?, api_calls = ?, games_upserted = ?, achievements_upserted = ?, error_code = ?, error_message = ?
      WHERE id = ?`,
    nowIso(),
    status,
    client.calls,
    counts.gamesUpserted,
    counts.achievementsUpserted,
    errorCode,
    errorMessage ? errorMessage.slice(0, 500) : null,
    runId
  )
}

type GameSnapshot = {
  name: string
  headerUrl: string
  iconUrl: string | null
  minutesTotal: number
  minutes2Weeks: number
  minutesDeck: number
  lastPlayedAt: string | null
}

type GameRow = {
  appid: number
  name: string
  header_url: string | null
  icon_url: string | null
  minutes_total: number
  minutes_2weeks: number
  minutes_deck: number
  last_played_at: string | null
  is_visible: number
}

function gameSnapshot(game: SteamOwnedGame): GameSnapshot {
  return {
    name: game.name?.trim() || `App ${game.appid}`,
    headerUrl: headerImage(game.appid),
    iconUrl: iconImage(game.appid, game.img_icon_url),
    minutesTotal: Math.max(0, game.playtime_forever ?? 0),
    minutes2Weeks: Math.max(0, game.playtime_2weeks ?? 0),
    minutesDeck: Math.max(0, game.playtime_deck_forever ?? 0),
    lastPlayedAt: toIso(game.rtime_last_played)
  }
}

/**
 * D1 按写入的行计费，带索引的列还要再算一次；
 * 所以先和库里的快照比对，只有内容真的变了才发 upsert。
 */
function gameChanged(prev: GameRow | undefined, next: GameSnapshot): boolean {
  if (!prev) return true
  return prev.name !== next.name
    || (prev.header_url ?? null) !== next.headerUrl
    || (prev.icon_url ?? null) !== next.iconUrl
    || Number(prev.minutes_total) !== next.minutesTotal
    || Number(prev.minutes_2weeks) !== next.minutes2Weeks
    || Number(prev.minutes_deck) !== next.minutesDeck
    || (prev.last_played_at ?? null) !== next.lastPlayedAt
    || Number(prev.is_visible) !== 1
}

function gameStatement(game: SteamOwnedGame, now: string): D1StatementInput {
  const snapshot = gameSnapshot(game)
  return {
    sql: `INSERT INTO steam_games (
            appid, name, header_url, icon_url, minutes_total, minutes_2weeks, minutes_deck,
            last_played_at, is_visible, first_seen_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
          ON CONFLICT(appid) DO UPDATE SET
            name = excluded.name,
            header_url = excluded.header_url,
            icon_url = excluded.icon_url,
            minutes_total = excluded.minutes_total,
            minutes_2weeks = excluded.minutes_2weeks,
            minutes_deck = excluded.minutes_deck,
            last_played_at = excluded.last_played_at,
            is_visible = 1,
            updated_at = excluded.updated_at`,
    values: [
      game.appid,
      snapshot.name,
      snapshot.headerUrl,
      snapshot.iconUrl,
      snapshot.minutesTotal,
      snapshot.minutes2Weeks,
      snapshot.minutesDeck,
      snapshot.lastPlayedAt,
      now,
      now
    ]
  }
}

type AchievementRow = {
  api_name: string
  display_name: string | null
  description: string | null
  icon_url: string | null
  hidden: number
  global_percent: number | null
  achieved: number
  unlocked_at: string | null
}

/**
 * 候选游戏：一半给「近两周在玩」的（页面最常展示，保证每天都是新的），
 * 一半按陈旧度轮转整个库。定时任务改成每天一次后，这样比单纯按陈旧度排序更贴近观感。
 */
async function selectAchievementCandidates(db: D1Database): Promise<Array<{ appid: number, name: string, syncedAt: string | null, hasSchema: number }>> {
  const columns = `SELECT g.appid, g.name, g.achievement_synced_at AS syncedAt,
            (SELECT COUNT(*) FROM steam_achievements a WHERE a.appid = g.appid AND a.display_name IS NOT NULL) AS hasSchema
       FROM steam_games g
      WHERE g.is_visible = 1
        AND g.minutes_total > 0`
  const recent = await queryAll<{ appid: number, name: string, syncedAt: string | null, hasSchema: number }>(
    db,
    `${columns}
        AND g.minutes_2weeks > 0
      ORDER BY COALESCE(g.achievement_synced_at, '') ASC, g.minutes_2weeks DESC
      LIMIT ?`,
    Math.ceil(MAX_ACHIEVEMENT_GAMES / 2)
  )
  const rotating = await queryAll<{ appid: number, name: string, syncedAt: string | null, hasSchema: number }>(
    db,
    `${columns}
        AND g.minutes_2weeks = 0
      ORDER BY (g.achievement_synced_at IS NULL) DESC,
               COALESCE(g.achievement_synced_at, '') ASC,
               g.minutes_total DESC
      LIMIT ?`,
    MAX_ACHIEVEMENT_GAMES - recent.length
  )
  const seen = new Set<number>()
  return [...recent, ...rotating].filter(candidate => {
    if (seen.has(candidate.appid)) return false
    seen.add(candidate.appid)
    return true
  })
}

export async function runSteamSync(event: H3Event, trigger: SteamSyncTrigger = 'cron'): Promise<SteamSyncResult> {
  const db = getDb(event)
  const credentials = await resolveSteamCredentials(event)
  if (!credentials) {
    return { status: 'unconfigured', runId: null, apiCalls: 0, gamesUpserted: 0, achievementsUpserted: 0, message: 'STEAM_ID / STEAM_API_KEY is not configured' }
  }

  const lock = await readState(db, 'sync_lock')
  if (lock && Date.now() - Date.parse(lock) < SYNC_LOCK_MS) {
    return { status: 'skipped', runId: null, apiCalls: 0, gamesUpserted: 0, achievementsUpserted: 0, message: 'Another sync is already running' }
  }
  await writeState(db, 'sync_lock', nowIso())

  const client = createSteamClient({ apiKey: credentials.apiKey, budget: REQUEST_BUDGET })
  const counts = { gamesUpserted: 0, achievementsUpserted: 0 }
  const runId = await startRun(db, trigger)

  try {
    const now = nowIso()
    const summary = await client.getPlayerSummaries(credentials.steamId)
    if (!summary) {
      await finishRun(db, runId, 'failed', client, counts, 'player_not_found', 'Steam did not return a profile for the configured SteamID')
      return { status: 'failed', runId, apiCalls: client.calls, ...counts, message: 'Steam profile not found' }
    }

    const owned = await client.getOwnedGames(credentials.steamId)
    if (owned === null) {
      // Privacy guard: an empty body is not a valid snapshot, keep the previous library.
      await execute(db, `INSERT INTO steam_profile (id, steamid, persona_name, avatar_url, profile_url, level, visibility, synced_at, updated_at)
        VALUES (1, ?, ?, ?, ?, NULL, 'privacy_blocked', ?, ?)
        ON CONFLICT(id) DO UPDATE SET visibility = 'privacy_blocked', persona_name = excluded.persona_name,
          avatar_url = excluded.avatar_url, profile_url = excluded.profile_url, synced_at = excluded.synced_at, updated_at = excluded.updated_at`,
      credentials.steamId, summary.personaname, summary.avatarfull ?? summary.avatarmedium ?? null, summary.profileurl ?? null, now, now)
      await finishRun(db, runId, 'privacy_blocked', client, counts, 'privacy_blocked', 'Game details are private; library left untouched')
      return { status: 'privacy_blocked', runId, apiCalls: client.calls, ...counts, message: 'Steam 游戏详情不可见' }
    }

    const level = await client.getSteamLevel(credentials.steamId).catch(() => null)

    // --- 游戏库：只写变化的行 ---------------------------------------------
    const existingGames = await queryAll<GameRow>(
      db,
      `SELECT appid, name, header_url, icon_url, minutes_total, minutes_2weeks, minutes_deck, last_played_at, is_visible
         FROM steam_games`
    )
    const previousGames = new Map(existingGames.map(row => [Number(row.appid), row]))
    const seenAppids = new Set<number>()
    const changedGames: D1StatementInput[] = []
    for (const game of owned) {
      seenAppids.add(game.appid)
      if (gameChanged(previousGames.get(game.appid), gameSnapshot(game))) {
        changedGames.push(gameStatement(game, now))
      }
    }
    if (changedGames.length > 0) {
      await chunkedBatch(db, changedGames)
      counts.gamesUpserted = changedGames.length
    }

    if (owned.length > 0) {
      // 本轮没见到的游戏改成隐藏。按 id 集合更新，不用 updated_at 做标记：
      // 增量写之后未变化的行不会再刷新 updated_at，用时间戳会误伤。
      const missingIds = existingGames
        .filter(row => Number(row.is_visible) === 1 && !seenAppids.has(Number(row.appid)))
        .map(row => Number(row.appid))
      for (const group of chunkIds(missingIds)) {
        await execute(
          db,
          `UPDATE steam_games SET is_visible = 0, updated_at = ? WHERE appid IN (${group.map(() => '?').join(', ')})`,
          now,
          ...group
        )
      }
      counts.gamesUpserted += missingIds.length
    }

    const totalMinutes = owned.reduce((sum, game) => sum + Math.max(0, game.playtime_forever ?? 0), 0)
    const recentMinutes = owned.reduce((sum, game) => sum + Math.max(0, game.playtime_2weeks ?? 0), 0)

    await execute(
      db,
      `INSERT INTO steam_profile (id, steamid, persona_name, avatar_url, profile_url, level, game_count, total_minutes, minutes_2weeks, visibility, synced_at, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 'public', ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         steamid = excluded.steamid, persona_name = excluded.persona_name, avatar_url = excluded.avatar_url,
         profile_url = excluded.profile_url, level = excluded.level, game_count = excluded.game_count,
         total_minutes = excluded.total_minutes, minutes_2weeks = excluded.minutes_2weeks,
         visibility = 'public', synced_at = excluded.synced_at, updated_at = excluded.updated_at`,
      credentials.steamId,
      summary.personaname,
      summary.avatarfull ?? summary.avatarmedium ?? null,
      summary.profileurl ?? null,
      level,
      owned.length,
      totalMinutes,
      recentMinutes,
      now,
      now
    )

    // --- Wishlist ---------------------------------------------------------
    const wishlist = await client.getWishlist(credentials.steamId)
    if (wishlist.length > 0) {
      const sorted = [...wishlist].sort((a, b) => (a.date_added ?? 0) - (b.date_added ?? 0))
      const existingWishlist = await queryAll<{ appid: number, date_added: number | null, position: number }>(
        db,
        'SELECT appid, date_added, position FROM steam_wishlist'
      )
      const previousWishlist = new Map(existingWishlist.map(row => [Number(row.appid), row]))
      const seenWishlist = new Set<number>()
      const changedWishlist: D1StatementInput[] = []

      sorted.forEach((item, index) => {
        seenWishlist.add(item.appid)
        const prev = previousWishlist.get(item.appid)
        const dateAdded = item.date_added ?? null
        const unchanged = prev
          && (prev.date_added ?? null) === dateAdded
          && Number(prev.position) === index
        if (!unchanged) {
          changedWishlist.push({
            sql: `INSERT INTO steam_wishlist (appid, date_added, position, updated_at) VALUES (?, ?, ?, ?)
                  ON CONFLICT(appid) DO UPDATE SET date_added = excluded.date_added, position = excluded.position, updated_at = excluded.updated_at`,
            values: [item.appid, dateAdded, index, now]
          })
        }
      })
      if (changedWishlist.length > 0) await chunkedBatch(db, changedWishlist)

      // 不再用时间戳做「本轮没见到」的标记，改为按 id 显式删除。
      const removedWishlist = existingWishlist
        .filter(row => !seenWishlist.has(Number(row.appid)))
        .map(row => Number(row.appid))
      for (const group of chunkIds(removedWishlist)) {
        await execute(
          db,
          `DELETE FROM steam_wishlist WHERE appid IN (${group.map(() => '?').join(', ')})`,
          ...group
        )
      }

      // Resolve names lazily; the wishlist endpoint only returns appids.
      const unresolved = await queryAll<{ appid: number }>(
        db,
        'SELECT appid FROM steam_wishlist WHERE name IS NULL ORDER BY position ASC LIMIT ?',
        MAX_WISHLIST_LOOKUPS
      )
      const wishUpdates: D1StatementInput[] = []
      for (const item of unresolved) {
        if (!client.canSpend()) break
        const details = await client.getAppDetails(item.appid)
        if (!details?.name) continue
        wishUpdates.push({
          sql: 'UPDATE steam_wishlist SET name = ?, header_url = ?, resolved_at = ?, updated_at = ? WHERE appid = ?',
          values: [details.name, details.header_image ?? headerImage(item.appid), now, now, item.appid]
        })
      }
      if (wishUpdates.length > 0) await chunkedBatch(db, wishUpdates)
    }

    // --- Achievements (rotation by staleness, bounded by the request budget) ---
    const candidates = await selectAchievementCandidates(db)
    let lastAppid = Number(await readState(db, 'achievement_cursor') || '0') || 0
    for (const candidate of candidates) {
      // Two calls per game (player + schema) plus one optional rarity pass.
      if (client.remaining < 3) break
      lastAppid = candidate.appid
      const playerAchievements = await client.getPlayerAchievements(credentials.steamId, candidate.appid)
      if (!playerAchievements) {
        await execute(db, 'UPDATE steam_games SET achievement_synced_at = ? WHERE appid = ?', now, candidate.appid)
        continue
      }
      const schema = candidate.hasSchema > 0 ? null : await client.getSchemaForGame(candidate.appid)
      const rarity = candidate.hasSchema > 0 ? null : await client.getGlobalAchievementPercentages(candidate.appid)

      const schemaByName = new Map((schema ?? []).map(item => [item.name, item]))
      // 只写真正变化的成就行：已解锁状态、解锁时间、稀有度、以及首次拿到的 schema。
      const existingAchievements = await queryAll<AchievementRow>(
        db,
        `SELECT api_name, display_name, description, icon_url, hidden, global_percent, achieved, unlocked_at
           FROM steam_achievements WHERE appid = ?`,
        candidate.appid
      )
      const existingByName = new Map(existingAchievements.map(row => [String(row.api_name), row]))
      const statements: D1StatementInput[] = []

      for (const achievement of playerAchievements) {
        const meta = schemaByName.get(achievement.apiname)
        const percent = rarity?.get(achievement.apiname) ?? null
        const achieved = achievement.achieved ? 1 : 0
        const unlockedAt = toIso(achievement.unlocktime)
        const displayName = meta?.displayName || null
        const description = meta?.description || null
        const iconUrl = meta?.icon || null
        const hidden = meta ? (meta.hidden ? 1 : 0) : null

        const prev = existingByName.get(achievement.apiname)
        const changed = !prev
          || Number(prev.achieved) !== achieved
          || (prev.unlocked_at ?? null) !== unlockedAt
          || (percent !== null && (prev.global_percent === null || Number(prev.global_percent) !== percent))
          || (displayName !== null && displayName !== (prev.display_name ?? null))
          || (description !== null && description !== (prev.description ?? null))
          || (iconUrl !== null && iconUrl !== (prev.icon_url ?? null))
          || (hidden !== null && Number(prev.hidden) !== hidden)
        if (!changed) continue

        // `hidden` 是 NOT NULL：没有 schema 时插入必须给 0，但更新时不能覆盖已有值，
        // 所以这里按「本轮是否拿到 schema」切换 SET 子句。
        const hasSchema = Boolean(meta)
        statements.push({
          sql: `INSERT INTO steam_achievements (appid, api_name, display_name, description, icon_url, hidden, global_percent, achieved, unlocked_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(appid, api_name) DO UPDATE SET
                  display_name = COALESCE(excluded.display_name, steam_achievements.display_name),
                  description = COALESCE(excluded.description, steam_achievements.description),
                  icon_url = COALESCE(excluded.icon_url, steam_achievements.icon_url),
                  ${hasSchema ? 'hidden = excluded.hidden,' : ''}
                  global_percent = COALESCE(excluded.global_percent, steam_achievements.global_percent),
                  achieved = excluded.achieved,
                  unlocked_at = excluded.unlocked_at,
                  updated_at = excluded.updated_at`,
          values: [
            candidate.appid,
            achievement.apiname,
            displayName,
            description,
            iconUrl,
            hasSchema ? (meta?.hidden ? 1 : 0) : 0,
            percent,
            achieved,
            unlockedAt,
            now
          ]
        })
      }
      if (statements.length > 0) {
        await chunkedBatch(db, statements)
        counts.achievementsUpserted += statements.length
      }

      const unlocked = playerAchievements.filter(item => item.achieved).length
      await execute(
        db,
        'UPDATE steam_games SET achievements_total = ?, achievements_unlocked = ?, achievement_synced_at = ? WHERE appid = ?',
        playerAchievements.length,
        unlocked,
        now,
        candidate.appid
      )
    }
    await writeState(db, 'achievement_cursor', String(lastAppid))

    // --- Optional store metadata for covers/genres ------------------------
    const metadataTargets = await queryAll<{ appid: number }>(
      db,
      'SELECT appid FROM steam_games WHERE is_visible = 1 AND release_date IS NULL ORDER BY minutes_total DESC LIMIT ?',
      MAX_STORE_LOOKUPS
    )
    for (const target of metadataTargets) {
      if (!client.canSpend()) break
      const details = await client.getAppDetails(target.appid)
      if (!details) continue
      await execute(
        db,
        'UPDATE steam_games SET release_date = ?, genres = ?, is_free = ?, header_url = COALESCE(?, header_url) WHERE appid = ?',
        details.release_date?.date || null,
        JSON.stringify((details.genres ?? []).map(genre => genre.description).filter(Boolean)),
        details.is_free ? 1 : 0,
        details.header_image ?? null,
        target.appid
      )
    }

    await execute(
      db,
      `UPDATE steam_profile SET
         achievements_unlocked = (SELECT COALESCE(SUM(achievements_unlocked), 0) FROM steam_games WHERE is_visible = 1),
         achievements_total = (SELECT COALESCE(SUM(achievements_total), 0) FROM steam_games WHERE is_visible = 1),
         updated_at = ?
       WHERE id = 1`,
      nowIso()
    )

    const status: SteamSyncResult['status'] = client.remaining < 1 ? 'partial' : 'success'
    await finishRun(db, runId, status, client, counts)
    return { status, runId, apiCalls: client.calls, ...counts }
  } catch (error) {
    const apiError = error instanceof SteamApiError ? error : null
    await finishRun(db, runId, 'failed', client, counts, apiError?.code ?? 'unknown', apiError?.message ?? String(error))
    return {
      status: 'failed',
      runId,
      apiCalls: client.calls,
      ...counts,
      message: apiError?.message ?? 'Steam sync failed'
    }
  } finally {
    await writeState(db, 'sync_lock', '')
  }
}

export type SteamSnapshotMeta = {
  visible: boolean
  stale: boolean
  syncedAt: string | null
  status: 'ok' | 'stale' | 'privacy_blocked' | 'unconfigured' | 'empty' | 'error'
}

export async function readSnapshotMeta(event: H3Event): Promise<SteamSnapshotMeta> {
  const db = getDb(event)
  const configured = Boolean(await resolveSteamCredentials(event))
  const profile = await queryFirst<{ synced_at: string | null, visibility: string, game_count: number }>(
    db,
    'SELECT synced_at, visibility, game_count FROM steam_profile WHERE id = 1'
  )
  if (!configured) return { visible: false, stale: true, syncedAt: null, status: 'unconfigured' }
  if (!profile) return { visible: false, stale: true, syncedAt: null, status: 'empty' }
  if (profile.visibility === 'privacy_blocked') return { visible: false, stale: true, syncedAt: profile.synced_at, status: 'privacy_blocked' }
  const syncedAt = profile.synced_at
  const stale = !syncedAt || Date.now() - Date.parse(syncedAt) > SNAPSHOT_FRESH_MS
  if ((profile.game_count ?? 0) === 0) return { visible: false, stale: true, syncedAt, status: 'empty' }
  return { visible: true, stale, syncedAt, status: stale ? 'stale' : 'ok' }
}

export async function readLatestRun(event: H3Event) {
  const db = getDb(event)
  return await queryFirst<{ id: number, started_at: string, finished_at: string | null, status: string, trigger: string, api_calls: number, games_upserted: number, achievements_upserted: number, error_code: string | null, error_message: string | null }>(
    db,
    'SELECT id, started_at, finished_at, status, trigger, api_calls, games_upserted, achievements_upserted, error_code, error_message FROM steam_sync_runs ORDER BY id DESC LIMIT 1'
  )
}



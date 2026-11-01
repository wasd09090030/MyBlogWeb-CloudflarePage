import type { H3Event } from 'h3'
import { batch, execute, getDb, nowIso, queryAll, queryFirst, type D1StatementInput } from '~~/server/utils/d1'
import { createSteamClient, SteamApiError, type SteamClient, type SteamOwnedGame } from '~~/server/utils/steam-client'
import { resolveSteamCredentials } from './credentials'

/** Free plan allows 50 subrequests per invocation; keep a margin for D1 and retries. */
const REQUEST_BUDGET = 40
const SYNC_LOCK_MS = 10 * 60 * 1000
const SNAPSHOT_FRESH_MS = 60 * 60 * 1000
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

function gameStatement(game: SteamOwnedGame, now: string): D1StatementInput {
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
      game.name?.trim() || `App ${game.appid}`,
      headerImage(game.appid),
      iconImage(game.appid, game.img_icon_url),
      Math.max(0, game.playtime_forever ?? 0),
      Math.max(0, game.playtime_2weeks ?? 0),
      Math.max(0, game.playtime_deck_forever ?? 0),
      toIso(game.rtime_last_played),
      now,
      now
    ]
  }
}

/** Candidate order: never synced, then oldest sync, then most recent play, then total time. */
async function selectAchievementCandidates(db: D1Database): Promise<Array<{ appid: number, name: string, syncedAt: string | null, hasSchema: number }>> {
  return await queryAll<{ appid: number, name: string, syncedAt: string | null, hasSchema: number }>(
    db,
    `SELECT g.appid, g.name, g.achievement_synced_at AS syncedAt,
            (SELECT COUNT(*) FROM steam_achievements a WHERE a.appid = g.appid AND a.display_name IS NOT NULL) AS hasSchema
       FROM steam_games g
      WHERE g.is_visible = 1
        AND g.minutes_total > 0
      ORDER BY (g.achievement_synced_at IS NULL) DESC,
               COALESCE(g.achievement_synced_at, '') ASC,
               g.minutes_2weeks DESC,
               g.minutes_total DESC
      LIMIT ?`,
    MAX_ACHIEVEMENT_GAMES
  )
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

    const gameStatements = owned.map(game => gameStatement(game, now))
    if (gameStatements.length > 0) {
      await chunkedBatch(db, gameStatements)
      counts.gamesUpserted = gameStatements.length
      // 本轮未见到的游戏用时间戳标记隐藏：避免 NOT IN 绑定上百个参数触发 D1 参数上限。
      await execute(db, 'UPDATE steam_games SET is_visible = 0 WHERE is_visible = 1 AND updated_at < ?', now)
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
      const statements = sorted.map((item, index) => ({
        sql: `INSERT INTO steam_wishlist (appid, date_added, position, updated_at) VALUES (?, ?, ?, ?)
              ON CONFLICT(appid) DO UPDATE SET date_added = excluded.date_added, position = excluded.position, updated_at = excluded.updated_at`,
        values: [item.appid, item.date_added ?? null, index, now]
      }))
      await chunkedBatch(db, statements)
      // 同样用时间戳删除本轮已不在愿望单里的条目，避免超长 NOT IN 绑定。
      await execute(db, 'DELETE FROM steam_wishlist WHERE updated_at < ?', now)
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
      const statements: D1StatementInput[] = playerAchievements.map(achievement => {
        const meta = schemaByName.get(achievement.apiname)
        const percent = rarity?.get(achievement.apiname)
        return {
          sql: `INSERT INTO steam_achievements (appid, api_name, display_name, description, icon_url, hidden, global_percent, achieved, unlocked_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(appid, api_name) DO UPDATE SET
                  display_name = COALESCE(excluded.display_name, steam_achievements.display_name),
                  description = COALESCE(excluded.description, steam_achievements.description),
                  icon_url = COALESCE(excluded.icon_url, steam_achievements.icon_url),
                  hidden = excluded.hidden,
                  global_percent = COALESCE(excluded.global_percent, steam_achievements.global_percent),
                  achieved = excluded.achieved,
                  unlocked_at = excluded.unlocked_at,
                  updated_at = excluded.updated_at`,
          values: [
            candidate.appid,
            achievement.apiname,
            meta?.displayName || null,
            meta?.description || null,
            meta?.icon || null,
            meta?.hidden ?? 0,
            percent ?? null,
            achievement.achieved ? 1 : 0,
            toIso(achievement.unlocktime),
            now
          ]
        }
      })
      await chunkedBatch(db, statements)
      counts.achievementsUpserted += statements.length

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



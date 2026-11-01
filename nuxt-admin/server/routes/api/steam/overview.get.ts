import { composeShowcases } from '~~/server/domain/steam/showcases'
import { readSnapshotMeta } from '~~/server/domain/steam/sync'
import { getDb, queryFirst } from '~~/server/utils/d1'

type ProfileRow = {
  persona_name: string
  avatar_url: string | null
  profile_url: string | null
  level: number | null
  game_count: number
  total_minutes: number
  minutes_2weeks: number
  achievements_unlocked: number
  achievements_total: number
}

/**
 * Public read-only projection. Never exposes the SteamID, friends, locale or raw
 * upstream payloads; caching happens at the edge because the snapshot is a snapshot.
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')

  const meta = await readSnapshotMeta(event)
  const db = getDb(event)
  const row = await queryFirst<ProfileRow>(
    db,
    `SELECT persona_name, avatar_url, profile_url, level, game_count, total_minutes,
            minutes_2weeks, achievements_unlocked, achievements_total
       FROM steam_profile WHERE id = 1`
  )

  const profile = row
    ? {
        personaName: row.persona_name,
        avatarUrl: row.avatar_url,
        profileUrl: row.profile_url,
        level: row.level,
        gameCount: row.game_count,
        totalMinutes: row.total_minutes,
        minutes2Weeks: row.minutes_2weeks,
        achievementsUnlocked: row.achievements_unlocked,
        achievementsTotal: row.achievements_total
      }
    : null

  const showcases = meta.visible ? await composeShowcases(event) : []

  return {
    status: meta.status,
    syncedAt: meta.syncedAt,
    stale: meta.stale,
    profile,
    showcases,
    freshnessWindowMinutes: 60
  }
})

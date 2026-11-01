import { requireAdminSession } from '~~/server/domain/auth'
import { listShowcases } from '~~/server/domain/steam/showcases'
import { getDb, queryFirst } from '~~/server/utils/d1'
import { STEAM_SHOWCASES, STEAM_SHOWCASE_LIMIT } from '~~/shared/steam-showcases'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const showcases = await listShowcases(event)
  const latest = await queryFirst<{ updated_at: string | null }>(getDb(event), 'SELECT MAX(updated_at) AS updated_at FROM steam_showcases')
  return {
    showcases,
    updatedAt: latest?.updated_at ?? null,
    limit: STEAM_SHOWCASE_LIMIT,
    library: Object.values(STEAM_SHOWCASES)
  }
})

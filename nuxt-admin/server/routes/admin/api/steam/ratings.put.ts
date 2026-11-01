import { requireAdminSession } from '~~/server/domain/auth'
import { saveRatings } from '~~/server/domain/steam/ratings'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const body = await readBody<{ ratings?: unknown }>(event)
  return await saveRatings(event, body ?? {})
})

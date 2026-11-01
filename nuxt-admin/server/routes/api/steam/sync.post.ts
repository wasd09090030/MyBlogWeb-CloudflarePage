import { runSteamSync } from '~~/server/domain/steam/sync'
import { getCloudflareEnv } from '~~/server/utils/cloudflare'

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

/**
 * Scheduler entry point. blog-router's cron trigger calls this through the service
 * binding with the shared token, because the Nitro-generated Worker only exports fetch.
 */
export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  const expected = env.STEAM_SYNC_TOKEN?.trim() || ''
  if (!expected) {
    throw createError({ statusCode: 503, statusMessage: 'STEAM_SYNC_TOKEN is not configured' })
  }
  const provided = String(getHeader(event, 'x-steam-sync-token') || '').trim()
  if (!timingSafeEqual(provided, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid sync token' })
  }
  const result = await runSteamSync(event, 'cron')
  return result
})

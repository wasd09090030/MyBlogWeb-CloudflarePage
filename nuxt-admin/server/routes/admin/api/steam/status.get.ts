import { requireAdminSession } from '~~/server/domain/auth'
import { readCredentialState } from '~~/server/domain/steam/credentials'
import { readLatestRun, readSnapshotMeta } from '~~/server/domain/steam/sync'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const credentials = await readCredentialState(event)
  const meta = await readSnapshotMeta(event)
  const latest = await readLatestRun(event)
  return {
    configured: credentials.source !== 'none',
    credentials,
    meta,
    latestRun: latest
      ? {
          id: latest.id,
          startedAt: latest.started_at,
          finishedAt: latest.finished_at,
          status: latest.status,
          trigger: latest.trigger,
          apiCalls: latest.api_calls,
          gamesUpserted: latest.games_upserted,
          achievementsUpserted: latest.achievements_upserted,
          errorCode: latest.error_code,
          errorMessage: latest.error_message
        }
      : null
  }
})

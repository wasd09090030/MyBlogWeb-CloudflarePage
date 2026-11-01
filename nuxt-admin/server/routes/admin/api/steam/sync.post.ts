import { requireAdminSession } from '~~/server/domain/auth'
import { runSteamSync } from '~~/server/domain/steam/sync'
import { execute, getDb, nowIso, queryFirst } from '~~/server/utils/d1'
import { assertSafeMutation } from '~~/server/utils/request-security'

const MANUAL_COOLDOWN_MS = 60 * 1000

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)

  const db = getDb(event)
  const row = await queryFirst<{ value: string }>(db, 'SELECT value FROM steam_sync_state WHERE key = ?', 'manual_sync_at')
  const last = row?.value ? Date.parse(row.value) : 0
  if (Number.isFinite(last) && Date.now() - last < MANUAL_COOLDOWN_MS) {
    const retryAfter = Math.ceil((MANUAL_COOLDOWN_MS - (Date.now() - last)) / 1000)
    setResponseHeader(event, 'retry-after', retryAfter)
    throw createError({ statusCode: 429, statusMessage: `同步冷却中，请 ${retryAfter} 秒后再试` })
  }

  await execute(
    db,
    'INSERT INTO steam_sync_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    'manual_sync_at',
    nowIso(),
    nowIso()
  )

  return await runSteamSync(event, 'manual')
})

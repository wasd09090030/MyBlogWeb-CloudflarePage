import { requireAdminSession } from '~~/server/domain/auth'
import { saveCredentials } from '~~/server/domain/steam/credentials'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const session = await requireAdminSession(event)
  const body = await readBody<{ steamId?: unknown, apiKey?: unknown }>(event)
  return await saveCredentials(event, body ?? {}, session.username)
})

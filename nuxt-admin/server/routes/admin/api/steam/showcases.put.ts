import { requireAdminSession } from '~~/server/domain/auth'
import { saveShowcases } from '~~/server/domain/steam/showcases'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  const body = await readBody<{ showcases?: unknown, updatedAt?: unknown }>(event)
  return await saveShowcases(event, body ?? {})
})

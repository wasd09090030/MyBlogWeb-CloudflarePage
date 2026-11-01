import { requireAdminSession } from '~~/server/domain/auth'
import { clearCredentials } from '~~/server/domain/steam/credentials'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  return await clearCredentials(event)
})

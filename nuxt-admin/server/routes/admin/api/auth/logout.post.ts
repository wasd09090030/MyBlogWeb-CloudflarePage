import { revokeCurrentSession } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await revokeCurrentSession(event)
  return { success: true }
})

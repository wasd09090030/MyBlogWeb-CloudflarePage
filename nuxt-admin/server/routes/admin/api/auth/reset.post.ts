import { resetOrBootstrapAdmin } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const body = await readBody<{ username?: string; newPassword?: string; resetToken?: string }>(event)
  return await resetOrBootstrapAdmin(event, body.username, body.newPassword, body.resetToken)
})

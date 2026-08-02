import { changeAdminPassword } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const body = await readBody<{ currentPassword?: string; newPassword?: string }>(event)
  return await changeAdminPassword(event, body.currentPassword, body.newPassword)
})

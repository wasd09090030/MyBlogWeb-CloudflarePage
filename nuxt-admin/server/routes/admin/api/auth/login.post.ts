import { loginAdmin } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const body = await readBody<{ username?: string; password?: string }>(event)
  if (!body.username || !body.password) throw createError({ statusCode: 400, statusMessage: 'Username and password are required' })
  const result = await loginAdmin(event, body.username, body.password)
  if (!result.success) {
    throw createError({ statusCode: result.mustReset ? 428 : 401, statusMessage: result.message || 'Login failed', data: { success: false, mustReset: result.mustReset === true } })
  }
  return { success: true, expiresAt: result.expiresAt }
})

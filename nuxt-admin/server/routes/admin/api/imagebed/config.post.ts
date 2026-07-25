import { backendFetch, requireAccessToken } from '~~/server/utils/backend'
import { assertSafeMutation } from '~~/server/utils/request-security'
export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const token = await requireAccessToken(event)
  const body = await readBody(event)
  await backendFetch('imagebed/config', { method: 'POST', body, headers: { authorization: `Bearer ${token}` } })
  return { success: true }
})

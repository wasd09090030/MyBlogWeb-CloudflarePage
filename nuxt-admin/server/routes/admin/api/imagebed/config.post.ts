import { saveImagebedConfig } from '~~/server/domain/config'
import { requireAdminSession } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'
export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  const body = await readBody(event)
  return await saveImagebedConfig(event, body)
})

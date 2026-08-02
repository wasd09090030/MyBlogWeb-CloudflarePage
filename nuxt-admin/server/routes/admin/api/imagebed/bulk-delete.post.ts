import { bulkDeleteMedia } from '~~/server/domain/media'
import { requireAdminSession } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  const body = await readBody<{ files?: string[] }>(event)
  return await bulkDeleteMedia(event, body.files)
})

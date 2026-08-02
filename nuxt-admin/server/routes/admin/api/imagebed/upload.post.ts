import { uploadMedia } from '~~/server/domain/media'
import { requireAdminSession } from '~~/server/domain/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'
export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  return await uploadMedia(event)
})

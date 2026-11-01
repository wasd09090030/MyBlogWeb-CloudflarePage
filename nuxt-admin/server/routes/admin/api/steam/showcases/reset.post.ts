import { requireAdminSession } from '~~/server/domain/auth'
import { resetShowcases } from '~~/server/domain/steam/showcases'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  await requireAdminSession(event)
  return await resetShowcases(event)
})

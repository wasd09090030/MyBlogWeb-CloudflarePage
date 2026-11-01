import { requireAdminSession } from '~~/server/domain/auth'
import { readCredentialState } from '~~/server/domain/steam/credentials'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  return await readCredentialState(event)
})

import { backendFetch } from '~~/server/utils/backend'
import { clearAdminSession, getAccessToken } from '~~/server/utils/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const token = getAccessToken(event)
  try {
    if (token) await backendFetch('/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${token}` } })
  } finally {
    clearAdminSession(event)
  }
  return { success: true }
})

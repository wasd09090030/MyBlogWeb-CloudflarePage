import type { AuthResponse } from '~~/app/types/admin'
import { backendFetch } from '~~/server/utils/backend'
import { setSession } from '~~/server/utils/auth'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const body = await readBody<{ username?: string; password?: string }>(event)
  if (!body.username || !body.password) throw createError({ statusCode: 400, statusMessage: 'Username and password are required' })
  try {
    const auth = await backendFetch<AuthResponse>('/auth/login', { method: 'POST', body })
    if (!auth.success) throw createError({ statusCode: 401, statusMessage: auth.message || 'Login failed' })
    setSession(event, auth)
    return { success: true }
  } catch (error: any) {
    if (error?.statusCode) throw error
    throw createError({ statusCode: error?.response?.status || 401, statusMessage: error?.data?.message || 'Login failed' })
  }
})

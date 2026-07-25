import type { H3Event } from 'h3'
import type { AuthResponse } from '~~/app/types/admin'
import { clearAdminSession, getAccessToken, getRefreshToken, setSession } from './auth'

export const backendUrl = (path: string) => `${String(useRuntimeConfig().apiBaseServer).replace(/\/$/, '')}/${path.replace(/^\//, '')}`

export async function backendFetch<T>(path: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  return await $fetch<T>(backendUrl(path), options)
}

export async function refreshSession(event: H3Event): Promise<string | undefined> {
  const refreshToken = getRefreshToken(event)
  if (!refreshToken) return undefined
  try {
    const auth = await backendFetch<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } })
    if (!auth.success || !auth.token) throw new Error('Refresh rejected')
    setSession(event, { ...auth, refreshToken: auth.refreshToken || refreshToken })
    return auth.token
  } catch {
    clearAdminSession(event)
    return undefined
  }
}

export async function requireAccessToken(event: H3Event): Promise<string> {
  const token = getAccessToken(event)
  if (token) return token
  const refreshed = await refreshSession(event)
  if (!refreshed) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  return refreshed
}

export async function verifySession(event: H3Event): Promise<boolean> {
  let token = getAccessToken(event)
  if (!token) token = await refreshSession(event)
  if (!token) return false
  try {
    await backendFetch('/auth/verify', { headers: { authorization: `Bearer ${token}` } })
    return true
  } catch {
    const refreshed = await refreshSession(event)
    if (!refreshed) return false
    try {
      await backendFetch('/auth/verify', { headers: { authorization: `Bearer ${refreshed}` } })
      return true
    } catch {
      clearAdminSession(event)
      return false
    }
  }
}

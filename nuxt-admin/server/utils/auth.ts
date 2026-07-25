import type { H3Event } from 'h3'
import type { AuthResponse } from '~~/app/types/admin'

const isProduction = process.env.NODE_ENV === 'production'

// Browsers reject a __Host- cookie unless it is Secure. Local HTTP development
// therefore uses distinct HttpOnly names while production keeps the hardened prefix.
const accessCookie = isProduction ? '__Host-admin_access' : 'admin_access'
const refreshCookie = isProduction ? '__Host-admin_refresh' : 'admin_refresh'

const cookieOptions = (event: H3Event, maxAge: number) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
  maxAge
})

export const getAccessToken = (event: H3Event) => getCookie(event, accessCookie)
export const getRefreshToken = (event: H3Event) => getCookie(event, refreshCookie)

export function clearAdminSession(event: H3Event) {
  deleteCookie(event, accessCookie, { path: '/' })
  deleteCookie(event, refreshCookie, { path: '/' })
}

export function setSession(event: H3Event, auth: AuthResponse) {
  if (!auth.token || !auth.refreshToken) throw createError({ statusCode: 502, statusMessage: 'Authentication service returned an invalid response' })
  const expiresAt = auth.expiresAt ? new Date(auth.expiresAt).getTime() : Date.now() + 15 * 60 * 1000
  setCookie(event, accessCookie, auth.token, cookieOptions(event, Math.max(60, Math.floor((expiresAt - Date.now()) / 1000))))
  setCookie(event, refreshCookie, auth.refreshToken, cookieOptions(event, 7 * 24 * 60 * 60))
}

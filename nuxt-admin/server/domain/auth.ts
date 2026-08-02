import type { H3Event } from 'h3'
import { deleteCookie, getCookie, getHeader, setCookie } from 'h3'
import { batch, execute, getDb, nowIso, queryFirst } from '~~/server/utils/d1'
import { getClientAddress, getCloudflareEnv, getRequiredSecret } from '~~/server/utils/cloudflare'
import { hashPassword, hashToken, randomToken, verifyPassword } from '~~/server/utils/edge-crypto'

type AdminUserRow = {
  username: string
  password_hash: string
  password_salt: string
  password_iterations: number
  password_algorithm: string
  must_reset: number
  created_at: string
  updated_at: string
}

type AdminSessionRow = {
  token_hash: string
  username: string
  expires_at: string
  revoked_at: string | null
  created_at: string
  last_seen_at: string
  ip_address: string | null
  user_agent: string | null
}

export type AdminSession = {
  username: string
  tokenHash: string
  expiresAt: string
  mustReset: boolean
}

export type LoginResult = {
  success: boolean
  username?: string
  expiresAt?: string
  mustReset?: boolean
  message?: string
}

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60

function cookieName(event: H3Event): string {
  return getRequestURL(event).protocol === 'https:' ? '__Host-admin_session' : 'admin_session'
}

function setSessionCookie(event: H3Event, token: string, expiresAt: string) {
  const maxAge = Math.max(60, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  setCookie(event, cookieName(event), token, {
    httpOnly: true,
    secure: getRequestURL(event).protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge,
    expires: new Date(expiresAt)
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, cookieName(event), { path: '/' })
  // Clearing both names makes local-to-production preview transitions deterministic.
  deleteCookie(event, cookieName(event) === 'admin_session' ? '__Host-admin_session' : 'admin_session', { path: '/' })
}

function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, cookieName(event)) || getCookie(event, cookieName(event) === 'admin_session' ? '__Host-admin_session' : 'admin_session')
}

async function getUser(event: H3Event, username: string): Promise<AdminUserRow | null> {
  return await queryFirst<AdminUserRow>(getDb(event), `
    SELECT username, password_hash, password_salt, password_iterations, password_algorithm,
           must_reset, created_at, updated_at
    FROM admin_users WHERE username = ? LIMIT 1
  `, username)
}

function validatePasswordInput(password: string, field: string) {
  if (!password || password.length < 8 || password.length > 512) throw createError({ statusCode: 400, statusMessage: `${field} must be between 8 and 512 characters` })
}

function safeSecretEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  if (leftBytes.length !== rightBytes.length) return false
  let result = 0
  for (let index = 0; index < leftBytes.length; index += 1) result |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0)
  return result === 0
}

async function createSession(event: H3Event, username: string): Promise<AdminSession> {
  const pepper = getRequiredSecret(event, 'SESSION_PEPPER')
  const token = randomToken(32)
  const tokenHash = await hashToken(token, pepper)
  const createdAt = nowIso()
  const ttl = Math.min(Math.max(Number(getCloudflareEnv(event).SESSION_TTL_SECONDS || COOKIE_MAX_AGE) || COOKIE_MAX_AGE, 300), 30 * 24 * 60 * 60)
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
  await execute(getDb(event), `
    INSERT INTO admin_sessions (token_hash, username, expires_at, revoked_at, created_at, last_seen_at, ip_address, user_agent)
    VALUES (?, ?, ?, NULL, ?, ?, ?, ?)
  `, tokenHash, username, expiresAt, createdAt, createdAt, getClientAddress(event) || null, getHeader(event, 'user-agent') || null)
  setSessionCookie(event, token, expiresAt)
  return { username, tokenHash, expiresAt, mustReset: false }
}

export async function loginAdmin(event: H3Event, usernameValue: unknown, passwordValue: unknown): Promise<LoginResult> {
  const username = String(usernameValue || '').trim()
  const password = String(passwordValue || '')
  if (!username || !password) return { success: false, message: 'Username and password are required' }
  const user = await getUser(event, username)
  if (!user || !(await verifyPassword(password, user.password_hash, user.password_salt, user.password_iterations, user.password_algorithm))) {
    return { success: false, message: 'Invalid username or password' }
  }
  if (user.must_reset === 1) return { success: false, mustReset: true, message: 'Password reset is required' }
  const session = await createSession(event, username)
  return { success: true, username, expiresAt: session.expiresAt }
}

export async function getCurrentSession(event: H3Event, clearInvalid = true): Promise<AdminSession | null> {
  const token = getSessionToken(event)
  if (!token) return null
  const pepper = getCloudflareEnv(event).SESSION_PEPPER?.trim()
  if (!pepper) throw createError({ statusCode: 503, statusMessage: 'Session secret is not configured' })
  const tokenHash = await hashToken(token, pepper)
  const row = await queryFirst<AdminSessionRow>(getDb(event), `
    SELECT token_hash, username, expires_at, revoked_at, created_at, last_seen_at, ip_address, user_agent
    FROM admin_sessions
    WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
    LIMIT 1
  `, tokenHash, nowIso())
  if (!row) {
    if (clearInvalid) clearSessionCookie(event)
    return null
  }
  await execute(getDb(event), 'UPDATE admin_sessions SET last_seen_at = ? WHERE token_hash = ?', nowIso(), tokenHash)
  const user = await getUser(event, row.username)
  if (!user) {
    if (clearInvalid) clearSessionCookie(event)
    return null
  }
  return { username: row.username, tokenHash, expiresAt: row.expires_at, mustReset: user.must_reset === 1 }
}

export async function requireAdminSession(event: H3Event): Promise<AdminSession> {
  const session = await getCurrentSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  if (session.mustReset) throw createError({ statusCode: 428, statusMessage: 'Password reset is required' })
  return session
}

export async function revokeCurrentSession(event: H3Event) {
  const session = await getCurrentSession(event, false)
  if (session) await execute(getDb(event), 'UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', nowIso(), session.tokenHash)
  clearSessionCookie(event)
}

export async function changeAdminPassword(event: H3Event, currentPasswordValue: unknown, newPasswordValue: unknown) {
  const session = await requireAdminSession(event)
  const currentPassword = String(currentPasswordValue || '')
  const newPassword = String(newPasswordValue || '')
  validatePasswordInput(currentPassword, 'Current password')
  validatePasswordInput(newPassword, 'New password')
  if (currentPassword === newPassword) throw createError({ statusCode: 400, statusMessage: 'New password must be different' })
  const user = await getUser(event, session.username)
  if (!user || !(await verifyPassword(currentPassword, user.password_hash, user.password_salt, user.password_iterations, user.password_algorithm))) throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect' })
  const password = await hashPassword(newPassword)
  const now = nowIso()
  await batch(getDb(event), [
    {
      sql: `UPDATE admin_users SET password_hash = ?, password_salt = ?, password_iterations = ?, password_algorithm = ?, must_reset = 0, updated_at = ? WHERE username = ?`,
      values: [password.hash, password.salt, password.iterations, password.algorithm, now, session.username]
    },
    {
      sql: 'UPDATE admin_sessions SET revoked_at = ? WHERE username = ? AND token_hash <> ? AND revoked_at IS NULL',
      values: [now, session.username, session.tokenHash]
    }
  ])
  return { success: true, message: 'Password changed successfully' }
}

export async function resetOrBootstrapAdmin(event: H3Event, usernameValue: unknown, newPasswordValue: unknown, resetTokenValue?: unknown) {
  const expected = getRequiredSecret(event, 'ADMIN_RESET_TOKEN')
  const provided = String(resetTokenValue || getHeader(event, 'x-admin-reset-token') || '')
  if (!safeSecretEqual(provided, expected)) throw createError({ statusCode: 403, statusMessage: 'Reset token is invalid' })
  const username = String(usernameValue || 'admin').trim()
  if (!/^[A-Za-z0-9_.-]{1,64}$/.test(username)) throw createError({ statusCode: 400, statusMessage: 'Invalid username' })
  const newPassword = String(newPasswordValue || '')
  validatePasswordInput(newPassword, 'New password')
  const password = await hashPassword(newPassword)
  const now = nowIso()
  await batch(getDb(event), [
    {
      sql: `INSERT INTO admin_users (username, password_hash, password_salt, password_iterations, password_algorithm, must_reset, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, password_salt = excluded.password_salt,
              password_iterations = excluded.password_iterations, password_algorithm = excluded.password_algorithm,
              must_reset = 0, updated_at = excluded.updated_at`,
      values: [username, password.hash, password.salt, password.iterations, password.algorithm, now, now]
    },
    { sql: 'UPDATE admin_sessions SET revoked_at = ? WHERE username = ? AND revoked_at IS NULL', values: [now, username] }
  ])
  clearSessionCookie(event)
  return { success: true, message: 'Administrator password reset successfully' }
}

export async function cleanupExpiredSessions(event: H3Event) {
  return await execute(getDb(event), 'DELETE FROM admin_sessions WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at <= ?)', nowIso(), new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
}

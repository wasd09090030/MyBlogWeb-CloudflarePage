import type { H3Event } from 'h3'
import { createError, setResponseHeader } from 'h3'
import { execute, getDb, nowIso, queryAll, queryFirst, requireId } from '~~/server/utils/d1'
import { getRequiredSecret } from '~~/server/utils/cloudflare'
import { hashToken, randomToken } from '~~/server/utils/edge-crypto'

export type McpScope = 'mcp:read' | 'mcp:write'

export const MCP_SCOPES: readonly McpScope[] = ['mcp:read', 'mcp:write']

export const MCP_TOKEN_PREFIX = 'bmcp_'
export const MCP_TTL_DAYS_DEFAULT = 30
export const MCP_TTL_DAYS_MAX = 90

const MCP_TTL_DAYS_MIN = 1
const MCP_TOKEN_PATTERN = /^bmcp_[A-Za-z0-9_-]{43}$/
const MCP_LABEL_MAX = 64
const MCP_LAST_USED_THROTTLE_MS = 60_000

/** Every read of `mcp_tokens` selects the same shape; keep the list in one place. */
const TOKEN_COLUMNS = 'id, token_prefix, username, label, scopes, created_at, last_used_at, expires_at, revoked_at'

export type McpTokenPublic = {
  id: number
  tokenPrefix: string
  username: string
  label: string
  scopes: McpScope[]
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string
  revokedAt: string | null
}

export type McpAuthContext = {
  id: number
  username: string
  label: string
  scopes: McpScope[]
  expiresAt: string
  tokenHash: string
}

type McpTokenRow = {
  id: number
  token_prefix: string
  username: string
  label: string
  scopes: string
  created_at: string
  last_used_at: string | null
  expires_at: string
  revoked_at: string | null
}

type AdminUserStateRow = {
  must_reset: number
}

function isMcpScope(value: unknown): value is McpScope {
  return typeof value === 'string' && (MCP_SCOPES as readonly string[]).includes(value)
}

function sanitizeScopes(value: unknown): McpScope[] {
  if (!Array.isArray(value)) return []
  const scopes: McpScope[] = []
  for (const item of value) {
    if (isMcpScope(item) && !scopes.includes(item)) scopes.push(item)
  }
  return scopes
}

export function normalizeMcpScopes(value: unknown): McpScope[] {
  const scopes = sanitizeScopes(value)
  return scopes.length ? scopes : [...MCP_SCOPES]
}

export function normalizeMcpExpiresInDays(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(parsed)) return MCP_TTL_DAYS_DEFAULT
  return Math.min(Math.max(parsed, MCP_TTL_DAYS_MIN), MCP_TTL_DAYS_MAX)
}

export function isMcpTokenFormat(value: string): boolean {
  return MCP_TOKEN_PATTERN.test(value)
}

/**
 * The single "revoke every live token for this account" statement.
 * `changeAdminPassword` and `resetOrBootstrapAdmin` inline it into their batch,
 * and `revokeAllMcpTokens` runs the identical SQL — one literal, so the two can
 * never drift. It lives here (not in `auth.ts`) so the token module does not
 * have to import the auth module and create a cycle.
 */
export function revokeMcpTokensStatement(username: string, now: string): { sql: string; values: string[] } {
  return { sql: 'UPDATE mcp_tokens SET revoked_at = ? WHERE username = ? AND revoked_at IS NULL', values: [now, username] }
}

export function parseMcpScopesColumn(value: unknown): McpScope[] {
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    return sanitizeScopes(JSON.parse(value))
  } catch {
    return []
  }
}

function mapTokenRow(row: McpTokenRow): McpTokenPublic {
  return {
    id: row.id,
    tokenPrefix: row.token_prefix,
    username: row.username,
    label: row.label,
    scopes: parseMcpScopesColumn(row.scopes),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at
  }
}

/**
 * Plain-object events (tests, internal callers) have no Node response, so only
 * real HTTP events receive the WWW-Authenticate challenge before the 401.
 */
function unauthorized(event: H3Event): never {
  if (event.node?.res) setResponseHeader(event, 'WWW-Authenticate', 'Bearer')
  throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
}

export async function issueMcpToken(
  event: H3Event,
  input: { username: string, label: unknown, scopes?: unknown, expiresInDays?: unknown }
): Promise<{ token: string, record: McpTokenPublic }> {
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  if (!label || label.length > MCP_LABEL_MAX) {
    throw createError({ statusCode: 400, statusMessage: 'A token label is required (1-64 characters)' })
  }
  const username = String(input.username || '').trim()
  // A token bound to '' would be orphaned from the start: every Bearer check
  // looks the username up in admin_users and rejects when the row is missing.
  if (!username) {
    throw createError({ statusCode: 400, statusMessage: 'A username is required to issue a token' })
  }
  const scopes = normalizeMcpScopes(input.scopes)
  const days = normalizeMcpExpiresInDays(input.expiresInDays)
  const token = `${MCP_TOKEN_PREFIX}${randomToken(32)}`
  const tokenHash = await hashToken(token, getRequiredSecret(event, 'SESSION_PEPPER'))
  const createdAt = nowIso()
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  const db = getDb(event)
  await execute(db, `
    INSERT INTO mcp_tokens (token_hash, token_prefix, username, label, scopes, created_at, last_used_at, expires_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)
  `, tokenHash, token.slice(0, 12), username, label, JSON.stringify(scopes), createdAt, expiresAt)
  const row = await queryFirst<McpTokenRow>(db, `
    SELECT ${TOKEN_COLUMNS}
    FROM mcp_tokens WHERE token_hash = ? LIMIT 1
  `, tokenHash)
  if (!row) throw createError({ statusCode: 500, statusMessage: 'Token could not be persisted' })
  return { token, record: mapTokenRow(row) }
}

export async function authenticateMcpRequest(
  event: H3Event,
  authorization: string | undefined,
  requiredScope: McpScope
): Promise<McpAuthContext> {
  const header = typeof authorization === 'string' ? authorization.trim() : ''
  if (!header.startsWith('Bearer ')) unauthorized(event)
  const token = header.slice('Bearer '.length).trim()
  if (!isMcpTokenFormat(token)) unauthorized(event)
  const tokenHash = await hashToken(token, getRequiredSecret(event, 'SESSION_PEPPER'))
  const db = getDb(event)
  const row = await queryFirst<McpTokenRow>(db, `
    SELECT ${TOKEN_COLUMNS}
    FROM mcp_tokens
    WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?
    LIMIT 1
  `, tokenHash, nowIso())
  if (!row) unauthorized(event)
  const user = await queryFirst<AdminUserStateRow>(db, 'SELECT must_reset FROM admin_users WHERE username = ? LIMIT 1', row.username)
  if (!user) unauthorized(event)
  if (user.must_reset === 1) throw createError({ statusCode: 403, statusMessage: 'Password reset is required' })
  const scopes = parseMcpScopesColumn(row.scopes)
  if (!scopes.includes(requiredScope)) {
    throw createError({ statusCode: 403, statusMessage: `Insufficient scope: ${requiredScope}` })
  }
  const now = nowIso()
  const lastUsed = row.last_used_at ? Date.parse(row.last_used_at) : Number.NaN
  if (!Number.isFinite(lastUsed) || Date.now() - lastUsed > MCP_LAST_USED_THROTTLE_MS) {
    await execute(db, 'UPDATE mcp_tokens SET last_used_at = ? WHERE id = ?', now, row.id)
  }
  return {
    id: row.id,
    username: row.username,
    label: row.label,
    scopes,
    expiresAt: row.expires_at,
    tokenHash
  }
}

export async function listMcpTokens(event: H3Event, username: string): Promise<McpTokenPublic[]> {
  const rows = await queryAll<McpTokenRow>(getDb(event), `
    SELECT ${TOKEN_COLUMNS}
    FROM mcp_tokens
    WHERE username = ?
    ORDER BY created_at DESC, id DESC
  `, username)
  return rows.map(mapTokenRow)
}

export async function revokeMcpTokenById(event: H3Event, idValue: unknown, username: string): Promise<void> {
  const id = requireId(idValue, 'token id')
  const result = await execute(getDb(event), 'UPDATE mcp_tokens SET revoked_at = ? WHERE id = ? AND username = ? AND revoked_at IS NULL', nowIso(), id, username)
  if (Number(result.meta?.changes ?? 0) === 0) throw createError({ statusCode: 404, statusMessage: 'Token not found' })
}

export async function revokeMcpTokenByHash(event: H3Event, tokenHash: string): Promise<void> {
  if (!tokenHash) return
  await execute(getDb(event), 'UPDATE mcp_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', nowIso(), tokenHash)
}

export async function revokeAllMcpTokens(event: H3Event, username: string): Promise<void> {
  const statement = revokeMcpTokensStatement(username, nowIso())
  await execute(getDb(event), statement.sql, ...statement.values)
}

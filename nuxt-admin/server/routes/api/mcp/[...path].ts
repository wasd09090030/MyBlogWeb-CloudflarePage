import type { H3Event } from 'h3'
import { createError, getHeader, getMethod, getRouterParam, readBody, setResponseStatus } from 'h3'
import { requireAdminSession, verifyAdminCredentials, type AdminSession } from '~~/server/domain/auth'
import {
  authenticateMcpRequest,
  issueMcpToken,
  listMcpTokens,
  revokeMcpTokenById,
  revokeMcpTokenByHash,
  MCP_SCOPES,
  type McpAuthContext,
  type McpScope
} from '~~/server/domain/mcp-token'
import { getActualRequestOrigin, getRequestOrigin } from '~~/server/utils/cloudflare'
import { assertSafeMutation } from '~~/server/utils/request-security'

/**
 * Bearer-authenticated MCP API.
 *
 * This file deliberately does NOT call `assertSafeMutation` for Bearer requests,
 * unlike the admin BFF (`routes/admin/api/[...path].ts`) which does it on every
 * request. CSRF protection exists because browsers attach ambient credentials
 * (cookies) to cross-site requests automatically. A Bearer token is never
 * attached by the browser: a cross-site page cannot make the victim's browser
 * add `Authorization: Bearer ...`, and this file never reads a Cookie on the
 * Bearer routes, so the CSRF model simply does not apply here. Adding
 * `assertSafeMutation` to these routes would only break CLI clients, which send
 * no Origin header.
 *
 * Two exceptions exist: `GET /api/mcp/tokens` and `POST /api/mcp/tokens/:id/revoke`
 * act on the browser's admin session instead of a Bearer token. Both reject any
 * Authorization header, and the mutating one calls `assertSafeMutation` itself,
 * so the two authentication models are never mixed on one route.
 *
 * `POST /api/mcp/token` keeps an Origin check (only when an Origin header is
 * present) for the same reason it exists on login: it verifies a password and
 * must not work as a cross-origin password oracle for arbitrary web pages.
 */

function routeParts(event: H3Event): string[] {
  return String(getRouterParam(event, 'path') || '').split('/').filter(Boolean).map(decodeURIComponent)
}

/** Bearer route guard: no Cookie is ever consulted here, only the Authorization header. */
async function requireScope(event: H3Event, scope: McpScope): Promise<McpAuthContext> {
  return await authenticateMcpRequest(event, getHeader(event, 'authorization'), scope)
}

/**
 * Cookie route guard. A Bearer header is rejected rather than ignored: silently
 * accepting both credentials on one endpoint is how a leaked MCP token could be
 * replayed to reach token management itself.
 */
async function requireCookieSession(event: H3Event): Promise<AdminSession> {
  if (getHeader(event, 'authorization')) {
    throw createError({ statusCode: 400, statusMessage: 'Authorization headers are not accepted on cookie-authenticated routes' })
  }
  return await requireAdminSession(event)
}

/** Same-origin guard for the password-checking endpoint; CLI clients send no Origin, so absent is allowed. */
function requireSameOriginWhenPresent(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (!origin) return
  if (origin === getActualRequestOrigin(event) || origin === getRequestOrigin(event)) return
  throw createError({ statusCode: 403, statusMessage: 'Cross-origin request rejected' })
}

function isKnownScope(value: unknown): value is McpScope {
  return typeof value === 'string' && (MCP_SCOPES as readonly string[]).includes(value)
}

/**
 * `normalizeMcpScopes` in the domain widens an empty or all-invalid scope list to
 * the full set, so both a typo such as `["admin:all"]` and an explicit `[]` would
 * silently mint an over-privileged token — an empty list must not fail open. Only
 * an omitted `scopes` means "use the default".
 */
function validateRequestedScopes(value: unknown) {
  if (value === undefined || value === null) return
  if (!Array.isArray(value)) throw createError({ statusCode: 400, statusMessage: 'scopes must be an array of MCP scope names' })
  if (value.length === 0) throw createError({ statusCode: 400, statusMessage: 'scopes must not be empty; omit it to request the default scopes' })
  for (const scope of value) {
    if (!isKnownScope(scope)) throw createError({ statusCode: 400, statusMessage: `Unknown MCP scope: ${String(scope)}` })
  }
}

async function issueToken(event: H3Event) {
  requireSameOriginWhenPresent(event)
  const body = (await readBody<Record<string, unknown> | undefined>(event)) || {}
  validateRequestedScopes(body.scopes)
  const check = await verifyAdminCredentials(event, body.username, body.password)
  if (!check.ok) {
    if (check.reason === 'must_reset') throw createError({ statusCode: 403, statusMessage: 'Password reset is required' })
    throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
  }
  const { token, record } = await issueMcpToken(event, {
    username: check.username,
    label: body.label,
    scopes: body.scopes,
    expiresInDays: body.expiresInDays
  })
  // `token` is the only place the plaintext is ever returned; every other route
  // exposes `tokenPrefix` only.
  setResponseStatus(event, 201)
  return { token, ...record }
}

export default defineEventHandler(async (event) => {
  const parts = routeParts(event)
  const currentMethod = getMethod(event)

  // --- Authentication group -------------------------------------------------
  if (parts[0] === 'token' && parts.length === 1 && currentMethod === 'POST') return await issueToken(event)
  if (parts[0] === 'token' && parts.length === 2 && parts[1] === 'revoke' && currentMethod === 'POST') {
    const ctx = await requireScope(event, 'mcp:read')
    await revokeMcpTokenByHash(event, ctx.tokenHash)
    return { success: true }
  }
  if (parts[0] === 'whoami' && parts.length === 1 && currentMethod === 'GET') {
    const ctx = await requireScope(event, 'mcp:read')
    return { username: ctx.username, label: ctx.label, scopes: ctx.scopes, expiresAt: ctx.expiresAt }
  }
  if (parts[0] === 'tokens' && parts.length === 1 && currentMethod === 'GET') {
    const session = await requireCookieSession(event)
    return { tokens: await listMcpTokens(event, session.username) }
  }
  if (parts[0] === 'tokens' && parts.length === 3 && parts[2] === 'revoke' && currentMethod === 'POST') {
    // Cookie-authenticated mutation: the CSRF check must run before the session
    // lookup, so a cross-site form post is rejected before it can act.
    assertSafeMutation(event)
    const session = await requireCookieSession(event)
    await revokeMcpTokenById(event, parts[1], session.username)
    return { success: true }
  }

  // --- Business group (articles, gallery, diary, images, ops, ai) ------------
  // Additional Bearer + scope branches belong here.

  throw createError({ statusCode: 404, statusMessage: 'Unsupported MCP API route' })
})

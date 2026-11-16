import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { createError, getHeader, getRequestHost, getRequestURL } from 'h3'
import { paginate, projectArticleList, withDiaryPublicDefault } from '../server/domain/mcp-view.ts'

const root = new URL('../', import.meta.url)
const posix = value => value.pathname.replace(/^\/([A-Za-z]:)/, '$1').replace(/\/$/, '')
const alias = { '~~': posix(new URL('.', root)) }

const db = new DatabaseSync(':memory:')
for (const name of readdirSync(new URL('migrations/', root)).filter(n => n.endsWith('.sql')).sort()) {
  db.exec(readFileSync(new URL(`migrations/${name}`, root), 'utf8'))
}
const adapter = {
  prepare(sql) {
    const statement = db.prepare(sql)
    return { bind: (...values) => ({
      first: async () => statement.get(...values) || null,
      all: async () => ({ results: statement.all(...values) }),
      run: async () => ({ meta: statement.run(...values) })
    }) }
  },
  batch: async statements => {
    db.exec('BEGIN')
    try {
      const results = []
      for (const statement of statements) results.push(await statement.run())
      db.exec('COMMIT')
      return results
    } catch (error) { db.exec('ROLLBACK'); throw error }
  }
}

// Nitro auto-imports these in production; keep tests explicit.
globalThis.createError = createError
globalThis.getRequestURL = getRequestURL
// The route file relies on Nitro's auto-imported defineEventHandler; identity is enough here.
globalThis.defineEventHandler = handler => handler
// `server/utils/request-security.ts` uses these without importing them (Nitro auto-imports).
// Without the globals the CSRF guard throws ReferenceError, which the assertions below would
// misread as a failing status instead of exercising the real check.
globalThis.getHeader = getHeader
globalThis.getRequestHost = getRequestHost

async function bundleModule(relativePath) {
  const output = await build({
    entryPoints: [posix(new URL(relativePath, root))],
    bundle: true, write: false, format: 'cjs', packages: 'external', platform: 'node', alias
  })
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports)
  return module.exports
}

const mcpToken = await bundleModule('server/domain/mcp-token.ts')
const event = { context: { cloudflare: { env: { BLOG_DB: adapter, SESSION_PEPPER: 'test-pepper' } } } }

// 1. 格式与 scope
assert.equal(mcpToken.isMcpTokenFormat('bmcp_' + 'a'.repeat(43)), true)
assert.equal(mcpToken.isMcpTokenFormat('bmcp_' + 'a'.repeat(42)), false)
assert.equal(mcpToken.isMcpTokenFormat('Bearer bmcp_' + 'a'.repeat(43)), false)
assert.deepEqual(mcpToken.normalizeMcpScopes(['mcp:write', 'admin:all', 'mcp:read']), ['mcp:write', 'mcp:read'])
assert.deepEqual(mcpToken.normalizeMcpScopes(undefined), ['mcp:read', 'mcp:write'])
assert.deepEqual(mcpToken.normalizeMcpScopes([]), ['mcp:read', 'mcp:write'])

// 2. 有效期夹取
assert.equal(mcpToken.normalizeMcpExpiresInDays(undefined), 30)
assert.equal(mcpToken.normalizeMcpExpiresInDays(0), 1)
assert.equal(mcpToken.normalizeMcpExpiresInDays(-5), 1)
assert.equal(mcpToken.normalizeMcpExpiresInDays(365), 90)
assert.equal(mcpToken.normalizeMcpExpiresInDays('7'), 7)
assert.equal(mcpToken.normalizeMcpExpiresInDays('abc'), 30)

// 3. 签发 → 校验 → 吊销
db.prepare("INSERT INTO admin_users (username, password_hash, password_salt, password_iterations, password_algorithm, must_reset, created_at, updated_at) VALUES ('admin','x','y',100000,'pbkdf2-sha256',0,'2026-01-01','2026-01-01')").run()
const issued = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'laptop', scopes: ['mcp:read'] })
assert.ok(issued.token.startsWith('bmcp_'))
assert.equal(issued.record.tokenPrefix, issued.token.slice(0, 12))
assert.deepEqual(issued.record.scopes, ['mcp:read'])
assert.equal(issued.record.username, 'admin')

const ctx = await mcpToken.authenticateMcpRequest(event, `Bearer ${issued.token}`, 'mcp:read')
assert.equal(ctx.username, 'admin')
assert.equal(ctx.label, 'laptop')
assert.ok(ctx.tokenHash.length > 20, 'hash must not be the token')

// write scope 未授予 → 403
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${issued.token}`, 'mcp:write'), /Insufficient scope/)

// 4. 过期 / 吊销 / 伪造
await assert.rejects(mcpToken.authenticateMcpRequest(event, 'Bearer bmcp_' + 'z'.repeat(43), 'mcp:read'), /Authentication required/)
await assert.rejects(mcpToken.authenticateMcpRequest(event, undefined, 'mcp:read'), /Authentication required/)
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Basic ${issued.token}`, 'mcp:read'), /Authentication required/)

db.prepare('UPDATE mcp_tokens SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', issued.record.id)
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${issued.token}`, 'mcp:read'), /Authentication required/)
db.prepare('UPDATE mcp_tokens SET expires_at = ? WHERE id = ?').run('2099-01-01T00:00:00.000Z', issued.record.id)

// 5. must_reset 阻断
db.prepare("UPDATE admin_users SET must_reset = 1 WHERE username = 'admin'").run()
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${issued.token}`, 'mcp:read'), /Password reset is required/)
db.prepare("UPDATE admin_users SET must_reset = 0 WHERE username = 'admin'").run()

// 6. 列表只回前缀
const listed = await mcpToken.listMcpTokens(event, 'admin')
assert.equal(listed.length, 1)
assert.equal(listed[0].tokenPrefix, issued.record.tokenPrefix)
assert.equal(JSON.stringify(listed).includes(issued.token), false, 'list must not contain the plaintext token')

// 7. 按 id 吊销
await assert.rejects(mcpToken.revokeMcpTokenById(event, 99999, 'admin'), /Token not found/)
await mcpToken.revokeMcpTokenById(event, issued.record.id, 'admin')
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${issued.token}`, 'mcp:read'), /Authentication required/)

// 8. 按 hash 自吊销
const second = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'desktop' })
const secondCtx = await mcpToken.authenticateMcpRequest(event, `Bearer ${second.token}`, 'mcp:read')
await mcpToken.revokeMcpTokenByHash(event, secondCtx.tokenHash)
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${second.token}`, 'mcp:read'), /Authentication required/)

// 9. 按用户全吊销
await mcpToken.issueMcpToken(event, { username: 'admin', label: 'a' })
await mcpToken.issueMcpToken(event, { username: 'admin', label: 'b' })
await mcpToken.revokeAllMcpTokens(event, 'admin')
assert.equal((await mcpToken.listMcpTokens(event, 'admin')).every(t => t.revokedAt), true)

// 10. label 校验
await assert.rejects(mcpToken.issueMcpToken(event, { username: 'admin', label: '' }), /label/)
await assert.rejects(mcpToken.issueMcpToken(event, { username: 'admin', label: 'x'.repeat(65) }), /label/)

// 11. 凭证校验顺序 + 改密/重置时吊销 MCP token
const authModule = await bundleModule('server/domain/auth.ts')
const cryptoModule = await bundleModule('server/utils/edge-crypto.ts')
const password = await cryptoModule.hashPassword('correct-horse-battery')
db.prepare("INSERT INTO admin_users (username, password_hash, password_salt, password_iterations, password_algorithm, must_reset, created_at, updated_at) VALUES ('ops',?,?,100000,'pbkdf2-sha256',0,'2026-01-01','2026-01-01')")
  .run(password.hash, password.salt)

assert.deepEqual(await authModule.verifyAdminCredentials(event, 'ops', 'correct-horse-battery'), { ok: true, username: 'ops' })
assert.deepEqual(await authModule.verifyAdminCredentials(event, 'ops', 'wrong'), { ok: false, reason: 'invalid' })
assert.deepEqual(await authModule.verifyAdminCredentials(event, 'nobody', 'correct-horse-battery'), { ok: false, reason: 'invalid' })
assert.deepEqual(await authModule.verifyAdminCredentials(event, '', ''), { ok: false, reason: 'missing' })

// loginAdmin 的三条失败分支必须与抽取前逐字一致
assert.deepEqual(await authModule.loginAdmin(event, '', ''), { success: false, message: 'Username and password are required' })
assert.deepEqual(await authModule.loginAdmin(event, 'ops', 'wrong'), { success: false, message: 'Invalid username or password' })

// must_reset 必须在密码正确之后才暴露
db.prepare("UPDATE admin_users SET must_reset = 1 WHERE username = 'ops'").run()
assert.deepEqual(await authModule.verifyAdminCredentials(event, 'ops', 'correct-horse-battery'), { ok: false, reason: 'must_reset' })
assert.deepEqual(await authModule.loginAdmin(event, 'ops', 'correct-horse-battery'), { success: false, mustReset: true, message: 'Password reset is required' })
assert.deepEqual(await authModule.verifyAdminCredentials(event, 'ops', 'wrong'), { ok: false, reason: 'invalid' }, 'wrong password must not reveal must_reset')
db.prepare("UPDATE admin_users SET must_reset = 0 WHERE username = 'ops'").run()

// 改密/重置共用的吊销语句：把 ops 的 token 准备好的，执行语句后必须失效
const opsToken = await mcpToken.issueMcpToken(event, { username: 'ops', label: 'laptop' })
const statement = authModule.revokeMcpTokensStatement('ops', new Date().toISOString())
await adapter.prepare(statement.sql).bind(...statement.values).run()
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${opsToken.token}`, 'mcp:read'), /Authentication required/)

// 12. 语句确实接进了改密/重置的 batch：走真实领域函数后 token 必须失效
// auth.ts 会读写 cookie，需要一个最小可用的 HTTP event（plain-object event 没有 res）。
function httpEvent(cookie) {
  const res = { headers: {}, getHeader(name) { return this.headers[name] }, setHeader(name, value) { this.headers[name] = value }, removeHeader(name) { delete this.headers[name] }, appendHeader(name, value) { this.headers[name] = value }, headersSent: false }
  return {
    __is_event__: true,
    path: '/admin/api/auth/password',
    node: { req: { url: '/', method: 'POST', headers: cookie ? { host: 'wasd09090030.top', cookie } : { host: 'wasd09090030.top' } }, res },
    context: { cloudflare: { env: { ...event.context.cloudflare.env, ADMIN_RESET_TOKEN: 'test-reset-token' } } }
  }
}

const phoneToken = await mcpToken.issueMcpToken(event, { username: 'ops', label: 'phone' })
assert.equal((await mcpToken.authenticateMcpRequest(event, `Bearer ${phoneToken.token}`, 'mcp:read')).username, 'ops')
await authModule.resetOrBootstrapAdmin(httpEvent(), 'ops', 'brand-new-password', 'test-reset-token')
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${phoneToken.token}`, 'mcp:read'), /Authentication required/, 'reset must revoke MCP tokens')
assert.deepEqual(await authModule.verifyAdminCredentials(event, 'ops', 'brand-new-password'), { ok: true, username: 'ops' })

const sessionTokenHash = await cryptoModule.hashToken('browser-session', 'test-pepper')
db.prepare("INSERT INTO admin_sessions (token_hash, username, expires_at, revoked_at, created_at, last_seen_at, ip_address, user_agent) VALUES (?, 'ops', '2099-01-01T00:00:00.000Z', NULL, '2026-01-01', '2026-01-01', NULL, NULL)").run(sessionTokenHash)
const laptopToken = await mcpToken.issueMcpToken(event, { username: 'ops', label: 'laptop-again' })
assert.equal((await mcpToken.authenticateMcpRequest(event, `Bearer ${laptopToken.token}`, 'mcp:read')).username, 'ops')
await authModule.changeAdminPassword(httpEvent('admin_session=browser-session'), 'brand-new-password', 'another-password')
await assert.rejects(mcpToken.authenticateMcpRequest(event, `Bearer ${laptopToken.token}`, 'mcp:read'), /Authentication required/, 'password change must revoke MCP tokens')
assert.deepEqual(await authModule.verifyAdminCredentials(event, 'ops', 'another-password'), { ok: true, username: 'ops' })

// 13. 列表投影、分页与日记可见性默认值（纯函数）
// 文章列表投影：正文必须被剥掉，长度保留
const articles = [
  { id: 2, title: 'B', slug: 'b', category: 'study', tags: ['x'], content: 'a'.repeat(500), contentMarkdown: 'm'.repeat(400), aiSummary: 's', createdAt: 'c2', updatedAt: 'u2', coverImage: 'https://x/y.jpg' },
  { id: 1, title: 'A', slug: null, category: 'other', tags: [], content: 'abc', contentMarkdown: null, aiSummary: null, createdAt: 'c1', updatedAt: 'u1' }
]
const projected = projectArticleList(articles)
assert.equal(projected.length, 2)
assert.deepEqual(Object.keys(projected[0]).sort(), ['aiSummary', 'category', 'contentLength', 'createdAt', 'id', 'slug', 'tags', 'title', 'updatedAt'])
assert.equal(projected[0].contentLength, 500)
assert.equal(projected[1].contentLength, 3)
assert.equal(JSON.stringify(projected).includes('a'.repeat(50)), false, 'body text must not leak into the list projection')

// 分页：默认值、上限、越界
assert.deepEqual(paginate([1, 2, 3, 4, 5], {}, { pageSize: 2, maxPageSize: 2 }), { data: [1, 2], total: 5, page: 1, pageSize: 2, totalPages: 3 })
assert.deepEqual(paginate([1, 2, 3, 4, 5], { page: '2', pageSize: '2' }, { pageSize: 2, maxPageSize: 2 }).data, [3, 4])
assert.equal(paginate([1, 2, 3], { pageSize: '999' }, { pageSize: 2, maxPageSize: 50 }).pageSize, 50)
assert.equal(paginate([1, 2, 3], { page: '0' }, { pageSize: 2, maxPageSize: 2 }).page, 1)
assert.equal(paginate([1, 2, 3], { page: '99' }, { pageSize: 2, maxPageSize: 2 }).data.length, 0)
assert.equal(paginate([], {}, { pageSize: 20, maxPageSize: 50 }).totalPages, 1)
assert.equal(paginate([1, 2, 3], { limit: '3' }, { pageSize: 20, maxPageSize: 50 }).pageSize, 3, 'limit is an accepted alias for pageSize')

// 日记默认值：漏传一律不公开
assert.equal(withDiaryPublicDefault({ contentMarkdown: 'x' }).isPublic, false)
assert.equal(withDiaryPublicDefault({}).isPublic, false)
assert.equal(withDiaryPublicDefault({ isPublic: true }).isPublic, true)
assert.equal(withDiaryPublicDefault({ isPublic: '0' }).isPublic, false)
assert.equal(withDiaryPublicDefault({ isPublic: 1 }).isPublic, true)

// 14. 路由层鉴权组：默认导出必须真的挂上每个 guard
// 路由文件的鉴权不能只靠手工 curl 验证，否则删掉 assertSafeMutation、把 Bearer 分支
// 换成 Cookie、或放宽 scope 校验，check:mcp 依然会全绿。
const routeModule = await bundleModule('server/routes/api/mcp/[...path].ts')

// h3 event 的最小真实形状：getRouterParam 读 context.params，getMethod 读 node.req.method，
// getHeader 读 node.req.headers，readBody 读 node.req.body，requireAdminSession 需要
// node.res 来清 cookie，Origin 校验需要 context.cloudflare.request。
function routeEvent({ path, method = 'GET', headers = {}, body, cookie, origin, requestUrl = 'https://wasd09090030.top/api/mcp' }) {
  const requestHeaders = { host: 'wasd09090030.top', ...headers }
  if (body !== undefined) requestHeaders['content-type'] = 'application/json'
  if (cookie) requestHeaders.cookie = cookie
  // The Origin header is the *caller's* origin and must stay independent of the
  // request URL (the resource being fetched). Deriving one from the other would
  // make every request look same-origin and silently neuter assertSafeMutation.
  if (origin) requestHeaders.origin = origin
  const runtime = { env: { ...event.context.cloudflare.env, BLOG_DB: adapter }, request: new Request(requestUrl + path) }
  const res = {
    headers: {}, statusCode: 200, statusMessage: '',
    getHeader(name) { return this.headers[name] },
    setHeader(name, value) { this.headers[name] = value },
    removeHeader(name) { delete this.headers[name] },
    appendHeader(name, value) { this.headers[name] = value },
    headersSent: false
  }
  const ev = {
    __is_event__: true,
    path: '/api/mcp' + path,
    method,
    node: { req: { url: '/api/mcp' + path, method, headers: requestHeaders, body }, res },
    context: { params: { path: path.replace(/^\//, '') }, cloudflare: runtime }
  }
  return { event: ev, res }
}

async function callRoute(opts) {
  const { event: ev, res } = routeEvent(opts)
  try {
    const value = await routeModule.default(ev)
    return { ok: true, value, status: res.statusCode, headers: res.headers }
  } catch (error) {
    return { ok: false, status: error.statusCode, message: error.statusMessage || error.message, headers: res.headers }
  }
}

// 先把「当前权限」状态准备好：admin 存在、must_reset=0，且密码可校验（前面小节只用了假 hash）。
db.prepare("UPDATE admin_users SET must_reset = 0 WHERE username = 'admin'").run()
const adminPassword = await cryptoModule.hashPassword('route-test-password')
db.prepare("UPDATE admin_users SET password_hash = ?, password_salt = ?, password_iterations = ?, password_algorithm = ? WHERE username = 'admin'")
  .run(adminPassword.hash, adminPassword.salt, adminPassword.iterations, adminPassword.algorithm)
const routeToken = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'route-test', scopes: ['mcp:read', 'mcp:write'] })
const readOnlyToken = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'route-ro', scopes: ['mcp:read'] })
const bearer = `Bearer ${routeToken.token}`
const sessionToken = 'route-session-token'
db.prepare("INSERT INTO admin_sessions (token_hash, username, expires_at, revoked_at, created_at, last_seen_at, ip_address, user_agent) VALUES (?, 'admin', '2099-01-01T00:00:00.000Z', NULL, '2026-01-01', '2026-01-01', NULL, NULL)")
  .run(await cryptoModule.hashToken(sessionToken, 'test-pepper'))
const cookieHeader = `admin_session=${sessionToken}`

// 14.1 无 Bearer → 401 Authentication required（且确实是 401，不是 404/500）
const noAuth = await callRoute({ path: '/whoami', method: 'GET' })
assert.equal(noAuth.ok, false)
assert.equal(noAuth.status, 401, 'GET /api/mcp/whoami without Authorization must be 401')
assert.equal(noAuth.message, 'Authentication required')

// 14.2 合法 Bearer → 回显四个字段，且绝不回显 token 明文
const who = await callRoute({ path: '/whoami', method: 'GET', headers: { authorization: bearer } })
assert.equal(who.ok, true)
assert.deepEqual(Object.keys(who.value).sort(), ['expiresAt', 'label', 'scopes', 'username'])
assert.equal(who.value.username, 'admin')
assert.equal(who.value.label, 'route-test')
assert.equal('token' in who.value, false, 'whoami must not return the plaintext token')
assert.equal(JSON.stringify(who.value).includes(routeToken.token), false)

// 14.3 Cookie 分支只认 Cookie：带合法 Bearer + 无 cookie → 401（不能拿 Bearer 当会话）
const bearerOnCookieRoute = await callRoute({ path: '/tokens', method: 'GET', headers: { authorization: bearer } })
assert.equal(bearerOnCookieRoute.ok, false)
assert.equal(bearerOnCookieRoute.status, 400, 'an Authorization header on a cookie route must be rejected outright')
assert.equal(bearerOnCookieRoute.message, 'Authorization headers are not accepted on cookie-authenticated routes')
const noCookieNoBearer = await callRoute({ path: '/tokens', method: 'GET' })
assert.equal(noCookieNoBearer.status, 401, 'GET /api/mcp/tokens without a session must be 401')

// 14.4 Bearer 分支完全不看 Cookie：带合法 cookie + 无 Authorization → 401
const cookieOnBearerRoute = await callRoute({ path: '/whoami', method: 'GET', cookie: cookieHeader })
assert.equal(cookieOnBearerRoute.ok, false)
assert.equal(cookieOnBearerRoute.status, 401, 'a valid session cookie must not authenticate a Bearer route')
assert.equal(cookieOnBearerRoute.message, 'Authentication required')

// 14.5 Cookie 分支的合法路径：有会话 → 列表，且列表不含任何明文 token
const tokenList = await callRoute({ path: '/tokens', method: 'GET', cookie: cookieHeader })
assert.equal(tokenList.ok, true)
assert.ok(Array.isArray(tokenList.value.tokens))
assert.equal(JSON.stringify(tokenList.value).includes(routeToken.token), false)
assert.equal(JSON.stringify(tokenList.value).includes(readOnlyToken.token), false)

// 14.6 Cookie 变更路由：CSRF 检查必须先于会话查询
// 无会话 + 非法 Origin → 403（若顺序反了，缺会话会先抛 401）
const crossOriginRevoke = await callRoute({
  path: '/tokens/1/revoke', method: 'POST', origin: 'https://evil.example'
})
assert.equal(crossOriginRevoke.ok, false)
assert.equal(crossOriginRevoke.status, 403, 'assertSafeMutation must run before requireAdminSession')
assert.equal(crossOriginRevoke.message, 'Cross-origin request rejected')

// 14.6a 同一请求加上合法会话仍是 403：证明挡住它的是 Origin，不是会话缺失
const crossOriginWithSession = await callRoute({
  path: '/tokens/1/revoke', method: 'POST', origin: 'https://evil.example', cookie: cookieHeader
})
assert.equal(crossOriginWithSession.status, 403)

// 14.6b 同源但无会话 → 401（证明 403 不是唯一出口，会话确实被要求）
const sameOriginNoSession = await callRoute({ path: '/tokens/1/revoke', method: 'POST', origin: 'https://wasd09090030.top' })
assert.equal(sameOriginNoSession.ok, false)
assert.equal(sameOriginNoSession.status, 401, 'same-origin revoke without a session must be 401')

// 14.6c 同源 + 有效会话 + 不存在的 id → 404（证明会话通过后才查行）
const revokeMissing = await callRoute({ path: '/tokens/99999/revoke', method: 'POST', origin: 'https://wasd09090030.top', cookie: cookieHeader })
assert.equal(revokeMissing.ok, false)
assert.equal(revokeMissing.status, 404, 'revoking an unknown id must be 404')

// 14.7 签发路由的 Origin 规则：没有 Origin（CLI）必须放行。
// 这条放在所有其它签发断言之前，否则「Origin 被改成无条件校验」会先在别处以 400 vs 403 暴露。
const noOriginIssue = await callRoute({
  path: '/token', method: 'POST',
  body: { username: 'admin', password: 'route-test-password', label: 'no-origin' }
})
assert.equal(noOriginIssue.ok, true, 'a CLI client sends no Origin and must still be able to issue a token')

// 14.7a 未知 scope → 400 且不落库
const beforeCount = db.prepare('SELECT COUNT(*) AS n FROM mcp_tokens').get().n
const unknownScope = await callRoute({
  path: '/token', method: 'POST',
  body: { username: 'admin', password: 'route-test-password', label: 'bad', scopes: ['admin:all'] }
})
assert.equal(unknownScope.ok, false)
assert.equal(unknownScope.status, 400)
assert.ok(String(unknownScope.message).includes('admin:all'), 'the 400 must name the offending scope')
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mcp_tokens').get().n, beforeCount, 'a rejected scope must not issue a token')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mcp_tokens WHERE label = 'bad'").get().n, 0)

// 14.7b 空数组 → 400（不能 fail open 成默认全权限）
const emptyScopes = await callRoute({
  path: '/token', method: 'POST',
  body: { username: 'admin', password: 'route-test-password', label: 'empty', scopes: [] }
})
assert.equal(emptyScopes.ok, false)
assert.equal(emptyScopes.status, 400, 'scopes: [] must not fall back to the default full scope set')
assert.ok(/omit/i.test(String(emptyScopes.message)), 'the 400 must say omitting scopes means the default')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mcp_tokens WHERE label = 'empty'").get().n, 0)

// 14.7c scopes 不是数组 → 400
const badScopesType = await callRoute({
  path: '/token', method: 'POST',
  body: { username: 'admin', password: 'route-test-password', label: 'notarray', scopes: 'mcp:read' }
})
assert.equal(badScopesType.status, 400)

// 14.7d 签发成功 → 201 + 明文 token；用该 token 能过 whoami
const issuedViaRoute = await callRoute({
  path: '/token', method: 'POST',
  body: { username: 'admin', password: 'route-test-password', label: 'via-route', scopes: ['mcp:read'] }
})
assert.equal(issuedViaRoute.ok, true)
assert.equal(issuedViaRoute.status, 201, 'issuance must set 201')
assert.ok(String(issuedViaRoute.value.token).startsWith('bmcp_'))
assert.equal(issuedViaRoute.value.tokenPrefix, issuedViaRoute.value.token.slice(0, 12))
assert.deepEqual(issuedViaRoute.value.scopes, ['mcp:read'], 'requested scopes must be honored exactly')

// 14.7e 密码错误 → 401；must_reset → 403
const wrongPassword = await callRoute({
  path: '/token', method: 'POST', body: { username: 'admin', password: 'wrong-password', label: 'x' }
})
assert.equal(wrongPassword.status, 401)
assert.equal(wrongPassword.message, 'Invalid username or password')
db.prepare("UPDATE admin_users SET must_reset = 1 WHERE username = 'admin'").run()
const mustResetIssue = await callRoute({
  path: '/token', method: 'POST', body: { username: 'admin', password: 'route-test-password', label: 'x' }
})
assert.equal(mustResetIssue.status, 403)
assert.equal(mustResetIssue.message, 'Password reset is required')
db.prepare("UPDATE admin_users SET must_reset = 0 WHERE username = 'admin'").run()

// 14.7f 错误 Origin → 403 且不落库；同源 Origin → 放行
const evilOrigin = await callRoute({
  path: '/token', method: 'POST', origin: 'https://evil.example',
  body: { username: 'admin', password: 'route-test-password', label: 'evil' }
})
assert.equal(evilOrigin.status, 403)
assert.equal(evilOrigin.message, 'Cross-origin request rejected')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM mcp_tokens WHERE label = 'evil'").get().n, 0, 'a rejected Origin must not issue a token')
const sameOriginIssue = await callRoute({
  path: '/token', method: 'POST', origin: 'https://wasd09090030.top',
  body: { username: 'admin', password: 'route-test-password', label: 'same-origin' }
})
assert.equal(sameOriginIssue.ok, true, 'a same-origin browser call must still be able to issue a token')

// 14.8 Bearer scope 分档：只读 token 能过 read 分支
const readOnlyWho = await callRoute({ path: '/whoami', method: 'GET', headers: { authorization: `Bearer ${readOnlyToken.token}` } })
assert.equal(readOnlyWho.ok, true)

// 14.8a 自吊销要求 mcp:read：仅 write 的 token 必须 403，随后 read token 才成功
const writeOnly = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'route-wo', scopes: ['mcp:write'] })
const writeOnlyRevoke = await callRoute({ path: '/token/revoke', method: 'POST', headers: { authorization: `Bearer ${writeOnly.token}` } })
assert.equal(writeOnlyRevoke.status, 403, 'self-revoke must require mcp:read')
assert.ok(String(writeOnlyRevoke.message).includes('Insufficient scope'))
const readOnlyRevoke = await callRoute({ path: '/token/revoke', method: 'POST', headers: { authorization: `Bearer ${readOnlyToken.token}` } })
assert.equal(readOnlyRevoke.ok, true)
assert.deepEqual(readOnlyRevoke.value, { success: true })
const revokedWho = await callRoute({ path: '/whoami', method: 'GET', headers: { authorization: `Bearer ${readOnlyToken.token}` } })
assert.equal(revokedWho.status, 401, 'a self-revoked token must stop working')

// 14.9 未知路径 → 404，而不是静默成功
const unknownRoute = await callRoute({ path: '/nope', method: 'GET' })
assert.equal(unknownRoute.status, 404)
assert.equal(unknownRoute.message, 'Unsupported MCP API route')

db.close()

console.log('MCP checks passed: tokens (format, scopes, TTL, issuance, enforcement, expiry, revocation, must_reset, redaction, credentials, password change/reset), list projection, pagination, diary defaults, route auth gates (bearer/cookie separation, CSRF ordering, scope validation).')

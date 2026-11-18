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
assert.notEqual(ctx.tokenHash, issued.token, 'the auth context must carry the hash, never the plaintext token')
assert.ok(ctx.tokenHash.length > 20, 'the hash must be a full digest, not a prefix')

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

// 10. label 校验 + username 校验
await assert.rejects(mcpToken.issueMcpToken(event, { username: 'admin', label: '' }), /label/)
await assert.rejects(mcpToken.issueMcpToken(event, { username: 'admin', label: 'x'.repeat(65) }), /label/)
// 空 username 会签发出一条永远过不了 authenticateMcpRequest 的孤儿 token，必须当场 400
await assert.rejects(mcpToken.issueMcpToken(event, { username: '   ', label: 'orphan' }), /username/)

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

// 成功分支同样要钉住：只测三条失败文案的话，把 loginAdmin 的成功返回值改坏（漏 session、
// 漏 expiresAt、不写 cookie）依然全绿。此时 ops 的密码是 correct-horse-battery、must_reset=0。
const loginEvent = httpEvent()
const loginResult = await authModule.loginAdmin(loginEvent, 'ops', 'correct-horse-battery')
assert.equal(loginResult.success, true)
assert.equal(loginResult.username, 'ops')
assert.ok(typeof loginResult.expiresAt === 'string' && loginResult.expiresAt.length > 0, 'a successful login must return an expiry')
assert.ok(Date.parse(loginResult.expiresAt) > Date.now(), 'the session expiry must be in the future')
assert.ok(loginEvent.node.res.headers['set-cookie'], 'a successful login must set the session cookie')

// 11a. 按 id 吊销必须带上 username 过滤：拿到别人的 token id 也不能吊销它
// 表里同时存在 admin 与 ops 两行，所以这里失败只能是因为过滤条件，而不是「该用户不存在」。
const foreignTarget = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'foreign-revoke-target' })
await assert.rejects(mcpToken.revokeMcpTokenById(event, foreignTarget.record.id, 'ops'), /Token not found/, 'revoking another account\'s token id must fail')
const survivor = await mcpToken.authenticateMcpRequest(event, `Bearer ${foreignTarget.token}`, 'mcp:read')
assert.equal(survivor.username, 'admin', 'a rejected revoke must leave the token usable')

// 改密/重置共用的吊销语句：把 ops 的 token 准备好的，执行语句后必须失效
// 这条语句的唯一所有者是 mcp-token.ts（auth.ts 直接 import），所以测试也从那里取；
// 它被接进两个 batch 这件事由 section 12 走真实领域函数证明。
const opsToken = await mcpToken.issueMcpToken(event, { username: 'ops', label: 'laptop' })
const statement = mcpToken.revokeMcpTokensStatement('ops', new Date().toISOString())
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
function routeEvent({ path, method = 'GET', headers = {}, body, cookie, origin, query, requestUrl = 'https://wasd09090030.top/api/mcp' }) {
  const requestHeaders = { host: 'wasd09090030.top', ...headers }
  // Only default the content type when the caller did not set one: the images
  // upload case needs a real multipart boundary header to reach `uploadMedia`.
  if (body !== undefined && !requestHeaders['content-type']) requestHeaders['content-type'] = 'application/json'
  if (cookie) requestHeaders.cookie = cookie
  // The Origin header is the *caller's* origin and must stay independent of the
  // request URL (the resource being fetched). Deriving one from the other would
  // make every request look same-origin and silently neuter assertSafeMutation.
  if (origin) requestHeaders.origin = origin
  // `query` lands in the request URL only. The router param must stay the bare
  // pathname, otherwise `routeParts` would see `articles?pageSize=2` as one segment.
  const search = query ? `?${new URLSearchParams(query)}` : ''
  const runtime = { env: { ...event.context.cloudflare.env, BLOG_DB: adapter }, request: new Request(requestUrl + path + search) }
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
    path: '/api/mcp' + path + search,
    method,
    node: { req: { url: '/api/mcp' + path + search, method, headers: requestHeaders, body }, res },
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
// WWW-Authenticate 只在真实 HTTP event 上设置；本 stub 有 node.res，所以这里必须能看到。
assert.equal(noAuth.headers['WWW-Authenticate'], 'Bearer', 'a 401 must advertise the Bearer challenge')

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

// ---------------------------------------------------------------------------
// 15. 业务组：投影、分页、scope 分档、日记可见性默认值
// 手工 curl 只能证明「某次跑通」，证明不了「列表没把正文带出来」这类回归。
// 这里用真实领域函数 + 内存 D1 驱动路由，覆盖设计文档 §5.4 的业务端点。
// ---------------------------------------------------------------------------
db.prepare("INSERT INTO articles (id, title, slug, content, content_markdown, category, tags, ai_summary, created_at, updated_at) VALUES (1, 'Alpha', 'alpha', ?, ?, 'study', '[\"x\"]', 'summary-a', '2026-01-01', '2026-01-01')")
  .run('body-a-'.repeat(50), 'markdown-a-'.repeat(30))
db.prepare("INSERT INTO articles (id, title, slug, content, content_markdown, category, tags, ai_summary, created_at, updated_at) VALUES (2, 'Beta', 'beta', ?, ?, 'game', '[]', NULL, '2026-01-02', '2026-01-02')")
  .run('body-b', 'markdown-b')

// 15.1 文章列表必须投影：无 content / contentMarkdown，有 contentLength
// Section 14 self-revoked `readOnlyToken`, so the read-only leg needs a fresh one.
// A write-only token is needed throughout too: it is the only way to tell a
// `requireScope('mcp:read')` gate from one that accepts any authenticated token.
const businessReadOnly = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'business-ro', scopes: ['mcp:read'] })
const readOnlyBearer = `Bearer ${businessReadOnly.token}`
const businessWriteOnly = await mcpToken.issueMcpToken(event, { username: 'admin', label: 'business-wo', scopes: ['mcp:write'] })
const writeOnlyBearer = `Bearer ${businessWriteOnly.token}`
const articleList = await callRoute({ path: '/articles', method: 'GET', headers: { authorization: bearer } })
assert.equal(articleList.ok, true)
assert.equal(articleList.value.total, 2)
assert.deepEqual(Object.keys(articleList.value.data[0]).sort(), ['aiSummary', 'category', 'contentLength', 'createdAt', 'id', 'slug', 'tags', 'title', 'updatedAt'])
assert.equal(JSON.stringify(articleList.value).includes('body-a-'), false, 'article list must not return the content column')
assert.equal(JSON.stringify(articleList.value).includes('markdown-a-'), false, 'article list must not return contentMarkdown')
assert.equal(articleList.value.data.find(row => row.id === 1).contentLength, 'body-a-'.repeat(50).length)

// 15.2 列表分页：默认 20、上限 50，page 生效
assert.equal((await callRoute({ path: '/articles', method: 'GET', headers: { authorization: bearer } })).value.pageSize, 20)
assert.equal((await callRoute({ path: '/articles', method: 'GET', headers: { authorization: bearer }, query: { pageSize: '9999' } })).value.pageSize, 50, 'articles pageSize must be capped at 50')
assert.equal((await callRoute({ path: '/articles', method: 'GET', headers: { authorization: bearer }, query: { pageSize: '1', page: '2' } })).value.data[0].id, 1, 'page 2 of size 1 must be the older article')

// 15.3 全文只从 articles/:id 取
const articleDetail = await callRoute({ path: '/articles/1', method: 'GET', headers: { authorization: bearer } })
assert.equal(articleDetail.ok, true)
assert.equal(articleDetail.value.id, 1)
assert.ok(String(articleDetail.value.content).startsWith('body-a-'))
const missingArticle = await callRoute({ path: '/articles/999999', method: 'GET', headers: { authorization: bearer } })
assert.equal(missingArticle.status, 404)

// 15.3a 详情分支的读层级同样是 mcp:read：只读 token 能读，只写 token 必须被挡。
// 用 read+write 的 bearer 测详情只能证明「分支可达」，证明不了它要的是 read。
assert.equal((await callRoute({ path: '/articles/1', method: 'GET', headers: { authorization: readOnlyBearer } })).ok, true, 'GET articles/:id must accept mcp:read')
const detailAsWriteOnly = await callRoute({ path: '/articles/1', method: 'GET', headers: { authorization: writeOnlyBearer } })
assert.equal(detailAsWriteOnly.status, 403, 'GET articles/:id must require mcp:read specifically')
assert.ok(String(detailAsWriteOnly.message).includes('Insufficient scope: mcp:read'))

// 15.4 只读 token 写文章 → 403；读 token 能读
const roCreate = await callRoute({ path: '/articles', method: 'POST', headers: { authorization: readOnlyBearer }, body: { title: 'x', contentMarkdown: 'y' } })
assert.equal(roCreate.ok, false)
assert.equal(roCreate.status, 403, 'a read-only token must not create an article')
assert.ok(String(roCreate.message).includes('Insufficient scope'))
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM articles WHERE title = 'x'").get().n, 0, 'a rejected write must not insert a row')

// 15.4a PUT articles/:id 也要 write：只读 token 403 且不改行，写 token 真的能改。
// 只测 POST 的话，把 PUT 的 scope 降成 mcp:read 依然全绿。
const roUpdate = await callRoute({ path: '/articles/1', method: 'PUT', headers: { authorization: readOnlyBearer }, body: { title: 'Should Not Apply' } })
assert.equal(roUpdate.ok, false)
assert.equal(roUpdate.status, 403, 'a read-only token must not update an article')
assert.ok(String(roUpdate.message).includes('Insufficient scope: mcp:write'))
assert.equal(db.prepare('SELECT title FROM articles WHERE id = 1').get().title, 'Alpha', 'a rejected update must not change the row')

// 15.5 写 token 建文章 → 201，且 id 只来自路径
const created = await callRoute({ path: '/articles', method: 'POST', headers: { authorization: bearer }, body: { title: 'Gamma', contentMarkdown: 'gamma body' } })
assert.equal(created.ok, true)
assert.equal(created.status, 201, 'article creation must set 201')
assert.equal(created.value.title, 'Gamma')
// body 里的 id 不是 updateArticle 的入参：路径 id=1 时不得改到 id=2
const sneakyUpdate = await callRoute({ path: '/articles/1', method: 'PUT', headers: { authorization: bearer }, body: { id: 2, title: 'Alpha updated' } })
assert.equal(sneakyUpdate.ok, true)
assert.equal(sneakyUpdate.value.id, 1)
assert.equal(db.prepare('SELECT title FROM articles WHERE id = 1').get().title, 'Alpha updated')
assert.equal(db.prepare('SELECT title FROM articles WHERE id = 2').get().title, 'Beta', 'an id in the body must not retarget the write')

// 15.5b DELETE /articles/:id：只读 token 403 且行仍在；写 token 真删；重复删除 404
const roArticleDelete = await callRoute({ path: '/articles/2', method: 'DELETE', headers: { authorization: readOnlyBearer } })
assert.equal(roArticleDelete.ok, false)
assert.equal(roArticleDelete.status, 403, 'a read-only token must not delete an article')
assert.ok(String(roArticleDelete.message).includes('Insufficient scope: mcp:write'))
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM articles WHERE id = 2').get().n, 1, 'a rejected delete must not remove the row')
const articleDeleted = await callRoute({ path: '/articles/2', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(articleDeleted.ok, true)
assert.deepEqual(articleDeleted.value, { success: true, deleted: 2 })
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM articles WHERE id = 2').get().n, 0)
const articleDeleteAgain = await callRoute({ path: '/articles/2', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(articleDeleteAgain.status, 404, 'deleting a missing article must be 404')

// 15.5c PUT /articles/:id 传 coverImage: null 必须同时清空 cover_image 与 cover_image_asset_id。
// 资产 id 必须先真的挂上：fixture 直接设成 NULL 的话，这条断言不靠任何实现也能通过。
db.prepare("INSERT INTO image_assets (id, public_id, storage_key, source_url, content_type, version, kind, is_active, created_at, updated_at) VALUES (9001, 'i_assetcover1234', 'uploads/cover.webp', 'https://cfimg.example/file/uploads/cover.webp', 'image/webp', 1, 'article_cover', 1, '2026-01-01', '2026-01-01')").run()
db.prepare("UPDATE articles SET cover_image = 'https://cfimg.example/file/uploads/cover.webp', cover_image_asset_id = 9001 WHERE id = 1").run()
const cleared = await callRoute({ path: '/articles/1', method: 'PUT', headers: { authorization: bearer }, body: { coverImage: null } })
assert.equal(cleared.ok, true)
assert.equal(cleared.value.coverImage, null)
const clearedRow = db.prepare('SELECT cover_image, cover_image_asset_id FROM articles WHERE id = 1').get()
assert.equal(clearedRow.cover_image, null, 'coverImage: null must clear the cover column')
assert.equal(clearedRow.cover_image_asset_id, null, 'coverImage: null must also clear the linked asset id')

// 15.5d 非规范 id 片段：响应里的 deleted 必须等于 requireId 真正解析出的 id
const oddArticleDelete = await callRoute({ path: '/articles/1x', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(oddArticleDelete.ok, true)
assert.deepEqual(oddArticleDelete.value, { success: true, deleted: 1 }, 'deleted must name the row that was actually removed')
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM articles WHERE id = 1').get().n, 0)

// 15.6 画廊：投影不做，但必须分页；scope 分档
db.prepare("INSERT INTO galleries (id, image_url, sort_order, is_active, tag, created_at, updated_at) VALUES (1, 'https://cfimg.example/a.webp', 0, 1, 'artwork', '2026-01-01', '2026-01-01')").run()
const galleryList = await callRoute({ path: '/gallery', method: 'GET', headers: { authorization: bearer } })
assert.equal(galleryList.ok, true)
assert.equal(galleryList.value.total, 1)
assert.equal(galleryList.value.pageSize, 100, 'gallery default pageSize is 100')
assert.equal((await callRoute({ path: '/gallery', method: 'GET', headers: { authorization: bearer }, query: { pageSize: '9999' } })).value.pageSize, 200, 'gallery pageSize must be capped at 200')
const roGalleryCreate = await callRoute({ path: '/gallery', method: 'POST', headers: { authorization: readOnlyBearer }, body: { imageUrl: 'https://cfimg.example/b.webp' } })
assert.equal(roGalleryCreate.status, 403, 'a read-only token must not create a gallery item')

// 15.6a POST /gallery 成功路径：201 + 落库（只测 403 的话分支可达性没被覆盖）
const galleryCreated = await callRoute({ path: '/gallery', method: 'POST', headers: { authorization: bearer }, body: { imageUrl: 'https://cfimg.example/b.webp', tag: 'screenshot' } })
assert.equal(galleryCreated.ok, true)
assert.equal(galleryCreated.status, 201, 'gallery creation must set 201')
assert.equal(galleryCreated.value.tag, 'screenshot')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM galleries WHERE tag = 'screenshot'").get().n, 1)

// 15.6b PATCH gallery/:id 也要 write：只读 token 403 且不改行，写 token 真的能改
const roGalleryPatch = await callRoute({ path: '/gallery/1', method: 'PATCH', headers: { authorization: readOnlyBearer }, body: { tag: 'hijacked' } })
assert.equal(roGalleryPatch.ok, false)
assert.equal(roGalleryPatch.status, 403, 'a read-only token must not update a gallery item')
assert.ok(String(roGalleryPatch.message).includes('Insufficient scope: mcp:write'))
assert.equal(db.prepare('SELECT tag FROM galleries WHERE id = 1').get().tag, 'artwork', 'a rejected patch must not change the row')
const galleryPatched = await callRoute({ path: '/gallery/1', method: 'PATCH', headers: { authorization: bearer }, body: { tag: 'landscape' } })
assert.equal(galleryPatched.ok, true)
assert.equal(galleryPatched.value.id, 1)
assert.equal(galleryPatched.value.tag, 'landscape')
assert.equal(db.prepare('SELECT tag FROM galleries WHERE id = 1').get().tag, 'landscape')

// 15.6c DELETE /gallery/:id：只读 403；写 token 到达领域层（本地无图床配置 → 503，不是 404），记录保留
const roGalleryDelete = await callRoute({ path: '/gallery/1', method: 'DELETE', headers: { authorization: readOnlyBearer } })
assert.equal(roGalleryDelete.status, 403, 'a read-only token must not delete a gallery item')
const galleryDelete = await callRoute({ path: '/gallery/1', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(galleryDelete.status, 503, 'deleteGallery needs the image provider; a missing config must not look like a missing route')
assert.match(String(galleryDelete.message), /IMAGE_API_BASE_URL/)
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM galleries WHERE id = 1').get().n, 1, 'a failed media cleanup must keep the gallery row')

// 15.7 日记：默认不公开，且必须分页
const diaryWrite = await callRoute({ path: '/diary/2026-11-16', method: 'PUT', headers: { authorization: bearer }, body: { contentMarkdown: 'mcp default check' } })
assert.equal(diaryWrite.ok, true)
assert.equal(diaryWrite.value.isPublic, false, 'diary_upsert must default to private when isPublic is omitted')
assert.equal(diaryWrite.value.entryDate, '2026-11-16')
const diaryPublic = await callRoute({ path: '/diary/2026-11-17', method: 'PUT', headers: { authorization: bearer }, body: { contentMarkdown: 'public one', isPublic: true } })
assert.equal(diaryPublic.value.isPublic, true, 'an explicit isPublic: true must still be honored')
const diaryList = await callRoute({ path: '/diary', method: 'GET', headers: { authorization: bearer } })
assert.equal(diaryList.ok, true)
assert.equal(diaryList.value.total, 2)
assert.equal(diaryList.value.pageSize, 50, 'diary default pageSize is 50')
assert.equal((await callRoute({ path: '/diary', method: 'GET', headers: { authorization: bearer }, query: { pageSize: '9999' } })).value.pageSize, 100, 'diary pageSize must be capped at 100')
const roDiaryWrite = await callRoute({ path: '/diary/2026-11-18', method: 'PUT', headers: { authorization: readOnlyBearer }, body: { contentMarkdown: 'nope' } })
assert.equal(roDiaryWrite.status, 403, 'a read-only token must not write a diary entry')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date = '2026-11-18'").get().n, 0)

// 15.7a DELETE /diary/:date：只读 403；写 token 删掉；重复删除 404
const roDiaryDelete = await callRoute({ path: '/diary/2026-11-16', method: 'DELETE', headers: { authorization: readOnlyBearer } })
assert.equal(roDiaryDelete.status, 403, 'a read-only token must not delete a diary entry')
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date = '2026-11-16'").get().n, 1)
const diaryDeleted = await callRoute({ path: '/diary/2026-11-16', method: 'DELETE', headers: { authorization: bearer } })
assert.equal(diaryDeleted.ok, true)
assert.deepEqual(diaryDeleted.value, { success: true, deleted: '2026-11-16' })
assert.equal(db.prepare("SELECT COUNT(*) AS n FROM diary_entries WHERE entry_date = '2026-11-16'").get().n, 0)
assert.equal((await callRoute({ path: '/diary/2026-11-16', method: 'DELETE', headers: { authorization: bearer } })).status, 404)

// 15.8 三个读列表都必须先过 mcp:read：无 token → 401，而不是 200/404/500
for (const path of ['/images', '/gallery', '/diary', '/articles']) {
  const unauthenticated = await callRoute({ path, method: 'GET' })
  assert.equal(unauthenticated.ok, false, `${path} without a token must not succeed`)
  assert.equal(unauthenticated.status, 401, `${path} without a token must be 401`)
  assert.equal(unauthenticated.message, 'Authentication required')
}

// 15.8a 读列表用的是 mcp:read，而不是 mcp:write：
// 只读 token 必须能读（不是 403），只写 token 必须被挡（403）。
// 只断言 401 无法区分「requireScope('mcp:read')」和「requireScope('mcp:write')」。
for (const path of ['/articles', '/gallery', '/diary']) {
  const asReadOnly = await callRoute({ path, method: 'GET', headers: { authorization: readOnlyBearer } })
  assert.equal(asReadOnly.ok, true, `${path} must be readable with mcp:read only`)
  const asWriteOnly = await callRoute({ path, method: 'GET', headers: { authorization: writeOnlyBearer } })
  assert.equal(asWriteOnly.status, 403, `${path} must require mcp:read specifically, not any token`)
  assert.ok(String(asWriteOnly.message).includes('Insufficient scope'))
}
// images 在本地缺少图床凭证，因此用「不是 403」来证明它过的是 read 门而不是 write 门。
const imagesAsReadOnly = await callRoute({ path: '/images', method: 'GET', headers: { authorization: readOnlyBearer }, query: { count: '2' } })
assert.notEqual(imagesAsReadOnly.status, 403, 'GET /images must accept mcp:read')
assert.equal(imagesAsReadOnly.status, 503)
const imagesAsWriteOnly = await callRoute({ path: '/images', method: 'GET', headers: { authorization: writeOnlyBearer } })
assert.equal(imagesAsWriteOnly.status, 403, 'GET /images must not accept a write-only token')

// 15.9 images：读分支要 mcp:read，写分支要 mcp:write。
// 本地没有图床凭证，因此只断言「鉴权通过后交给领域层」，不断言上游成功。
// 503 而不是 401/404 正好证明 Bearer 与 scope 都已通过，卡住它的是图床配置。
const imagesRead = await callRoute({ path: '/images', method: 'GET', headers: { authorization: bearer }, query: { count: '2' } })
assert.equal(imagesRead.ok, false)
assert.equal(imagesRead.status, 503, 'without image-provider config the read reaches the provider and fails there')
assert.match(String(imagesRead.message), /not configured/, 'the 503 must come from the image provider config, not from a guard')
const imagesUploadAsReadOnly = await callRoute({ path: '/images', method: 'POST', headers: { authorization: readOnlyBearer }, body: {} })
assert.equal(imagesUploadAsReadOnly.status, 403, 'POST /images must require mcp:write')

// 15.10 POST /images 不能先被 readBody 吃掉请求体：非 multipart → 领域层 400
const imagesNotMultipart = await callRoute({ path: '/images', method: 'POST', headers: { authorization: bearer }, body: {} })
assert.equal(imagesNotMultipart.ok, false)
assert.equal(imagesNotMultipart.status, 400, 'uploadMedia must own the body and reject a non-multipart request itself')
assert.equal(imagesNotMultipart.message, 'Upload must use multipart/form-data')

// 15.11 multipart 请求体必须原样到达 uploadMedia（同样的无图床凭证 → 503）
// The body is a one-shot stream on purpose: a `readBody` before the upload branch
// would consume it, leaving `readMultipartFormData` with nothing (or a locked
// stream) instead of the file. A Buffer could be read twice here and would hide
// exactly the bug this assertion exists for.
const boundary = '----mcp-check-boundary'
const multipartPayload = Buffer.from(
  `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="ping.png"\r\nContent-Type: image/png\r\n\r\nPNGDATA\r\n--${boundary}--\r\n`,
  'utf8'
)
const multipartStream = () => new ReadableStream({
  start(controller) { controller.enqueue(new Uint8Array(multipartPayload)); controller.close() }
})
const imagesMultipart = await callRoute({
  path: '/images', method: 'POST',
  headers: { authorization: bearer, 'content-type': `multipart/form-data; boundary=${boundary}` },
  body: multipartStream()
})
assert.equal(imagesMultipart.ok, false)
assert.equal(imagesMultipart.status, 503, 'the multipart file must reach the provider call; a consumed/locked body would not')

// 15.11a folder 覆盖：非法目录在碰图床之前就被拒（400），合法目录照常进入图床调用（503）
// query 解析、normalizePrefix 与 provider 调用的先后顺序由这两个状态码一起钉住。
const badFolderUpload = await callRoute({
  path: '/images', method: 'POST',
  headers: { authorization: bearer, 'content-type': `multipart/form-data; boundary=${boundary}` },
  query: { folder: '../etc' },
  body: multipartStream()
})
assert.equal(badFolderUpload.status, 400, 'a traversal folder must be rejected before the provider call')
assert.equal(badFolderUpload.message, 'Invalid media prefix')
const okFolderUpload = await callRoute({
  path: '/images', method: 'POST',
  headers: { authorization: bearer, 'content-type': `multipart/form-data; boundary=${boundary}` },
  query: { folder: 'Study' },
  body: multipartStream()
})
assert.equal(okFolderUpload.status, 503, 'a valid folder must reach the image provider (not configured in this harness)')

// 15.12 ops / ai 分支存在且要 mcp:write（本地无 hook、无 DeepSeek key，所以走到上游失败）
const roDeploy = await callRoute({ path: '/ops/pages/deploy', method: 'POST', headers: { authorization: readOnlyBearer } })
assert.equal(roDeploy.status, 403, 'ops/pages/deploy must require mcp:write')
const deploy = await callRoute({ path: '/ops/pages/deploy', method: 'POST', headers: { authorization: bearer } })
// No PAGES_DEPLOY_HOOK_URL here, so the domain falls back to CLOUDFLARE_API_TOKEN
// and `getRequiredSecret` throws inside its try/catch — the timeout envelope turns
// that into a deterministic 504. Exact status, plus the 404 proof that the branch
// itself exists rather than falling through.
assert.notEqual(deploy.status, 404, 'the deploy branch must be routed, not fall through to the 404')
assert.equal(deploy.status, 504, 'with no deploy hook/secret the domain reports its timeout envelope')
const roSummary = await callRoute({ path: '/ai/summary', method: 'POST', headers: { authorization: readOnlyBearer }, body: { title: 't', content: 'c' } })
assert.equal(roSummary.status, 403, 'ai/summary must require mcp:write')
const summary = await callRoute({ path: '/ai/summary', method: 'POST', headers: { authorization: bearer }, body: { title: 't', content: 'c' } })
assert.equal(summary.status, 503, 'the summary branch must be routed (missing DEEPSEEK_API_KEY → 503, not 404)')

// 15.13 不存在的业务路径仍是 404
assert.equal((await callRoute({ path: '/articles/1/nope', method: 'GET', headers: { authorization: bearer } })).status, 404)
// 图床文件删除仍是明确非目标：deleteMedia 没有引用检查，删掉被引用的图会直接坏图
assert.equal((await callRoute({ path: '/images', method: 'DELETE', headers: { authorization: bearer } })).status, 404, 'there must be no media delete capability')

db.close()

console.log('MCP checks passed: tokens (format, scopes, TTL, issuance, enforcement, expiry, revocation, must_reset, redaction, credentials, password change/reset), list projection, pagination, diary defaults, route auth gates (bearer/cookie separation, CSRF ordering, scope validation), business routes (article list projection + pagination, detail fetch, write scope, id from path, gallery/diary pagination, diary private default, image read/write split, multipart body ownership, ops/ai routing, article/gallery/diary delete capability (scope-gated, row removal, 404 on repeat, no media delete).')

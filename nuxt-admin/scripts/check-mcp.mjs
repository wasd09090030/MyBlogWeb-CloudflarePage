import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { createError, getRequestURL } from 'h3'
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

db.close()

console.log('MCP checks passed: tokens (format, scopes, TTL, issuance, enforcement, expiry, revocation, must_reset, redaction, credentials, password change/reset), list projection, pagination, diary defaults.')

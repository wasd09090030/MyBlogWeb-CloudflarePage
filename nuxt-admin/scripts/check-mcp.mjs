import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
import { createError } from 'h3'

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

console.log('MCP token checks passed: format, scopes, TTL clamp, issuance, scopes enforcement, expiry, revocation, must_reset, list redaction.')

/**
 * 凭证文件读写。位置在仓库之外，不会被提交：
 * - Windows: %APPDATA%\blog-mcp\credentials.json
 * - 其他: $XDG_CONFIG_HOME/blog-mcp/credentials.json，回退 ~/.config/blog-mcp/credentials.json
 *
 * 这里不做任何日志输出，token 只存在文件里。
 */
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/**
 * @typedef {object} Credentials
 * @property {string} baseUrl
 * @property {string} token
 * @property {string} tokenPrefix
 * @property {string} username
 * @property {string} label
 * @property {string[]} scopes
 * @property {string} expiresAt
 */

/**
 * 凭证文件绝对路径。
 * @returns {string}
 */
export function credentialsPath() {
  const configHome = process.platform === 'win32'
    ? process.env.APPDATA || join(homedir(), 'AppData', 'Roaming')
    : process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
  return join(configHome, 'blog-mcp', 'credentials.json')
}

/**
 * @param {unknown} value
 * @returns {value is Credentials}
 */
function isCredentials(value) {
  if (!value || typeof value !== 'object') return false
  const c = /** @type {Record<string, unknown>} */ (value)
  return typeof c.baseUrl === 'string' && c.baseUrl !== ''
    && typeof c.token === 'string' && c.token !== ''
    && typeof c.tokenPrefix === 'string'
    && typeof c.username === 'string'
    && typeof c.label === 'string'
    && Array.isArray(c.scopes) && c.scopes.every(scope => typeof scope === 'string')
    && typeof c.expiresAt === 'string'
}

/**
 * 读取凭证；文件不存在、不是合法 JSON 或字段缺失时返回 null，绝不抛异常。
 * @returns {Credentials | null}
 */
export function readCredentials() {
  let raw
  try {
    raw = readFileSync(credentialsPath(), 'utf8')
  } catch {
    return null
  }
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  return isCredentials(parsed) ? parsed : null
}

/**
 * 写入凭证并尽量把权限收紧到 600（Windows 上 chmod 语义有限，失败忽略）。
 * @param {Credentials} credentials
 */
export function writeCredentials(credentials) {
  const file = credentialsPath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(file, 0o600)
  } catch {
    // Windows 上不生效，依赖用户目录 ACL
  }
}

/** 删除凭证文件；不存在时静默通过。 */
export function clearCredentials() {
  rmSync(credentialsPath(), { force: true })
}

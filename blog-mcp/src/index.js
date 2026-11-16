#!/usr/bin/env node
/**
 * blog-mcp CLI：login / logout / status / serve。
 *
 * 输出纪律：`serve` 的 stdout 只承载 JSON-RPC，所以提示、进度和错误一律写
 * stderr；只有命令的最终结果（登录成功、status 报告）写 stdout。
 * token 从头到尾只落在凭证文件里，任何命令都不打印它。
 */
import { hostname } from 'node:os'
import { parseArgs } from 'node:util'
import readline from 'node:readline'
import { ApiError, createApiClient, formatApiError } from './api.js'
import { resolveBaseUrl } from './config.js'
import { clearCredentials, credentialsPath, readCredentials, writeCredentials } from './credentials.js'
import { serveStdio } from './server.js'

const DEFAULT_LABEL_MAX = 64
const MIN_DAYS = 1
const MAX_DAYS = 90

/** 命令行用法。 */
const USAGE = `用法:
  blog-mcp login  [--label <name>] [--read-only] [--days <1-90>]
  blog-mcp logout
  blog-mcp status
  blog-mcp serve
`

/**
 * 逐字符读取一行。用户名正常回显，密码只回显 `*`。
 *
 * 这里不用 readline 的 `question`：交互式读密码要关回显，而 readline 会把
 * 管道里的后续行缓冲走，导致密码读不到。直接吃 keypress 事件对 TTY 和管道
 * 都是一条路径。
 *
 * 关键细节：一次 ask 结束到下一次 ask 注册之间，stdin 上仍可能同步派发事件
 * （管道里两行常常在同一个 chunk 里）。所以事件先进队列，ask 开始时先把队列
 * 排空，否则第二行会被丢掉。
 *
 * 第二个坑是 CRLF：`emitKeypressEvents` 把 `\r\n` 拆成两个事件 —— `return`
 * 带 `\r`，紧跟一个 `enter` 带 `\n`。若只按键名判断，`return` 已结束第一行，
 * 那个孤立的 `enter` 会留在队列里，把第二行一问就当成空输入结束。Windows 的
 * cmd / PowerShell 管道全是 CRLF，所以必须吞掉成对的第二个事件。
 */
function createLineReader() {
  const stdin = process.stdin
  const canRawMode = typeof stdin.setRawMode === 'function'
  readline.emitKeypressEvents(stdin)
  stdin.resume()

  /** @type {Array<{ type: 'key', str?: string, key?: import('node:readline').Key } | { type: 'end' }>} */
  const queue = []
  /** @type {{ handle: (event: { type: 'key', str?: string, key?: import('node:readline').Key } | { type: 'end' }) => void } | null} */
  let active = null
  /**
   * 上一次 `return` 之后是否还在等 CRLF 的配对的 `\n`。
   * @type {boolean}
   */
  let awaitingCrlfTail = false

  /** @type {(str: string | undefined, key: import('node:readline').Key | undefined) => void} */
  const onKeypress = (str, key) => {
    // CRLF 的第二个事件：`\n` 被 readline 命名为 `enter`，但单个 LF 也是
    // `enter`。区别在于它紧跟在 `return` 之后，且只隔这一个事件。
    const isCrlfTail = awaitingCrlfTail && key?.name === 'enter' && str === '\n'
    awaitingCrlfTail = key?.name === 'return'
    if (isCrlfTail) return
    const event = { type: 'key', str, key }
    if (active) active.handle(event)
    else queue.push(event)
  }
  const onEnd = () => {
    const event = { type: 'end' }
    if (active) active.handle(event)
    else queue.push(event)
  }
  stdin.on('keypress', onKeypress)
  stdin.on('end', onEnd)

  /**
   * @param {string} question
   * @param {{ hidden?: boolean }} [options]
   * @returns {Promise<string>}
   */
  function ask(question, { hidden = false } = {}) {
    return new Promise((resolveAnswer, rejectAnswer) => {
      let buffer = ''
      process.stderr.write(question)
      if (canRawMode) stdin.setRawMode(true)

      /** @param {string} text */
      const echo = (text) => process.stderr.write(text)

      let settled = false
      /** @param {string} value */
      const finish = (value) => {
        if (settled) return
        settled = true
        active = null
        if (canRawMode) stdin.setRawMode(false)
        process.stderr.write('\n')
        resolveAnswer(value)
      }

      /** @type {(event: { type: 'key', str?: string, key?: import('node:readline').Key } | { type: 'end' }) => void} */
      const handle = (event) => {
        if (settled) {
          queue.push(event)
          return
        }
        if (event.type === 'end') {
          // 管道输入结束但没换行：有内容就当输入完成，避免挂死
          if (buffer) return finish(buffer)
          settled = true
          active = null
          if (canRawMode) stdin.setRawMode(false)
          rejectAnswer(new Error('输入已结束，未读取到内容'))
          return
        }
        const { str, key } = event
        if (key?.ctrl && (key.name === 'c' || key.name === 'd')) {
          settled = true
          active = null
          if (canRawMode) stdin.setRawMode(false)
          process.stderr.write('\n')
          process.exit(130)
        }
        if (key?.name === 'return' || key?.name === 'enter') return finish(buffer)
        if (key?.name === 'backspace' || key?.name === 'delete') {
          if (buffer.length > 0) {
            buffer = buffer.slice(0, -1)
            // 已回显一个字符（密码是 *），删掉它
            echo('\b \b')
          }
          return
        }
        if (str && !key?.ctrl && !key?.meta) {
          buffer += str
          echo(hidden ? '*' : str)
        }
      }

      active = { handle }
      // 排空 ask 之间积压的事件；一旦 settle，handle 会把剩余事件放回队列
      while (queue.length > 0 && !settled) active.handle(/** @type {any} */ (queue.shift()))
      if (settled) {
        // finish 之前没有别的 ask 接手，剩余事件仍在 queue 里，下一次 ask 会用
        active = null
      }
    })
  }

  return {
    ask,
    close() {
      stdin.removeListener('keypress', onKeypress)
      stdin.removeListener('end', onEnd)
      if (canRawMode) stdin.setRawMode(false)
      stdin.pause()
      stdin.unref?.()
    }
  }
}

/**
 * 登录时还没有 token，但 `POST /api/mcp/token` 不看 Authorization 头，
 * 所以复用同一个客户端即可（空 token 只影响这个不读取它的请求）。
 */
function createLoginClient() {
  return createApiClient({
    baseUrl: resolveBaseUrl(),
    token: '',
    tokenPrefix: '',
    username: '',
    label: '',
    scopes: [],
    expiresAt: ''
  })
}

/**
 * 解析 `--days`，越界或非整数直接报错，不交给服务端静默夹取。
 * @param {string | undefined} value
 * @returns {number | undefined}
 */
function parseDays(value) {
  if (value === undefined) return undefined
  const days = Number(value)
  if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) {
    throw new Error(`--days 必须是 ${MIN_DAYS}-${MAX_DAYS} 之间的整数`)
  }
  return days
}

/**
 * 登录错误分档：这里的 401 是「密码错」，不是「token 过期」，
 * 所以不能直接套 formatApiError 的 401 文案。
 * @param {unknown} error
 * @returns {string}
 */
function formatLoginError(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return '用户名或密码错误'
    if (error.status === 403 && /reset/i.test(error.message)) return '管理员密码需要重置，请先在后台完成重置'
    return formatApiError(error)
  }
  return formatApiError(error)
}

/** @param {string} message */
function fail(message) {
  console.error(message)
  process.exitCode = 1
}

/**
 * @param {{ label?: string, readOnly: boolean, days?: string }} options
 */
async function commandLogin(options) {
  const api = createLoginClient()
  const label = (options.label ?? hostname()).trim().slice(0, DEFAULT_LABEL_MAX)
  if (!label) throw new Error('--label 不能为空')
  // 参数在提示之前校验：别让用户输完密码才被告知 --days 非法
  const days = parseDays(options.days)

  const reader = createLineReader()
  let username
  let password
  try {
    username = (await reader.ask('用户名: ')).trim()
    password = await reader.ask('密码: ', { hidden: true })
  } finally {
    reader.close()
  }
  if (!username) throw new Error('用户名不能为空')
  if (!password) throw new Error('密码不能为空')

  // scopes 为 [] 会被服务端拒绝；只有 --read-only 才显式发送只读 scope，
  // 其余情况整个字段都省略，交给服务端发默认的读写 scope。
  /** @type {Record<string, unknown>} */
  const body = { username, password, label }
  if (options.readOnly) body.scopes = ['mcp:read']
  if (days !== undefined) body.expiresInDays = days

  const issued = /** @type {Record<string, any>} */ (await api.request('POST', '/api/mcp/token', { body }))
  const token = String(issued.token ?? '')
  if (!token) throw new Error('服务端没有返回 token')

  writeCredentials({
    baseUrl: resolveBaseUrl(),
    token,
    tokenPrefix: token.slice(0, 12),
    username: String(issued.username ?? username),
    label: String(issued.label ?? label),
    scopes: Array.isArray(issued.scopes) ? issued.scopes.map(String) : [],
    expiresAt: String(issued.expiresAt ?? '')
  })

  console.log(`已登录：${issued.label ?? label}，到期 ${issued.expiresAt}，scope ${(issued.scopes ?? []).join(', ')}`)
  console.log(`凭证已保存到 ${credentialsPath()}`)
}

async function commandLogout() {
  const credentials = readCredentials()
  if (!credentials) {
    console.log('本机没有已保存的凭证，无需退出')
    return
  }

  const api = createApiClient(credentials)
  try {
    await api.request('POST', '/api/mcp/token/revoke')
    console.log('已吊销服务端 token 并删除本机凭证')
  } catch (error) {
    // 401 说明 token 早就失效/被吊销了，本机凭证照样该删
    if (error instanceof ApiError && error.status === 401) {
      console.log('服务端 token 已失效或已被吊销，删除本机凭证')
    } else {
      // 网络/服务端故障：保留凭证，用户可重试
      fail(`吊销失败：${formatApiError(error)}`)
      fail('本机凭证已保留，可稍后重新运行 blog-mcp logout')
      return
    }
  }
  clearCredentials()
}

async function commandStatus() {
  const credentials = readCredentials()
  if (!credentials) {
    fail('尚未登录，请先运行 blog-mcp login')
    return
  }

  const api = createApiClient(credentials)
  const whoami = /** @type {Record<string, any>} */ (await api.request('GET', '/api/mcp/whoami'))
  console.log(`用户：${whoami.username}`)
  console.log(`标签：${whoami.label}`)
  console.log(`scope：${(whoami.scopes ?? []).join(', ')}`)
  console.log(`到期：${whoami.expiresAt}`)
  console.log(`服务器：${credentials.baseUrl}`)
}

async function commandServe() {
  const credentials = readCredentials()
  if (!credentials) {
    // stdout 留给 JSON-RPC，这条只能写 stderr
    console.error('尚未登录，请先运行 blog-mcp login')
    process.exit(1)
  }
  await serveStdio(createApiClient(credentials))
}

async function main() {
  let parsed
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        label: { type: 'string' },
        'read-only': { type: 'boolean', default: false },
        days: { type: 'string' },
        // 显式声明，否则 parseArgs 遇到未知的 --help 会先抛错、退出码 2
        help: { type: 'boolean', default: false }
      }
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error(USAGE)
    process.exitCode = 2
    return
  }

  const [command, ...rest] = parsed.positionals
  if (parsed.values.help || !command || command === 'help') {
    console.log(USAGE)
    // `--help` / `help` 是主动求助，退出码 0；完全不给参数才是用法错误
    if (!parsed.values.help && !command) process.exitCode = 2
    return
  }

  try {
    if (command === 'login') {
      if (rest.length) throw new Error(`login 不接受位置参数：${rest.join(' ')}`)
      await commandLogin({
        label: parsed.values.label,
        readOnly: Boolean(parsed.values['read-only']),
        days: parsed.values.days
      })
      return
    }
    if (command === 'logout') {
      await commandLogout()
      return
    }
    if (command === 'status') {
      await commandStatus()
      return
    }
    if (command === 'serve') {
      await commandServe()
      return
    }
    console.error(`未知命令：${command}`)
    console.error(USAGE)
    process.exitCode = 2
  } catch (error) {
    if (command === 'login') fail(formatLoginError(error))
    else fail(formatApiError(error))
  }
}

await main()

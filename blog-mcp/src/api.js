/**
 * HTTP 客户端：Bearer 鉴权、JSON / multipart、错误映射。
 * token 只出现在请求头里，这里不打印任何东西。
 */
import { openAsBlob } from 'node:fs'
import { basename } from 'node:path'
import { resolveBaseUrl } from './config.js'

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
 * @typedef {object} RequestOptions
 * @property {Record<string, string | number | boolean | undefined>} [query]
 * @property {unknown} [body]
 * @property {FormData} [form]
 */

/**
 * @typedef {object} ApiClient
 * @property {(method: string, path: string, opts?: RequestOptions) => Promise<unknown>} request
 * @property {(filePath: string) => Promise<unknown>} upload
 */

/** 服务端返回非 2xx 时抛出的错误。 */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message
   * @param {unknown} body
   */
  constructor(status, message, body) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * 读取响应体：空 body → null；JSON → 解析值；非 JSON → { error: 前 240 字 }。
 * 这个函数是唯一读取 body 的地方，调用方只能用它返回的对象。
 * @param {Response} response
 * @returns {Promise<unknown>}
 */
export async function parseResponse(response) {
  const text = await response.text()
  if (text.trim() === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 240) }
  }
}

/**
 * 把任意异常转成给人看的一句话。
 * @param {unknown} error
 * @returns {string}
 */
export function formatApiError(error) {
  if (error instanceof ApiError) {
    if (error.status === 401) return '凭证已失效或已被吊销，请重新运行 blog-mcp login'
    return `${error.status} ${error.message}`
  }
  if (error instanceof TypeError) {
    return `无法连接 ${resolveBaseUrl()}，检查网络或 BLOG_MCP_URL`
  }
  if (error instanceof Error && error.message) return error.message
  return String(error)
}

/**
 * 按凭证创建一个 API 客户端。
 * @param {Credentials} credentials
 * @returns {ApiClient}
 */
export function createApiClient(credentials) {
  const baseUrl = credentials.baseUrl.replace(/\/+$/, '')

  /**
   * @param {string} method
   * @param {string} path
   * @param {RequestOptions} [opts]
   * @returns {Promise<unknown>}
   */
  async function request(method, path, opts = {}) {
    const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`)
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }

    /** @type {Record<string, string>} */
    const headers = {
      authorization: `Bearer ${credentials.token}`,
      accept: 'application/json'
    }
    /** @type {RequestInit} */
    const init = { method, headers }

    if (opts.form) {
      // 不设 content-type：交给 fetch 生成 multipart boundary
      init.body = opts.form
    } else if (opts.body !== undefined) {
      headers['content-type'] = 'application/json'
      init.body = JSON.stringify(opts.body)
    }

    const response = await fetch(url, init)
    // parseResponse 已经把 body 消费掉，错误分支只能复用它的返回值
    const body = await parseResponse(response)
    if (!response.ok) {
      const detail = /** @type {any} */ (body)?.statusMessage
        ?? /** @type {any} */ (body)?.error
        ?? response.statusText
      const message = detail ? String(detail) : `HTTP ${response.status}`
      throw new ApiError(response.status, message, body)
    }
    return body
  }

  /**
   * 上传本地文件到图床。文件会公开可访问，路径校验由调用方负责。
   * @param {string} filePath
   * @returns {Promise<unknown>}
   */
  async function upload(filePath) {
    const blob = await openAsBlob(filePath)
    const form = new FormData()
    form.append('file', blob, basename(filePath))
    return await request('POST', '/api/mcp/images', { form })
  }

  return { request, upload }
}

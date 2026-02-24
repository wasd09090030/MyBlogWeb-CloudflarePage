import { resolveApiBaseURL } from '~/shared/api/base-url'

type FetchOptions = NonNullable<Parameters<typeof $fetch>[1]>
type RequestBody = Extract<FetchOptions['body'], BodyInit | Record<string, unknown> | null | undefined>

/**
 * 归一化请求路径：
 * - 绝对 URL 原样透传；
 * - 相对路径补前导 `/`，便于与 baseURL 拼接。
 */
function normalizePath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  if (path.startsWith('/')) return path
  return `/${path}`
}

/**
 * 轻量 API 客户端。
 * 只负责 URL 拼接与 HTTP 方法封装，不处理业务错误翻译。
 *
 * 边界说明：
 * - 统一日志由 withApiError 提供最小上下文；
 * - 错误归一化与用户提示文案在 shared/errors 或 feature 容器层处理，
 *   避免在 client 层绑定具体业务语义。
 */
export function createApiClient(baseURL = resolveApiBaseURL()) {
  const fetchJson = $fetch as <T>(request: string, options?: FetchOptions) => Promise<T>

  const request = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
    const normalized = normalizePath(path)
    // 当 path 已是绝对地址时，允许覆盖默认 baseURL（用于跨域静态资源或外部 API）。
    const target = /^https?:\/\//i.test(normalized) ? normalized : `${baseURL}${normalized}`
    return await fetchJson<T>(target, options)
  }

  const get = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
    return await request<T>(path, { ...options, method: 'GET' })
  }

  const post = async <T = unknown>(path: string, body?: RequestBody, options: FetchOptions = {}): Promise<T> => {
    return await request<T>(path, { ...options, method: 'POST', body })
  }

  const patch = async <T = unknown>(path: string, body?: RequestBody, options: FetchOptions = {}): Promise<T> => {
    return await request<T>(path, { ...options, method: 'PATCH', body })
  }

  const put = async <T = unknown>(path: string, body?: RequestBody, options: FetchOptions = {}): Promise<T> => {
    return await request<T>(path, { ...options, method: 'PUT', body })
  }

  const del = async <T = unknown>(path: string, options: FetchOptions = {}): Promise<T> => {
    return await request<T>(path, { ...options, method: 'DELETE' })
  }

  return {
    baseURL,
    request,
    get,
    post,
    patch,
    put,
    del
  }
}

/**
 * 为调用方补充统一日志上下文，不吞掉原始异常。
 */
export async function withApiError<T>(scope: string, action: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(`[${scope}] ${action}失败:`, error)
    throw error
  }
}

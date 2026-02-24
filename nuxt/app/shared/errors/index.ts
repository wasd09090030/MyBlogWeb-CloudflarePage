export type AppErrorKind =
  | 'network'
  | 'auth'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'server'
  | 'business'
  | 'unknown'

export type AppError = {
  kind: AppErrorKind
  statusCode?: number
  statusMessage: string
  userMessage: string
  raw: unknown
}

type ErrorLike = {
  message?: string
  statusCode?: number
  statusMessage?: string
  data?: { message?: string; error?: string }
  response?: {
    status?: number
    statusText?: string
    _data?: { message?: string; error?: string }
  }
}

type NormalizeOptions = {
  fallback?: string
  notFound?: string
  auth?: string
  forbidden?: string
}

function asErrorLike(error: unknown): ErrorLike {
  if (typeof error === 'object' && error !== null) {
    return error as ErrorLike
  }
  return {}
}

function inferStatusCode(error: ErrorLike): number | undefined {
  return error.statusCode || error.response?.status
}

function inferRawMessage(error: ErrorLike): string | undefined {
  return error.data?.message || error.data?.error || error.response?._data?.message || error.response?._data?.error || error.statusMessage || error.message
}

function kindFromStatus(statusCode?: number): AppErrorKind {
  if (!statusCode) return 'unknown'
  if (statusCode === 401) return 'auth'
  if (statusCode === 403) return 'forbidden'
  if (statusCode === 404) return 'not-found'
  if (statusCode === 400 || statusCode === 422) return 'validation'
  if (statusCode >= 500) return 'server'
  return 'business'
}

function defaultUserMessage(kind: AppErrorKind): string {
  if (kind === 'network') return '网络连接异常，请检查网络后重试'
  if (kind === 'auth') return '登录状态已失效，请重新登录'
  if (kind === 'forbidden') return '没有权限执行该操作'
  if (kind === 'not-found') return '请求的资源不存在'
  if (kind === 'validation') return '请求参数有误，请检查后重试'
  if (kind === 'server') return '服务器繁忙，请稍后重试'
  if (kind === 'business') return '请求失败，请稍后重试'
  return '操作失败，请稍后重试'
}

export function normalizeAppError(error: unknown, options: NormalizeOptions = {}): AppError {
  const parsed = asErrorLike(error)
  const statusCode = inferStatusCode(parsed)
  const statusMessage = inferRawMessage(parsed) || options.fallback || '请求失败'
  const kind = kindFromStatus(statusCode)

  if (!statusCode && parsed.message && /network|failed to fetch|fetcherror/i.test(parsed.message)) {
    return {
      kind: 'network',
      statusCode,
      statusMessage,
      userMessage: defaultUserMessage('network'),
      raw: error
    }
  }

  let userMessage = defaultUserMessage(kind)
  if (kind === 'not-found' && options.notFound) userMessage = options.notFound
  if (kind === 'auth' && options.auth) userMessage = options.auth
  if (kind === 'forbidden' && options.forbidden) userMessage = options.forbidden
  if (kind === 'unknown' && options.fallback) userMessage = options.fallback

  return {
    kind,
    statusCode,
    statusMessage,
    userMessage,
    raw: error
  }
}

export function mapErrorToUserMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  const normalized = normalizeAppError(error, { fallback })
  return normalized.userMessage
}

export function toNuxtErrorPayload(
  error: unknown,
  options: NormalizeOptions = {}
): { statusCode: number; statusMessage: string } {
  const normalized = normalizeAppError(error, options)
  return {
    statusCode: normalized.statusCode || 500,
    statusMessage: normalized.statusMessage || options.fallback || '请求失败'
  }
}

export function logAppError(scope: string, action: string, error: unknown): void {
  const normalized = normalizeAppError(error)
  console.error(`[${scope}] ${action}失败:`, {
    kind: normalized.kind,
    statusCode: normalized.statusCode,
    statusMessage: normalized.statusMessage,
    raw: normalized.raw
  })
}
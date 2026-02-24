import { normalizeAppError } from '~/shared/errors'
import type { AppError } from '~/shared/errors'

export type AppResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError }

export function successResult<T>(data: T): AppResult<T> {
  return { ok: true, data }
}

export function failureResult(error: unknown, fallback = '操作失败，请稍后重试'): AppResult<never> {
  return {
    ok: false,
    error: normalizeAppError(error, { fallback })
  }
}

export async function toAppResult<T>(
  runner: () => Promise<T>,
  fallback = '操作失败，请稍后重试'
): Promise<AppResult<T>> {
  try {
    const data = await runner()
    return successResult(data)
  } catch (error) {
    return failureResult(error, fallback)
  }
}
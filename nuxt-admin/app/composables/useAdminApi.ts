type CacheEntry = { expiresAt: number, value: unknown }
type GetOptions = { cache?: boolean, ttl?: number }

const defaultCacheTtl = 30_000

export function useAdminApi() {
  // The Admin is a static SPA. This state is browser-local and never contains
  // credentials or server-rendered business data.
  const cacheEntries = useState<Record<string, CacheEntry>>('admin-api-cache', () => ({}))
  const request = async <T>(path: string, options: Record<string, unknown> = {}) => {
    return await $fetch<T>(`/admin/api/${path.replace(/^\//, '')}`, { credentials: 'include', cache: 'no-store', ...options } as any)
  }

  const get = async <T>(path: string, options: GetOptions = {}) => {
    const cacheKey = path.replace(/^\//, '')
    const entry = cacheEntries.value[cacheKey]
    const cacheEnabled = options.cache !== false
    if (cacheEnabled && entry && entry.expiresAt > Date.now()) return entry.value as T

    const value = await request<T>(path)
    if (cacheEnabled) {
      cacheEntries.value[cacheKey] = { value, expiresAt: Date.now() + (options.ttl ?? defaultCacheTtl) }
    }
    return value
  }

  const invalidate = () => { cacheEntries.value = {} }
  const mutate = async <T>(path: string, options: Record<string, unknown>) => {
    // 先清缓存再发请求：即使请求失败（如 404），后续 refresh() 也拿不到过期列表
    invalidate()
    const value = await request<T>(path, options)
    return value
  }

  return {
    get,
    invalidate,
    post: <T>(path: string, body?: unknown) => mutate<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => mutate<T>(path, { method: 'PUT', body }),
    patch: <T>(path: string, body?: unknown) => mutate<T>(path, { method: 'PATCH', body }),
    del: <T>(path: string) => mutate<T>(path, { method: 'DELETE' })
  }
}

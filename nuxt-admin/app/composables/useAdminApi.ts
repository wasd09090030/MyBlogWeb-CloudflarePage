type CacheEntry = { expiresAt: number, value: unknown }
type GetOptions = { cache?: boolean, ttl?: number }

const defaultCacheTtl = 30_000

export function useAdminApi() {
  const requestFetch = useRequestFetch()
  // useState is scoped to the current Nuxt app/request and is serialized only into
  // the private SSR response. It is never a shared server-side cache.
  const cacheEntries = useState<Record<string, CacheEntry>>('admin-api-cache', () => ({}))
  const request = async <T>(path: string, options: Record<string, unknown> = {}) => {
    return await requestFetch<T>(`/admin/api/${path.replace(/^\//, '')}`, { credentials: 'include', cache: 'no-store', ...options } as any)
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
    const value = await request<T>(path, options)
    invalidate()
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

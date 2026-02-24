import type { Ref } from 'vue'

type TimedCacheStateOptions<T> = {
  key: string
  ttl: number
  initial: () => T | null
}

type TimedMapCacheEntry<T> = {
  data: T
  timestamp: number
}

type TimedMapCache<T> = {
  get: (key: string) => T | undefined
  set: (key: string, data: T) => void
  has: (key: string) => boolean
  delete: (key: string) => void
  clear: () => void
}

type TimedCacheState<T> = {
  data: Ref<T | null>
  updatedAt: Ref<number>
  isValid: () => boolean
  get: () => T | null
  set: (value: T) => void
  invalidate: () => void
}

const inFlightMap = new Map<string, Promise<unknown>>()

export function createTimedCacheState<T>(options: TimedCacheStateOptions<T>): TimedCacheState<T> {
  const { key, ttl, initial } = options
  const data = useState<T | null>(`${key}-data`, initial)
  const updatedAt = useState<number>(`${key}-updatedAt`, () => 0)

  const isValid = (): boolean => {
    if (!data.value) return false
    return Date.now() - updatedAt.value < ttl
  }

  const get = (): T | null => {
    if (!isValid()) return null
    return data.value
  }

  const set = (value: T): void => {
    data.value = value
    updatedAt.value = Date.now()
  }

  const invalidate = (): void => {
    data.value = null
    updatedAt.value = 0
  }

  return {
    data,
    updatedAt,
    isValid,
    get,
    set,
    invalidate
  }
}

export async function withInFlightDedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlightMap.get(key)
  if (existing) {
    return await existing as Promise<T>
  }

  const pending = fn()
  inFlightMap.set(key, pending as Promise<unknown>)

  try {
    return await pending
  } finally {
    inFlightMap.delete(key)
  }
}

export function createTimedMapCache<T>(ttl: number): TimedMapCache<T> {
  const cache = new Map<string, TimedMapCacheEntry<T>>()

  const get = (key: string): T | undefined => {
    const entry = cache.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key)
      return undefined
    }
    return entry.data
  }

  const set = (key: string, data: T): void => {
    cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  const has = (key: string): boolean => {
    return get(key) !== undefined
  }

  const del = (key: string): void => {
    cache.delete(key)
  }

  const clear = (): void => {
    cache.clear()
  }

  return {
    get,
    set,
    has,
    delete: del,
    clear
  }
}
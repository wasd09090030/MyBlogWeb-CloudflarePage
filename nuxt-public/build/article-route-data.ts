export type ArticleRouteRecord = {
  id: number
  slug?: string | null
  updatedAt?: string | null
  createdAt?: string | null
}

type ArticleRoutePageResponse = {
  data?: unknown
  total?: number
  pageSize?: number
  totalPages?: number
}

const ARTICLE_ROUTE_PAGE_SIZE = 100

export const buildArticleRoute = (article: Pick<ArticleRouteRecord, 'id' | 'slug'>): string => {
  return article.slug
    ? `/article/${article.id}-${article.slug}`
    : `/article/${article.id}`
}

const toArticleRouteRecord = (input: unknown): ArticleRouteRecord | null => {
  if (!input || typeof input !== 'object') return null

  const item = input as Record<string, unknown>
  const id = Number(item.id)
  if (!Number.isFinite(id) || id <= 0) return null

  const slug = typeof item.slug === 'string' && item.slug.trim().length > 0
    ? item.slug.trim()
    : null

  const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : null
  const createdAt = typeof item.createdAt === 'string' ? item.createdAt : null

  return {
    id,
    slug,
    updatedAt,
    createdAt
  }
}

const normalizeArticleRouteList = (payload: unknown): ArticleRouteRecord[] => {
  const list = Array.isArray(payload) ? payload : []
  return list
    .map(toArticleRouteRecord)
    .filter((item): item is ArticleRouteRecord => item !== null)
}

export const fetchAllArticleRoutes = async (apiBase: string): Promise<ArticleRouteRecord[]> => {
  const normalizedApiBase = apiBase.replace(/\/$/, '')
  const dedup = new Map<number, ArticleRouteRecord>()

  let currentPage = 1
  let totalPages = 1
  let pagedApiSucceeded = false

  while (currentPage <= totalPages) {
    const url = `${normalizedApiBase}/articles?summary=true&page=${currentPage}&limit=${ARTICLE_ROUTE_PAGE_SIZE}`
    const res = await globalThis.fetch(url)
    if (!res.ok) {
      throw new Error(`API responded ${res.status} while fetching ${url}`)
    }

    const payload = await res.json()
    if (Array.isArray(payload)) {
      for (const article of normalizeArticleRouteList(payload)) {
        dedup.set(article.id, article)
      }
      pagedApiSucceeded = dedup.size > 0
      break
    }

    const pageData = payload as ArticleRoutePageResponse
    const pageItems = normalizeArticleRouteList(pageData.data)
    for (const article of pageItems) {
      dedup.set(article.id, article)
    }
    pagedApiSucceeded = true

    const candidateTotalPages = Number(pageData.totalPages)
    if (Number.isFinite(candidateTotalPages) && candidateTotalPages > 0) {
      totalPages = candidateTotalPages
    } else {
      const total = Number(pageData.total)
      const pageSize = Number(pageData.pageSize) || ARTICLE_ROUTE_PAGE_SIZE
      totalPages = total > 0 ? Math.ceil(total / pageSize) : currentPage
    }

    currentPage += 1
  }

  if (pagedApiSucceeded && dedup.size > 0) {
    return Array.from(dedup.values())
  }

  // 兼容后端未实现 summary/page/limit 的场景
  const fallbackRes = await globalThis.fetch(`${normalizedApiBase}/articles`)
  if (!fallbackRes.ok) {
    throw new Error(`API responded ${fallbackRes.status} while fetching fallback /articles`)
  }

  return normalizeArticleRouteList(await fallbackRes.json())
}

export const toIsoLastmod = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

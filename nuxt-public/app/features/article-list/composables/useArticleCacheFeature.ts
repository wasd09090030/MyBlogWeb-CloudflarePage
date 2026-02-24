import { useSearchWorker } from '~/composables/useSearchWorker'
import { createApiClient, withApiError } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { buildArticlesListCacheKey } from '~/shared/cache/keys'
import { createTimedCacheState, withInFlightDedup } from '~/shared/cache'
import type { ArticleLike, SearchQueryOptions } from '~/utils/workers/types'

type ArticleListResponse =
  | ArticleLike[]
  | {
    data?: ArticleLike[]
    total?: number
    pageSize?: number
  }

export const useArticleCacheFeature = () => {
  const searchWorker = process.client ? useSearchWorker() : null
  const api = createApiClient()
  const timedCache = createTimedCacheState<ArticleLike[]>({
    key: 'articles-cache',
    ttl: 5 * 60 * 1000,
    initial: () => null
  })
  const articlesCache = timedCache.data
  const isLoadingArticles = useState<boolean>('articles-loading', () => false)

  const isCacheValid = (): boolean => {
    return timedCache.isValid()
  }

  const getAllArticles = async (forceRefresh = false): Promise<ArticleLike[] | null> => {
    // key 规则说明：列表预取与分页拉取统一使用 buildArticlesListCacheKey，
    // 避免“同参数不同 key”导致重复请求或命中不稳定。
    const firstPageKey = buildArticlesListCacheKey({ summary: true, page: 1, limit: 100 })

    return await withInFlightDedup(`cache:${firstPageKey}`, async () => {
      if (!forceRefresh && isCacheValid()) {
        return timedCache.get()
      }

      isLoadingArticles.value = true

      try {
        const result = await withApiError('ArticleCache', '获取文章缓存', async () => {
          return await api.get<ArticleListResponse>(API_ENDPOINTS.articles.list, {
            params: { summary: true, page: 1, limit: 100 }
          })
        })

        let allArticles: ArticleLike[] = []

        if (Array.isArray(result)) {
          allArticles = result
        } else if (result.data) {
          const { data, total = 0, pageSize = 100 } = result
          allArticles = [...data]

          const totalPages = Math.ceil(total / pageSize)
          if (totalPages > 1) {
            const promises: Array<Promise<ArticleListResponse>> = []
            for (let page = 2; page <= totalPages; page++) {
              const pageKey = buildArticlesListCacheKey({ summary: true, page, limit: 100 })
              promises.push(
                withInFlightDedup(`cache:${pageKey}`, async () => await api.get<ArticleListResponse>(API_ENDPOINTS.articles.list, {
                  params: { summary: true, page, limit: 100 }
                }))
              )
            }

            const results = await Promise.all(promises)
            results.forEach((res) => {
              if (Array.isArray(res)) {
                allArticles.push(...res)
              } else if (res.data) {
                allArticles.push(...res.data)
              }
            })
          }
        }

        allArticles.sort((a, b) => {
          const left = Number.parseInt(String(b.id ?? ''), 10) || 0
          const right = Number.parseInt(String(a.id ?? ''), 10) || 0
          return left - right
        })

        timedCache.set(allArticles)

        if (searchWorker && allArticles.length > 0) {
          searchWorker.buildIndex(allArticles).catch(() => {})
        }

        return allArticles
      } finally {
        isLoadingArticles.value = false
      }
    })
  }

  const categoryStats = computed<Record<string, number>>(() => {
    if (!articlesCache.value) return {}

    const stats: Record<string, number> = { study: 0, game: 0, work: 0, resource: 0 }
    articlesCache.value.forEach((article) => {
      if (article.category && stats[article.category] !== undefined) {
        stats[article.category] = (stats[article.category] || 0) + 1
      }
    })
    return stats
  })

  const monthStats = computed<Record<string, number>>(() => {
    if (!articlesCache.value) return {}

    const stats: Record<string, number> = {}
    articlesCache.value.forEach((article) => {
      if (article.createdAt) {
        const date = new Date(article.createdAt)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        stats[key] = (stats[key] || 0) + 1
      }
    })
    return stats
  })

  const getArticlesByCategory = (category: string): ArticleLike[] => {
    if (!articlesCache.value) return []
    return articlesCache.value.filter((article) => article.category === category)
  }

  const searchArticlesLocal = (keyword: string): ArticleLike[] => {
    if (!articlesCache.value || !keyword) return []
    const lowerKeyword = keyword.toLowerCase()
    return articlesCache.value.filter((article) =>
      article.title?.toLowerCase().includes(lowerKeyword) ||
      article.summary?.toLowerCase().includes(lowerKeyword) ||
      article.tags?.some((tag) => tag.toLowerCase().includes(lowerKeyword))
    )
  }

  const searchArticlesAsync = async (keyword: string): Promise<ArticleLike[]> => {
    if (!articlesCache.value || !keyword) return []
    if (searchWorker) {
      return searchWorker.search(articlesCache.value, keyword)
    }
    return searchArticlesLocal(keyword)
  }

  const queryArticlesAsync = async (options: SearchQueryOptions = {}): Promise<ArticleLike[]> => {
    if (!articlesCache.value) return []
    if (searchWorker) {
      return searchWorker.query(articlesCache.value, options)
    }

    let result: ArticleLike[] = articlesCache.value
    if (options.keyword) result = searchArticlesLocal(options.keyword)
    if (options.category && options.category !== 'all') {
      result = result.filter((article) => article.category === options.category)
    }
    return result
  }

  const invalidateCache = (): void => {
    // 失效策略说明：统一清空 timedCache，下一次读取按统一 key 规则重新拉取第一页并分页补齐。
    timedCache.invalidate()
  }

  const preloadCache = async (): Promise<void> => {
    if (!isCacheValid()) {
      await getAllArticles()
    }
  }

  return {
    getAllArticles,
    getArticlesByCategory,
    searchArticlesLocal,
    searchArticlesAsync,
    queryArticlesAsync,
    categoryStats,
    monthStats,
    isCacheValid,
    invalidateCache,
    preloadCache,
    isLoading: isLoadingArticles,
    cachedArticles: articlesCache
  }
}
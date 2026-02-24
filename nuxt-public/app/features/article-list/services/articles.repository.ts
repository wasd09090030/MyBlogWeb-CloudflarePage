import type { ArticleLike } from '~/utils/workers/types'
import type { ArticlesListOptions } from '~/features/article-list/types/article'
import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { buildFeaturedArticlesCacheKey } from '~/shared/cache/keys'

type NuxtDataContainer = {
  data?: Record<string, unknown>
}

/**
 * 从 Nuxt payload/static 缓存中读取指定 key 的数据。
 *
 * 兼容 SSR 首屏注入与静态化场景，避免重复请求。
 */
function getCachedNuxtData<T>(nuxtApp: { payload: unknown; static: unknown }, key: string): T | null {
  // 优先读取 payload（SSR 首屏注入），命中后不再回退 static。
  const payloadData = (nuxtApp.payload as NuxtDataContainer).data
  if (payloadData && key in payloadData) {
    return payloadData[key] as T
  }

  // static 用于预渲染/静态化产物缓存。
  const staticData = (nuxtApp.static as NuxtDataContainer).data
  if (staticData && key in staticData) {
    return staticData[key] as T
  }

  return null
}

/**
 * 文章仓储。
 * 负责与后端文章接口通信，不包含 UI 相关逻辑。
 */
export const createArticlesRepository = () => {
  const client = createApiClient()

  /**
   * 获取推荐文章，并利用 useFetch 缓存提高重复访问性能。
   */
  const getFeaturedArticles = async (limit = 5): Promise<ArticleLike[] | null> => {
    const { data, error } = await useFetch<ArticleLike[] | null>(`${client.baseURL}/articles/featured`, {
      // key 包含 limit，避免不同条数请求共享同一缓存桶。
      key: buildFeaturedArticlesCacheKey(limit),
      params: { limit },
      getCachedData: (key, nuxtApp) => {
        return getCachedNuxtData<ArticleLike[] | null>(nuxtApp as { payload: unknown; static: unknown }, key)
      }
    })

    if (error.value) throw error.value
    return data.value ?? null
  }

  /**
   * 按关键词搜索文章。
   */
  const searchArticles = async (keyword: string): Promise<ArticleLike[]> => {
    return await client.get<ArticleLike[]>(`${API_ENDPOINTS.articles.list}/search`, {
      params: { keyword }
    })
  }

  /**
   * 获取文章列表。
   * 默认启用 summary 模式以降低列表页传输开销。
   */
  const getArticles = async (options: ArticlesListOptions = {}): Promise<unknown> => {
    const {
      category = null,
      page = 1,
      limit = 10,
      summary = true
    } = options

    // 与后端约定：未传 category 时不发送该字段，避免误触发分类过滤。
    const params: Record<string, string | number | boolean> = { summary, page, limit }
    if (category) {
      params.category = category
    }

    return await client.get(API_ENDPOINTS.articles.list, { params })
  }

  /**
   * 按分类获取文章。
   */
  const getArticlesByCategory = async (category: string): Promise<ArticleLike[]> => {
    // 分类名可能包含空格或中文，必须 URL 编码后再拼接路径段。
    return await client.get<ArticleLike[]>(`${API_ENDPOINTS.articles.list}/category/${encodeURIComponent(category)}`)
  }

  return {
    getFeaturedArticles,
    searchArticles,
    getArticles,
    getArticlesByCategory
  }
}

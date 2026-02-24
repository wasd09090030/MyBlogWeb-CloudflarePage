type ArticleListCacheKeyInput = {
  summary?: boolean
  page?: number
  limit?: number
  category?: string | null
}

/**
 * 文章列表缓存 key 构建器。
 *
 * 设计说明：
 * - key 必须包含筛选参数（summary/page/limit/category），避免不同查询污染同一缓存桶；
 * - category 缺省时统一写为 all，保证“未传分类”与“空字符串”语义一致。
 */
export function buildArticlesListCacheKey(options: ArticleListCacheKeyInput = {}): string {
  const {
    summary = true,
    page = 1,
    limit = 10,
    category = null
  } = options
  const normalizedCategory = category && category.trim().length > 0 ? category.trim().toLowerCase() : 'all'
  return `articles:list:summary=${summary ? 1 : 0}:page=${page}:limit=${limit}:category=${normalizedCategory}`
}

/**
 * 推荐文章缓存 key。
 */
export function buildFeaturedArticlesCacheKey(limit: number): string {
  return `articles:featured:limit=${limit}`
}

/**
 * 文章详情 useAsyncData key。
 *
 * 约定：
 * - 无 slug: article-77
 * - 带 slug: article-77-my-title
 */
export function buildArticleAsyncDataKey(idOrRouteParam: string | number, slug?: string | null): string {
  const raw = String(idOrRouteParam || '').trim()
  if (!raw) return 'article-unknown'

  if (slug !== undefined) {
    const normalizedSlug = (slug || '').trim()
    return normalizedSlug ? `article-${raw}-${normalizedSlug}` : `article-${raw}`
  }

  return raw.startsWith('article-') ? raw : `article-${raw}`
}

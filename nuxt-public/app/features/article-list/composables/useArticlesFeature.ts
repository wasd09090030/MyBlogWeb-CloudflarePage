import type { ArticleLike } from '~/utils/workers/types'
import type { ArticleCacheFacade, ArticlesListOptions } from '~/features/article-list/types/article'
import { createArticlesRepository } from '~/features/article-list/services/articles.repository'
import { useArticleCacheFeature } from '~/features/article-list/composables/useArticleCacheFeature'
import { toAppResult } from '~/shared/types/result'
import type { AppResult } from '~/shared/types/result'

/**
 * 文章列表领域能力封装。
 *
 * 该组合式函数统一聚合：
 * 1) 基于缓存的读取策略；
 * 2) 远端仓储请求；
 * 3) AppResult 结构化错误返回。
 */
export const useArticlesFeature = () => {
  // 缓存能力与远端仓储解耦，便于在页面层按场景选择“本地优先”或“服务端优先”。
  const articleCache = useArticleCacheFeature() as ArticleCacheFacade
  const repository = createArticlesRepository()

  /**
   * 获取推荐文章。
   */
  const getFeaturedArticles = async (limit = 5): Promise<ArticleLike[] | null> => {
    return await repository.getFeaturedArticles(limit)
  }

  /**
   * 关键字搜索文章。
   * 缓存可用时优先走本地搜索，降低请求成本。
   */
  const searchArticles = async (keyword: string): Promise<ArticleLike[]> => {
    if (articleCache.isCacheValid()) {
      return articleCache.searchArticlesLocal(keyword)
    }
    return await repository.searchArticles(keyword)
  }

  /**
   * 获取文章列表（支持分类、分页与摘要参数）。
   * 列表接口默认不走本地缓存，保持分页参数与服务端结果的一致性。
   */
  const getArticles = async (options: ArticlesListOptions = {}): Promise<unknown> => {
    return await repository.getArticles(options)
  }

  /**
   * 获取所有文章。
   * 由缓存层负责是否复用旧数据或强制刷新。
   */
  const getAllArticles = async (forceRefresh = false): Promise<ArticleLike[] | null> => {
    return await articleCache.getAllArticles(forceRefresh)
  }

  /**
   * 按分类获取文章。
   * 缓存有效时优先走本地过滤。
   */
  const getArticlesByCategory = async (category: string): Promise<ArticleLike[]> => {
    if (articleCache.isCacheValid()) {
      return articleCache.getArticlesByCategory(category)
    }
    return await repository.getArticlesByCategory(category)
  }

  /**
   * 失效文章缓存，触发下一次请求重新拉取。
   */
  const invalidateCache = (): void => {
    articleCache.invalidateCache()
  }

  /**
   * 以 AppResult 形式返回文章列表，统一错误处理。
   * 页面层可直接基于 success/error 分支渲染，减少重复 try/catch。
   */
  const getArticlesResult = async (options: ArticlesListOptions = {}): Promise<AppResult<unknown>> => {
    return await toAppResult(() => getArticles(options), '获取文章列表失败')
  }

  /**
   * 以 AppResult 形式返回缓存读取结果。
   */
  const getAllArticlesResult = async (forceRefresh = false): Promise<AppResult<ArticleLike[] | null>> => {
    return await toAppResult(() => getAllArticles(forceRefresh), '获取文章缓存失败')
  }

  /**
   * 以 AppResult 形式返回推荐文章。
   */
  const getFeaturedArticlesResult = async (limit = 5): Promise<AppResult<ArticleLike[] | null>> => {
    return await toAppResult(() => getFeaturedArticles(limit), '获取推荐文章失败')
  }

  return {
    getFeaturedArticles,
    getFeaturedArticlesResult,
    searchArticles,
    getArticles,
    getArticlesResult,
    getAllArticles,
    getAllArticlesResult,
    getArticlesByCategory,
    invalidateCache,
    // 暴露缓存层统计信息给 UI（分类分布、按月统计）。
    categoryStats: articleCache.categoryStats,
    monthStats: articleCache.monthStats
  }
}

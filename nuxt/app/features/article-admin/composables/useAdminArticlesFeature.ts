import type {
  AiSummaryResult,
  ArticleCategory,
  ArticleDetail,
  ArticleSummary,
  AuthFetchLike,
  CreateArticlePayload,
  PagedArticleResult,
  UpdateArticlePayload
} from '~/types/api'
import { createApiClient, withApiError } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { toAppResult } from '~/shared/types/result'
import type { AppResult } from '~/shared/types/result'

type CategoryKey = ArticleCategory

export const useAdminArticlesFeature = () => {
  const api = createApiClient()
  const authStore = useAuthStore() as AuthFetchLike

  const categoryLabels: Record<string, string> = {
    study: '学习',
    game: '游戏',
    work: '个人作品',
    resource: '资源分享',
    other: '其他'
  }

  const getCategoryLabel = (category: CategoryKey): string => {
    return categoryLabels[category] || category || '未分类'
  }

  const getCategoryType = (category: CategoryKey): string => {
    const types: Record<string, string> = {
      study: 'info',
      game: 'success',
      work: 'warning',
      resource: 'primary',
      other: 'default'
    }
    return types[category] || 'default'
  }

  const getArticles = async (
    options: { summary?: boolean; page?: number; limit?: number } = {}
  ): Promise<ArticleSummary[] | ArticleDetail[] | PagedArticleResult> => {
    const { summary = false, page = 1, limit = 1000 } = options
    return await withApiError('AdminArticles', '获取文章列表', async () => {
      return await api.get<ArticleSummary[] | ArticleDetail[] | PagedArticleResult>(API_ENDPOINTS.articles.list, {
        params: { summary, page, limit }
      })
    })
  }

  const getArticle = async (id: string | number): Promise<ArticleDetail> => {
    return await withApiError('AdminArticles', '获取文章', async () => {
      return await api.get<ArticleDetail>(API_ENDPOINTS.articles.detail(id))
    })
  }

  const createArticle = async (articleData: CreateArticlePayload): Promise<ArticleDetail> => {
    return await withApiError('AdminArticles', '创建文章', async () => {
      return await authStore.authFetch<ArticleDetail>(API_ENDPOINTS.articles.list, {
        method: 'POST',
        body: articleData
      })
    })
  }

  const updateArticle = async (
    id: string | number,
    articleData: UpdateArticlePayload
  ): Promise<ArticleDetail> => {
    return await withApiError('AdminArticles', '更新文章', async () => {
      return await authStore.authFetch<ArticleDetail>(API_ENDPOINTS.articles.detail(id), {
        method: 'PUT',
        body: articleData
      })
    })
  }

  const deleteArticle = async (id: string | number): Promise<void> => {
    return await withApiError('AdminArticles', '删除文章', async () => {
      await authStore.authFetch<void>(API_ENDPOINTS.articles.detail(id), {
        method: 'DELETE'
      })
    })
  }

  const generateAiSummary = async (
    payload: { content: string; title?: string }
  ): Promise<AiSummaryResult> => {
    // 兼容说明：后端当前稳定端点为 /ai/summary。
    // 将端点决策收敛在 feature 层，避免页面分散直连导致后续切换成本增加。
    return await withApiError('AdminArticles', '生成 AI 概要', async () => {
      return await authStore.authFetch<AiSummaryResult>(API_ENDPOINTS.ai.summary, {
        method: 'POST',
        body: {
          content: payload.content,
          title: payload.title
        }
      })
    })
  }

  const getArticlesResult = async (
    options: { summary?: boolean; page?: number; limit?: number } = {}
  ): Promise<AppResult<ArticleSummary[] | ArticleDetail[] | PagedArticleResult>> => {
    return await toAppResult(() => getArticles(options), '获取文章列表失败')
  }

  const getArticleResult = async (id: string | number): Promise<AppResult<ArticleDetail>> => {
    return await toAppResult(() => getArticle(id), '获取文章失败')
  }

  const createArticleResult = async (articleData: CreateArticlePayload): Promise<AppResult<ArticleDetail>> => {
    return await toAppResult(() => createArticle(articleData), '创建文章失败')
  }

  const updateArticleResult = async (
    id: string | number,
    articleData: UpdateArticlePayload
  ): Promise<AppResult<ArticleDetail>> => {
    return await toAppResult(() => updateArticle(id, articleData), '更新文章失败')
  }

  const deleteArticleResult = async (id: string | number): Promise<AppResult<void>> => {
    return await toAppResult(() => deleteArticle(id), '删除文章失败')
  }

  return {
    categoryLabels,
    getCategoryLabel,
    getCategoryType,
    getArticles,
    getArticlesResult,
    getArticle,
    getArticleResult,
    createArticle,
    createArticleResult,
    updateArticle,
    updateArticleResult,
    deleteArticle,
    deleteArticleResult,
    generateAiSummary
  }
}
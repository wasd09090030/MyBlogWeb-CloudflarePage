import type { Ref } from 'vue'
import type { ArticleLike } from '~/utils/workers/types'

export type ArticlesListOptions = {
  category?: string | null
  page?: number
  limit?: number
  summary?: boolean
}

export type ArticleListResponse =
  | ArticleLike[]
  | {
    data?: ArticleLike[]
    total?: number
    pageSize?: number
  }

export type ArticleCacheFacade = {
  isCacheValid: () => boolean
  searchArticlesLocal: (keyword: string) => ArticleLike[]
  getAllArticles: (forceRefresh?: boolean) => Promise<ArticleLike[] | null>
  getArticlesByCategory: (category: string) => ArticleLike[]
  invalidateCache: () => void
  categoryStats: Ref<Record<string, number>>
  monthStats: Ref<Record<string, number>>
}
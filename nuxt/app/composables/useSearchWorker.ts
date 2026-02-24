/**
 * 文章搜索 Worker Composable
 */

import { createWorkerComposableController } from '~/utils/workers/composableFactory'
import type {
  ArticleLike,
  SearchQueryOptions,
  SearchWorkerActionMap
} from '~/utils/workers/types'

const searchWorkerController = createWorkerComposableController<SearchWorkerActionMap>({
  label: 'useSearchWorker',
  name: 'article-search',
  workerFactory: () => new Worker(
    new URL('~/utils/workers/articleSearch.worker.ts', import.meta.url),
    { type: 'module' }
  ),
  managerOptions: { timeout: 10000, singleton: true, maxRetries: 1 }
})

function searchFallback(articles: ArticleLike[] | null | undefined, keyword: string): ArticleLike[] {
  if (!articles || !keyword) return []
  const lower = keyword.toLowerCase()
  return articles.filter((article) =>
    article.title?.toLowerCase().includes(lower) ||
    article.summary?.toLowerCase().includes(lower) ||
    article.tags?.some((tag) => tag.toLowerCase().includes(lower))
  )
}

function filterFallback(
  articles: ArticleLike[] | null | undefined,
  category?: string,
  tag?: string
): ArticleLike[] {
  let result = articles || []
  if (category && category !== 'all') {
    result = result.filter((a) => a.category === category)
  }
  if (tag) {
    const lower = tag.toLowerCase()
    result = result.filter((a) => a.tags?.some((t) => t.toLowerCase() === lower))
  }
  return result
}

function sortFallback(
  articles: ArticleLike[] | null | undefined,
  sortBy: 'date' | 'title' | 'id' = 'date',
  order: 'asc' | 'desc' = 'desc'
): ArticleLike[] {
  const sorted = [...(articles || [])]
  if (sortBy === 'date') {
    sorted.sort((a, b) => {
      const da = new Date(a.createdAt || 0).getTime()
      const db = new Date(b.createdAt || 0).getTime()
      return order === 'desc' ? db - da : da - db
    })
  }
  return sorted
}

export function useSearchWorker() {
  const indexBuilt = ref(false)

  async function buildIndex(articles: ArticleLike[] | null | undefined): Promise<void> {
    if (!articles || articles.length === 0) return

    const result = await searchWorkerController.postTaskOrNull('buildIndex', { articles })
    if (result !== null) {
      indexBuilt.value = true
      console.log(`[SearchWorker] 索引构建完成，共 ${articles.length} 篇文章`)
    }
  }

  async function search(articles: ArticleLike[] | null | undefined, keyword: string): Promise<ArticleLike[]> {
    if (!keyword) return articles || []

    return searchWorkerController.postTaskWithFallback(
      'search',
      { articles: articles || [], keyword },
      () => searchFallback(articles, keyword)
    )
  }

  async function query(articles: ArticleLike[] | null | undefined, options: SearchQueryOptions = {}): Promise<ArticleLike[]> {
    return searchWorkerController.postTaskWithFallback(
      'query',
      { articles: articles || [], options },
      () => {
        let result = articles || []
        if (options.keyword) result = searchFallback(result, options.keyword)
        result = filterFallback(result, options.category, options.tag)
        if (!options.keyword) result = sortFallback(result, options.sortBy, options.order)
        return result
      }
    )
  }

  function dispose() {
    searchWorkerController.dispose()
    indexBuilt.value = false
  }

  return {
    buildIndex,
    search,
    query,
    dispose,
    indexBuilt: readonly(indexBuilt)
  }
}

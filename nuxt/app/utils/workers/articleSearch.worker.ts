/**
 * 文章搜索与过滤 Worker
 */

import type {
  ActionName,
  ArticleLike,
  ResultOf,
  SearchQueryOptions,
  SearchWorkerActionMap,
  WorkerInboundMessage,
  WorkerTaskUnion
} from './types'

let invertedIndex: Map<string, Set<number>> | null = null
let indexedArticles: ArticleLike[] | null = null

type IndexedSearchHit = {
  article: ArticleLike
  score: number
}

function buildIndex(articles: ArticleLike[]) {
  const index = new Map<string, Set<number>>()

  articles.forEach((article, idx) => {
    const tokens = tokenize(
      `${article.title || ''} ${article.summary || ''} ${(article.tags || []).join(' ')}`
    )

    tokens.forEach((token) => {
      if (!index.has(token)) {
        index.set(token, new Set<number>())
      }
      index.get(token)?.add(idx)
    })
  })

  invertedIndex = index
  indexedArticles = articles
  return { tokenCount: index.size, articleCount: articles.length }
}

function tokenize(text: string) {
  if (!text) return []

  const tokens = new Set<string>()
  const lower = text.toLowerCase()

  const words = lower.match(/[a-z0-9]+/g) || []
  words.forEach((w) => {
    if (w.length >= 2) tokens.add(w)
  })

  const cjk = lower.match(/[\u4e00-\u9fff]/g) || []
  cjk.forEach((c) => tokens.add(c))

  for (let i = 0; i < cjk.length - 1; i++) {
    const current = cjk[i]
    const next = cjk[i + 1]
    if (current && next) {
      tokens.add(current + next)
    }
  }

  return Array.from(tokens)
}

function searchWithIndex(keyword: string): IndexedSearchHit[] {
  if (!invertedIndex || !indexedArticles) return []
  const articles = indexedArticles

  const tokens = tokenize(keyword)
  if (tokens.length === 0) return []

  const scores = new Map<number, number>()

  tokens.forEach((token) => {
    const exact = invertedIndex?.get(token)
    if (exact) {
      exact.forEach((idx) => {
        scores.set(idx, (scores.get(idx) || 0) + 2)
      })
    }

    for (const [indexToken, articleIndices] of invertedIndex || []) {
      if (indexToken !== token && indexToken.startsWith(token)) {
        articleIndices.forEach((idx) => {
          scores.set(idx, (scores.get(idx) || 0) + 1)
        })
      }
    }
  })

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([idx, score]): IndexedSearchHit | null => {
      const article = articles[idx]
      if (!article) return null
      return { article, score }
    })
    .filter((item): item is IndexedSearchHit => item !== null)
}

function simpleSearch(articles: ArticleLike[], keyword: string) {
  if (!articles || !keyword) return []

  const lower = keyword.toLowerCase()

  return articles.filter((article) =>
    article.title?.toLowerCase().includes(lower) ||
    article.summary?.toLowerCase().includes(lower) ||
    article.tags?.some((tag: string) => tag.toLowerCase().includes(lower))
  )
}

function filterByCategory(articles: ArticleLike[], category?: string) {
  if (!category || category === 'all') return articles
  return articles.filter((a) => a.category === category)
}

function filterByTag(articles: ArticleLike[], tag?: string) {
  if (!tag) return articles
  const lower = tag.toLowerCase()
  return articles.filter((a) =>
    a.tags?.some((t: string) => t.toLowerCase() === lower)
  )
}

function sortArticles(
  articles: ArticleLike[],
  sortBy: 'date' | 'title' | 'id' = 'date',
  order: 'asc' | 'desc' = 'desc'
) {
  const sorted = [...articles]

  switch (sortBy) {
    case 'date':
      sorted.sort((a, b) => {
        const da = new Date(a.createdAt || 0).getTime()
        const db = new Date(b.createdAt || 0).getTime()
        return order === 'desc' ? db - da : da - db
      })
      break
    case 'title':
      sorted.sort((a, b) => {
        const cmp = (a.title || '').localeCompare(b.title || '', 'zh-CN')
        return order === 'desc' ? -cmp : cmp
      })
      break
    case 'id':
      sorted.sort((a, b) => {
        const ia = Number.parseInt(String(a.id ?? ''), 10) || 0
        const ib = Number.parseInt(String(b.id ?? ''), 10) || 0
        return order === 'desc' ? ib - ia : ia - ib
      })
      break
  }

  return sorted
}

function combinedQuery(articles: ArticleLike[], options: SearchQueryOptions = {}) {
  const { keyword, category, tag, sortBy = 'date', order = 'desc' } = options

  let result = articles

  if (keyword) {
    if (invertedIndex && indexedArticles === articles) {
      const searchResults = searchWithIndex(keyword)
      result = searchResults.map((r) => r.article)
    } else {
      result = simpleSearch(result, keyword)
    }
  }

  result = filterByCategory(result, category)
  result = filterByTag(result, tag)

  if (!keyword) {
    result = sortArticles(result, sortBy, order)
  }

  return result
}

type SearchAction = ActionName<SearchWorkerActionMap>
type SearchResult = ResultOf<SearchWorkerActionMap, SearchAction>
type SearchTask = WorkerTaskUnion<SearchWorkerActionMap>

const workerSelf = self as {
  onmessage: ((event: MessageEvent<SearchTask>) => void) | null
  postMessage: (message: WorkerInboundMessage<SearchResult>) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Worker 执行失败'
}

workerSelf.onmessage = function (event: MessageEvent<SearchTask>) {
  const message = event.data
  const { taskId, action } = message

  try {
    let result: SearchResult

    switch (action) {
      case 'buildIndex': {
        result = buildIndex(message.articles)
        break
      }
      case 'search': {
        const { articles, keyword } = message
        if (invertedIndex) {
          const searchResults = searchWithIndex(keyword)
          result = searchResults.map((r) => r.article)
        } else {
          result = simpleSearch(articles, keyword)
        }
        break
      }
      case 'filter': {
        const { articles, category, tag } = message
        let filtered = filterByCategory(articles, category)
        filtered = filterByTag(filtered, tag)
        result = filtered
        break
      }
      case 'sort': {
        const { articles, sortBy, order } = message
        result = sortArticles(articles, sortBy, order)
        break
      }
      case 'query': {
        result = combinedQuery(message.articles, message.options)
        break
      }
      default:
        throw new Error(`未知的 Worker 动作: ${action}`)
    }

    workerSelf.postMessage({ taskId, type: 'result', data: result })
  } catch (error: unknown) {
    workerSelf.postMessage({ taskId, type: 'error', error: getErrorMessage(error) })
  }
}

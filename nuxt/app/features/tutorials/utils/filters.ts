/**
 * 教程页面的筛选和排序函数
 */

type ArticleLike = {
  tags?: string[] | null
  createdAt: string | number | Date
}

export function extractAvailableTags<T extends { tags?: string[] | null }>(
  articles: T[],
  excludeTag = '教程'
): string[] {
  const tags = new Set<string>()
  articles.forEach((article) => {
    if (article.tags && Array.isArray(article.tags)) {
      article.tags.forEach((tag) => {
        if (tag !== excludeTag) {
          tags.add(tag)
        }
      })
    }
  })
  return Array.from(tags).sort()
}

export function filterArticlesByTag<T extends { tags?: string[] | null }>(
  articles: T[],
  selectedTag: string
): T[] {
  if (selectedTag === 'all') {
    return articles
  }
  return articles.filter((article) =>
    Boolean(article.tags && article.tags.includes(selectedTag))
  )
}

export function sortArticles<T extends ArticleLike>(
  articles: T[],
  sortOrder: 'desc' | 'asc' = 'desc'
): T[] {
  return [...articles].sort((a, b) => {
    const dateA = new Date(a.createdAt)
    const dateB = new Date(b.createdAt)
    return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
  })
}

export function processArticles<T extends ArticleLike>(
  articles: T[],
  selectedTag: string,
  sortOrder: 'desc' | 'asc'
): T[] {
  const filtered = filterArticlesByTag(articles, selectedTag)
  return sortArticles(filtered, sortOrder)
}

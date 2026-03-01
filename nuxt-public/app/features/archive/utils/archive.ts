/**
 * 归档页工具函数：标签统计 + 月份分组
 */

export interface TagStat {
  name: string
  count: number
}

export interface MonthGroup {
  month: string
  articles: any[]
}

/**
 * 统计所有文章的 tag 出现次数，降序排列
 */
export function computeTagStats(articles: any[]): TagStat[] {
  const countMap: Record<string, number> = {}
  for (const article of articles) {
    if (Array.isArray(article.tags)) {
      for (const tag of article.tags) {
        if (tag) countMap[tag] = (countMap[tag] || 0) + 1
      }
    }
  }
  return Object.entries(countMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

/**
 * 按创建月份分组，返回降序（最新月份在前）
 */
export function groupArticlesByMonth(articles: any[]): MonthGroup[] {
  const map: Record<string, any[]> = {}
  for (const article of articles) {
    if (!article.createdAt) continue
    const date = new Date(article.createdAt)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const key = `${year}年${month}月`
    if (!map[key]) map[key] = []
    map[key].push(article)
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, articles]) => ({ month, articles }))
}

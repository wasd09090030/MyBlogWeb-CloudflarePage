/**
 * 归档页格式化函数
 */

export function formatDate(dateString?: string | null): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/** 只显示月/日，用于时间线条目中 */
export function formatDateShort(dateString?: string | null): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}/${day}`
}

type ArticlePathInput = {
  id?: string | number | null
  slug?: string | null
}

export function getArticlePath(article?: ArticlePathInput | null): string {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') {
    return '/'
  }
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}

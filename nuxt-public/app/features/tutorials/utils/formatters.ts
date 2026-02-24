/**
 * 教程页面的格式化函数
 */

export function formatDate(dateString?: string | null): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
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

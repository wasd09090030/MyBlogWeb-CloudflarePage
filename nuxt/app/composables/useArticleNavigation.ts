/**
 * 文章无缝导航 Composable
 *
 * 实现「点击 → Loading 动画 + 后台数据预加载 → 无缝跳转」体验：
 *
 * 1. 点击文章链接时拦截默认导航
 * 2. 手动启动 NuxtLoadingIndicator 进度条动画
 * 3. 后台并行执行：API 数据获取 + Markdown 解析 + 最小动画时间
 * 4. 全部完成后将结果写入预加载缓存
 * 5. 执行 navigateTo，文章页从缓存瞬间读取数据
 *
 * 降级策略：预加载失败时直接跳转，走标准 SSR/CSR 流程
 */

import type { LocationQueryRaw } from 'vue-router'
import { setPreloadedArticle } from '~/utils/articlePreloadCache'
import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { buildArticleAsyncDataKey } from '~/shared/cache/keys'

type ArticleNavInput = {
  id?: string | number | null
  slug?: string | null
}

type NavigateToArticleOptions = {
  query?: LocationQueryRaw
}

type ArticleApiResponse = Record<string, unknown> & {
  id?: string | number
  slug?: string | null
  contentMarkdown?: string | null
  _mdcAst?: unknown
  _mdcToc?: unknown
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误'
}

// 防止并发预加载同一篇文章
const pendingNavigations = new Set<string>()

export function useArticleNavigation() {
  const router = useRouter()

  void router // 保留：后续可能用于更精细的导航控制

  /**
   * 获取文章路由路径
   */
  function getArticlePath(article: ArticleNavInput): string {
    if (!article?.id || article.id === 'null' || article.id === 'undefined') return '/'
    return article.slug
      ? `/article/${article.id}-${article.slug}`
      : `/article/${article.id}`
  }

  /**
   * 获取文章的 useAsyncData 缓存 key
   * 必须与 [id].vue 中的 key 格式一致: `article-${route.params.id}`
   */
  function getCacheKey(article: ArticleNavInput): string | null {
    if (!article?.id) return null
    return buildArticleAsyncDataKey(String(article.id), article.slug || null)
  }

  /**
   * 核心方法：无缝导航到文章
   */
  async function navigateToArticle(article: ArticleNavInput, options: NavigateToArticleOptions = {}): Promise<void> {
    const { query = {} } = options

    if (!article?.id) {
      await navigateTo('/')
      return
    }

    const articleId = String(article.id)
    const articlePath = getArticlePath(article)
    const cacheKey = getCacheKey(article)

    // 防止并发重复导航
    if (pendingNavigations.has(articleId)) return
    pendingNavigations.add(articleId)

    try {
      // 1. 先跳转：不再等待数据预加载，保证导航不阻塞
      await navigateTo({ path: articlePath, query })

      // 2. 后台预加载（不阻塞当前导航）
      if (cacheKey) {
        const client = createApiClient()
        void client.get<ArticleApiResponse>(API_ENDPOINTS.articles.detail(articleId))
          .then((articleData) => {
            if (!articleData) return
            setPreloadedArticle(cacheKey, articleData)
          })
          .catch((error: unknown) => {
            console.warn('[ArticleNav] 后台预加载失败（已降级，不影响浏览）:', getErrorMessage(error))
          })
      }
    } catch (error: unknown) {
      console.warn('[ArticleNav] 跳转失败，降级直跳:', getErrorMessage(error))
      // 降级：直接导航，走标准加载流程
      await navigateTo({ path: articlePath, query })
    } finally {
      pendingNavigations.delete(articleId)
    }
  }

  return {
    navigateToArticle,
    getArticlePath
  }
}

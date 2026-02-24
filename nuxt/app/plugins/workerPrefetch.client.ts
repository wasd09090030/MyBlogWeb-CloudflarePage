/**
 * Worker 预加载插件
 *
 * 在路由导航时通过 Worker 线程预取相关数据和预处理，
 * 减少路由跳转后的主线程阻塞。
 *
 * 策略：
 * 1. 文章页：预取文章数据 + Markdown 预处理（TOC/Mermaid 检测）
 * 2. 画廊页：预缓存首批图片 URL
 * 3. 预加载完成后数据存入全局缓存，页面组件直接使用
 */

import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { buildArticleAsyncDataKey } from '~/shared/cache/keys'
import { createTimedMapCache, withInFlightDedup } from '~/shared/cache'
import { setPreloadedArticle } from '~/utils/articlePreloadCache'

export default defineNuxtPlugin((nuxtApp) => {
  // 仅客户端执行
  if (!process.client) return

  const router = useRouter()
  const client = createApiClient()

  // 预取缓存（避免重复预取）
  const PREFETCH_CACHE_TTL = 5 * 60 * 1000 // 5 分钟
  const prefetchCache = createTimedMapCache<unknown>(PREFETCH_CACHE_TTL)

  function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  /**
   * 检查路由是否是文章页
   */
  function isArticleRoute(path: string): boolean {
    return /^\/article\/\d+/.test(path)
  }

  /**
   * 从路由路径提取文章 ID
   */
  function extractArticleId(path: string): string | null {
    const match = path.match(/^\/article\/(\d+)/)
    return match?.[1] ?? null
  }

  /**
   * 预取文章数据（在 Worker 线程中执行）
   */
  async function prefetchArticleData(articleId: string): Promise<void> {
    const cacheKey = buildArticleAsyncDataKey(articleId)
    if (prefetchCache.has(cacheKey)) return

    await withInFlightDedup(`worker-prefetch:article:${articleId}`, async () => {
      try {
        const { useMarkdownWorker } = await import('~/composables/useMarkdownWorker')
        const { prefetchArticle } = useMarkdownWorker()

        const result = await prefetchArticle(client.baseURL, articleId)
        if (result) {
          prefetchCache.set(cacheKey, result)

          // 关键对齐：将预取结果写入 articlePreloadCache，
          // 供 useAsyncData(getCachedData) 使用同一规则读取，避免“预取成功但页面未命中”。
          const articleSlug = typeof result.slug === 'string' ? result.slug : null
          const asyncDataKey = buildArticleAsyncDataKey(articleId, articleSlug)
          setPreloadedArticle(asyncDataKey, result)
          console.log(`[WorkerPrefetch] 文章 ${articleId} 数据已预取并缓存，key=${asyncDataKey}`)
        }
      } catch (e: unknown) {
        // 预取失败不影响正常导航
        console.warn('[WorkerPrefetch] 文章预取失败:', getErrorMessage(e))
      }
    })
  }

  /**
   * 预缓存画廊图片 URL（在 Worker 线程中 fetch）
   */
  async function prefetchGalleryImages() {
    const cacheKey = 'gallery-images'
    if (prefetchCache.has(cacheKey)) return

    await withInFlightDedup('worker-prefetch:gallery-images', async () => {
      try {
        const { useImagePreloadWorker } = await import('~/composables/useImagePreloadWorker')
        const { quickCacheImages } = useImagePreloadWorker()

        // 获取画廊数据
        const galleries = await client.get<Array<{ imageUrl?: string | null }>>(API_ENDPOINTS.gallery.publicList)
        if (galleries?.length > 0) {
          // 预缓存前 10 张图片
          const urls = galleries
            .slice(0, 10)
            .map(g => g.imageUrl)
            .filter((url): url is string => typeof url === 'string' && url.length > 0)
          await quickCacheImages(urls)

          prefetchCache.set(cacheKey, true)
          console.log(`[WorkerPrefetch] 画廊前 ${urls.length} 张图片已预缓存`)
        }
      } catch (e) {
        // 静默失败
      }
    })
  }

  // =========================================================
  // 路由守卫：导航前预取
  // =========================================================

  router.beforeResolve(async (to, from) => {
    // 跳过首次加载（SSR 已处理）和相同路由
    if (!from.name || to.path === from.path) return

    const targetPath = to.path

    // 文章页预取
    if (isArticleRoute(targetPath)) {
      const articleId = extractArticleId(targetPath)
      if (articleId) {
        // 不 await，让预取与路由导航并行
        prefetchArticleData(articleId)
      }
    }

    // 画廊页预取
    if (targetPath === '/gallery') {
      prefetchGalleryImages()
    }
  })

  // =========================================================
  // 提供给组件使用的预取方法
  // =========================================================

  return {
    provide: {
      workerPrefetch: {
        /**
         * 手动预取文章（用于 hover 预加载）
         */
        prefetchArticle: prefetchArticleData,

        /**
         * 获取已预取的文章数据
         */
        getCachedArticle(articleId: string) {
          const cached = prefetchCache.get(buildArticleAsyncDataKey(articleId))
          return cached ?? null
        },

        /**
         * 清除预取缓存
         */
        clearCache() {
          prefetchCache.clear()
        }
      }
    }
  }
})

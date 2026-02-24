/**
 * 图片预加载 Worker Composable
 */

import { createWorkerComposableController } from '~/utils/workers/composableFactory'
import type {
  ImagePreloadProgress,
  ImagePreloadResult,
  ImagePreloadWorkerActionMap,
  QuickPreloadResult
} from '~/utils/workers/types'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const imagePreloadWorkerController = createWorkerComposableController<ImagePreloadWorkerActionMap>({
  label: 'useImagePreloadWorker',
  name: 'image-preloader',
  workerFactory: () => new Worker(
    new URL('~/utils/workers/imagePreloader.worker.ts', import.meta.url),
    { type: 'module' }
  ),
  managerOptions: { timeout: 60000, singleton: true, maxRetries: 1 }
})

function preloadImageFallback(url: string): Promise<ImagePreloadResult> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({
      url,
      width: img.width,
      height: img.height,
      hasBitmap: false
    })
    img.onerror = () => reject(new Error(`图片加载失败: ${url}`))
    img.src = url
  })
}

async function batchPreloadFallback(
  urls: string[],
  concurrency: number,
  onProgress?: (p: ImagePreloadProgress) => void
): Promise<ImagePreloadResult[]> {
  const total = urls.length
  let loaded = 0
  let failed = 0
  const results: ImagePreloadResult[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency)

    const chunkResults = await Promise.allSettled(chunk.map((url) => preloadImageFallback(url)))

    for (let j = 0; j < chunkResults.length; j++) {
      const settledResult = chunkResults[j]
      const currentUrl = chunk[j]
      if (!settledResult || !currentUrl) continue

      loaded++
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value)
      } else {
        failed++
        results.push({ url: currentUrl, error: getErrorMessage(settledResult.reason) })
      }

      if (onProgress) {
        onProgress({
          loaded,
          total,
          failed,
          percentage: Math.round((loaded / total) * 100)
        })
      }
    }
  }

  return results
}

export function useImagePreloadWorker() {
  async function preloadImages(
    urls: string[],
    options: { concurrency?: number; onProgress?: (p: ImagePreloadProgress) => void } = {}
  ): Promise<ImagePreloadResult[]> {
    const { concurrency = 5, onProgress } = options

    if (!urls || urls.length === 0) return []
    if (!process.client) return []

    if (!imagePreloadWorkerController.isAvailable()) {
      console.log('[useImagePreloadWorker] Worker 不可用，使用主线程降级')
      return batchPreloadFallback(urls, concurrency, onProgress)
    }

    try {
      return await imagePreloadWorkerController.postTask(
        'preloadBatch',
        { urls, concurrency },
        {
          timeout: Math.max(60000, urls.length * 5000),
          onProgress
        }
      )
    } catch (e: unknown) {
      console.warn('[useImagePreloadWorker] Worker 预加载失败，降级到主线程:', getErrorMessage(e))
      return batchPreloadFallback(urls, concurrency, onProgress)
    }
  }

  async function quickCacheImages(urls: string[]): Promise<QuickPreloadResult[]> {
    if (!urls || urls.length === 0) return []
    const result = await imagePreloadWorkerController.postTaskOrNull('quickPreload', { urls }, { timeout: 30000 })
    return result || []
  }

  function isAvailable() {
    return imagePreloadWorkerController.isAvailable()
  }

  function dispose() {
    imagePreloadWorkerController.dispose()
  }

  return {
    preloadImages,
    quickCacheImages,
    isAvailable,
    dispose
  }
}

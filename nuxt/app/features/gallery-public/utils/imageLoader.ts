/**
 * 画廊页面的图片预加载函数
 * 支持 Web Worker 加速模式和传统模式自动降级
 */

import type { Ref } from 'vue'
import type { ImagePreloadProgress } from '~/utils/workers/types'

type GalleryItem = {
  imageUrl: string
  [key: string]: unknown
}

type LoadingState = {
  loadedImagesCount: Ref<number>
  totalImagesToLoad: Ref<number>
}

export function preloadImage(
  src: string,
  loadingState: LoadingState,
  loadingProgressRef: Ref<number>
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      loadingState.loadedImagesCount.value++
      loadingProgressRef.value = (loadingState.loadedImagesCount.value / loadingState.totalImagesToLoad.value) * 100
      resolve(img)
    }
    img.onerror = () => reject(new Error(`图片加载失败: ${src}`))
    img.src = src
  })
}

export async function preloadAllImagesWithWorker(
  galleries: GalleryItem[],
  loadingState: LoadingState,
  loadingProgressRef: Ref<number>,
  previewImagesRef: Ref<GalleryItem[]>,
  preloadCount = 15,
  concurrencyLimit = 5
): Promise<void> {
  if (galleries.length === 0) return

  const imagesToPreload = galleries.slice(0, preloadCount)

  loadingState.totalImagesToLoad.value = imagesToPreload.length
  loadingState.loadedImagesCount.value = 0
  loadingProgressRef.value = 0

  previewImagesRef.value = galleries.slice(0, 3)

  const { useImagePreloadWorker } = await import('~/composables/useImagePreloadWorker')
  const { preloadImages, isAvailable } = useImagePreloadWorker()

  if (isAvailable()) {
    console.log('[Gallery] 使用 Web Worker 并行预加载图片')

    const urls = imagesToPreload.map((g) => g.imageUrl)

    await preloadImages(urls, {
      concurrency: concurrencyLimit,
      onProgress: (progress: ImagePreloadProgress) => {
        loadingState.loadedImagesCount.value = progress.loaded
        loadingProgressRef.value = progress.percentage
      }
    })

    loadingProgressRef.value = 100
    await new Promise<void>((resolve) => setTimeout(resolve, 300))
  } else {
    console.log('[Gallery] Worker 不可用，使用传统模式预加载')
    await preloadAllImages(
      galleries,
      loadingState,
      loadingProgressRef,
      previewImagesRef,
      preloadCount,
      concurrencyLimit
    )
  }
}

export async function preloadAllImages(
  galleries: GalleryItem[],
  loadingState: LoadingState,
  loadingProgressRef: Ref<number>,
  previewImagesRef: Ref<GalleryItem[]>,
  preloadCount = 15,
  concurrencyLimit = 5
): Promise<void> {
  if (galleries.length === 0) return

  const imagesToPreload = galleries.slice(0, preloadCount)

  loadingState.totalImagesToLoad.value = imagesToPreload.length
  loadingState.loadedImagesCount.value = 0
  loadingProgressRef.value = 0

  previewImagesRef.value = galleries.slice(0, 3)

  try {
    const chunks: GalleryItem[][] = []
    for (let i = 0; i < imagesToPreload.length; i += concurrencyLimit) {
      chunks.push(imagesToPreload.slice(i, i + concurrencyLimit))
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map((gallery) => preloadImage(gallery.imageUrl, loadingState, loadingProgressRef))
      )
    }

    loadingProgressRef.value = 100
    await new Promise<void>((resolve) => setTimeout(resolve, 300))
  } catch (error) {
    console.error('预加载图片失败:', error)
    throw error
  }
}

export async function ensureMinLoadingTime(startTime: number, minLoadingTime = 800): Promise<void> {
  const elapsedTime = Date.now() - startTime
  if (elapsedTime < minLoadingTime) {
    await new Promise<void>((resolve) => setTimeout(resolve, minLoadingTime - elapsedTime))
  }
}
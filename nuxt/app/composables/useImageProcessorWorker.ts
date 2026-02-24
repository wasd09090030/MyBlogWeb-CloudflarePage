/**
 * 图片处理 Worker 组合式函数
 */

import { ref, onUnmounted } from 'vue'
import { createWorkerComposableController } from '~/utils/workers/composableFactory'
import type {
  BatchConvertProgress,
  ImageConvertResult,
  ImageProcessOptions,
  ImageProcessorWorkerActionMap,
  ResultOf
} from '~/utils/workers/types'

let refCount = 0

const imageProcessorWorkerController = createWorkerComposableController<ImageProcessorWorkerActionMap>({
  label: 'useImageProcessorWorker',
  name: 'imageProcessor',
  workerFactory: () => new Worker(new URL('~/utils/workers/imageProcessor.worker.ts', import.meta.url), {
    type: 'module'
  }),
  managerOptions: { maxRetries: 1, timeout: 30000 }
})

type FormatSupport = ResultOf<ImageProcessorWorkerActionMap, 'checkSupport'>
type BatchConvertResult = ResultOf<ImageProcessorWorkerActionMap, 'batchConvert'>

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function acquireWorker() {
  // 生命周期策略：该 Worker 成本较高，采用引用计数复用实例，最后一个消费者释放时再 terminate。
  refCount++
  return imageProcessorWorkerController.isAvailable()
}

export function useImageProcessorWorker() {
  const hasWorker = process.client ? acquireWorker() : false
  const formatSupport = ref<FormatSupport | null>(null)

  onUnmounted(() => {
    refCount--
    if (refCount <= 0) {
      imageProcessorWorkerController.dispose()
      refCount = 0
    }
  })

  async function checkSupport() {
    if (formatSupport.value) return formatSupport.value

    if (hasWorker) {
      const result = await imageProcessorWorkerController.postTaskOrNull('checkSupport', {})
      if (result) {
        formatSupport.value = result
        return result
      }
    }

    if (!process.client) {
      const result = { offscreenCanvas: false, formats: { png: true, jpeg: true, webp: false, avif: false } }
      formatSupport.value = result
      return result
    }

    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const result = {
      offscreenCanvas: false,
      formats: {
        png: true,
        jpeg: true,
        webp: canvas.toDataURL('image/webp').startsWith('data:image/webp'),
        avif: false
      }
    }
    formatSupport.value = result
    return result
  }

  async function convertImage(imageBlob: File | Blob, options: ImageProcessOptions): Promise<ImageConvertResult> {
    if (!process.client) {
      throw new Error('图片转换仅在客户端可用')
    }

    if (hasWorker) {
      try {
        const result = await imageProcessorWorkerController.postTask('convert', {
          imageBlob: imageBlob as Blob,
          options
        })
        return result
      } catch (e: unknown) {
        // 降级策略：Worker 失败时回退主线程，确保上传/压缩流程不中断。
        console.warn('[useImageProcessorWorker] Worker 转换失败，降级到主线程:', getErrorMessage(e))
      }
    }

    return await convertImageMainThread(imageBlob, options)
  }

  async function batchConvert(
    images: Array<File | Blob>,
    options: ImageProcessOptions,
    onProgress?: (progress: BatchConvertProgress) => void
  ): Promise<BatchConvertResult> {
    if (!process.client) return []

    if (hasWorker) {
      try {
        return await imageProcessorWorkerController.postTaskWithFallback(
          'batchConvert',
          { images: images as Blob[], options },
          () => batchConvertMainThread(images, options, onProgress),
          { onProgress }
        )
      } catch {
      }
    }

    return await batchConvertMainThread(images, options, onProgress)
  }

  function isAvailable() {
    return !!(hasWorker && typeof OffscreenCanvas !== 'undefined')
  }

  function dispose() {
    refCount--
    if (refCount <= 0) {
      imageProcessorWorkerController.dispose()
      refCount = 0
    }
  }

  return {
    convertImage,
    batchConvert,
    checkSupport,
    isAvailable,
    formatSupport,
    dispose
  }
}

async function convertImageMainThread(imageBlob: File | Blob, options: ImageProcessOptions): Promise<ImageConvertResult> {
  const { format, quality = 0.85, maxWidth, maxHeight } = options

  return new Promise<ImageConvertResult>((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(imageBlob)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let width = img.naturalWidth
      let height = img.naturalHeight

      if (maxWidth && width > maxWidth) {
        height = Math.round((maxWidth / width) * height)
        width = maxWidth
      }
      if (maxHeight && height > maxHeight) {
        width = Math.round((maxHeight / height) * width)
        height = maxHeight
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法获取 Canvas 2D 上下文'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const mimeTypes: Record<ImageProcessOptions['format'], string> = {
        png: 'image/png',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        avif: 'image/avif'
      }
      const mimeType = mimeTypes[format]

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob 失败'))
            return
          }
          resolve({ blob, width, height, size: blob.size, format, mimeType: blob.type })
        },
        mimeType,
        format === 'png' ? undefined : quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }

    img.src = url
  })
}

async function batchConvertMainThread(
  images: Array<File | Blob>,
  options: ImageProcessOptions,
  onProgress?: (progress: BatchConvertProgress) => void
): Promise<BatchConvertResult> {
  const results: BatchConvertResult = []
  for (let i = 0; i < images.length; i++) {
    const currentImage = images[i]
    if (!currentImage) continue

    try {
      const result = await convertImageMainThread(currentImage, options)
      results.push({ index: i, ...result })
    } catch (e: unknown) {
      results.push({ index: i, error: getErrorMessage(e) })
    }
    if (onProgress) {
      onProgress({
        processed: i + 1,
        total: images.length,
        percentage: Math.round(((i + 1) / images.length) * 100)
      })
    }
  }
  return results
}

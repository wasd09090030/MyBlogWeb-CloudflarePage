/**
 * 图片处理 Worker（增强版）
 */

import type {
  ActionName,
  BatchConvertProgress,
  ImageProcessOptions,
  ImageProcessorWorkerActionMap,
  ProgressOf,
  ResultOf,
  WorkerInboundMessage,
  WorkerTaskUnion
} from './types'

const supportsOffscreenCanvas = typeof OffscreenCanvas !== 'undefined'

async function checkFormatSupport(format: 'png' | 'jpeg' | 'webp' | 'avif'): Promise<boolean> {
  if (format === 'png' || format === 'jpeg') return true

  if (!supportsOffscreenCanvas) return false

  try {
    const canvas = new OffscreenCanvas(1, 1)
    const blob = await canvas.convertToBlob({ type: getMimeType(format), quality: 0.5 })
    return blob.type === getMimeType(format)
  } catch {
    return false
  }
}

function getMimeType(format: 'png' | 'jpeg' | 'webp' | 'avif'): string {
  const mimeTypes: Record<'png' | 'jpeg' | 'webp' | 'avif', string> = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif'
  }
  return mimeTypes[format]
}

async function convertImage(imageBlob: Blob, options: ImageProcessOptions) {
  const { format, quality = 0.85, maxWidth, maxHeight } = options

  const bitmap = await createImageBitmap(imageBlob)
  let targetWidth = bitmap.width
  let targetHeight = bitmap.height

  if (maxWidth && targetWidth > maxWidth) {
    targetHeight = Math.round((maxWidth / targetWidth) * targetHeight)
    targetWidth = maxWidth
  }
  if (maxHeight && targetHeight > maxHeight) {
    targetWidth = Math.round((maxHeight / targetHeight) * targetWidth)
    targetHeight = maxHeight
  }

  const canvas = new OffscreenCanvas(targetWidth, targetHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('无法获取 2D Canvas 上下文')
  }
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
  bitmap.close()

  const mimeType = getMimeType(format)
  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: format === 'png' ? undefined : quality
  })

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    size: blob.size,
    format,
    mimeType: blob.type
  }
}

async function batchConvert(taskId: string, images: Blob[], options: ImageProcessOptions) {
  const results: ResultOf<ImageProcessorWorkerActionMap, 'batchConvert'> = []
  const total = images.length

  for (let i = 0; i < images.length; i++) {
    const imageBlob = images[i]
    try {
      if (!imageBlob) {
        results.push({ index: i, error: '图片数据不存在' })
      } else {
        const result = await convertImage(imageBlob, options)
        results.push({ index: i, ...result })
      }
    } catch (e: unknown) {
      results.push({
        index: i,
        error: e instanceof Error ? e.message : '转换失败'
      })
    }

    const progress: BatchConvertProgress = {
      processed: i + 1,
      total,
      percentage: Math.round(((i + 1) / total) * 100)
    }

    workerSelf.postMessage({
      taskId,
      type: 'progress',
      data: progress
    })
  }

  return results
}

type ImageProcessorAction = ActionName<ImageProcessorWorkerActionMap>
type ImageProcessorResult = ResultOf<ImageProcessorWorkerActionMap, ImageProcessorAction>
type ImageProcessorProgress = ProgressOf<ImageProcessorWorkerActionMap, ImageProcessorAction>
type ImageProcessorTask = WorkerTaskUnion<ImageProcessorWorkerActionMap>

const workerSelf = self as {
  onmessage: ((event: MessageEvent<ImageProcessorTask>) => void) | null
  postMessage: (message: WorkerInboundMessage<ImageProcessorResult, ImageProcessorProgress>) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Worker 执行失败'
}

workerSelf.onmessage = async function (event: MessageEvent<ImageProcessorTask>) {
  const message = event.data
  const { taskId, action } = message

  try {
    let result: ImageProcessorResult

    switch (action) {
      case 'checkSupport': {
        result = {
          offscreenCanvas: supportsOffscreenCanvas,
          formats: {
            png: true,
            jpeg: true,
            webp: await checkFormatSupport('webp'),
            avif: await checkFormatSupport('avif')
          }
        }
        break
      }
      case 'convert': {
        if (!supportsOffscreenCanvas) {
          throw new Error('浏览器不支持 OffscreenCanvas')
        }
        result = await convertImage(message.imageBlob, message.options)
        break
      }
      case 'batchConvert': {
        if (!supportsOffscreenCanvas) {
          throw new Error('浏览器不支持 OffscreenCanvas')
        }
        result = await batchConvert(taskId, message.images, message.options)
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

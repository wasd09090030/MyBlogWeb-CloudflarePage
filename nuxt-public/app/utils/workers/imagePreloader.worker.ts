/**
 * 图片预加载 Worker
 */

import type {
  ActionName,
  ImagePreloadProgress,
  ImagePreloadResult,
  ImagePreloadWorkerActionMap,
  ProgressOf,
  ResultOf,
  WorkerInboundMessage,
  WorkerTaskUnion
} from './types'

const supportsImageBitmap = typeof createImageBitmap === 'function'

type InternalPreloadResult = ImagePreloadResult & { bitmap?: ImageBitmap }

async function preloadSingleImage(url: string): Promise<InternalPreloadResult> {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const blob = await response.blob()
  const size = blob.size

  if (supportsImageBitmap) {
    try {
      const bitmap = await createImageBitmap(blob)
      return {
        url,
        width: bitmap.width,
        height: bitmap.height,
        size,
        bitmap
      }
    } catch {
      return { url, size, blobUrl: true }
    }
  }

  return { url, size, blobUrl: true }
}

async function batchPreload(taskId: string, urls: string[], concurrency = 5) {
  const total = urls.length
  let loaded = 0
  let failed = 0
  const results: ImagePreloadResult[] = []
  const transferables: Transferable[] = []

  for (let i = 0; i < urls.length; i += concurrency) {
    const chunk = urls.slice(i, i + concurrency)

    const chunkResults = await Promise.allSettled(chunk.map((url) => preloadSingleImage(url)))

    for (let j = 0; j < chunkResults.length; j++) {
      const result = chunkResults[j]
      if (!result) {
        continue
      }
      if (result.status === 'fulfilled') {
        loaded++
        const data = result.value

        if (data.bitmap) {
          transferables.push(data.bitmap)
        }

        results.push({
          url: data.url,
          width: data.width,
          height: data.height,
          size: data.size,
          hasBitmap: !!data.bitmap,
          blobUrl: data.blobUrl || false
        })
      } else {
        failed++
        loaded++
        const failedUrl = chunk[j] ?? ''
        results.push({
          url: failedUrl,
          error: result.reason instanceof Error ? result.reason.message : '加载失败'
        })
      }
    }

    const progress: ImagePreloadProgress = {
      loaded,
      total,
      failed,
      percentage: Math.round((loaded / total) * 100)
    }

    workerSelf.postMessage({
      taskId,
      type: 'progress',
      data: progress
    })
  }

  return { results, transferables }
}

async function quickPreload(url: string) {
  const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  await response.blob()
  return { url, cached: true }
}

type ImagePreloadAction = ActionName<ImagePreloadWorkerActionMap>
type ImagePreloadResultUnion = ResultOf<ImagePreloadWorkerActionMap, ImagePreloadAction>
type ImagePreloadProgressUnion = ProgressOf<ImagePreloadWorkerActionMap, ImagePreloadAction>
type ImagePreloadTask = WorkerTaskUnion<ImagePreloadWorkerActionMap>

const workerSelf = self as {
  onmessage: ((event: MessageEvent<ImagePreloadTask>) => void) | null
  postMessage: (
    message: WorkerInboundMessage<ImagePreloadResultUnion, ImagePreloadProgressUnion>,
    transferables?: Transferable[]
  ) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Worker 执行失败'
}

workerSelf.onmessage = async function (event: MessageEvent<ImagePreloadTask>) {
  const message = event.data
  const { taskId, action } = message

  try {
    let result: ImagePreloadResultUnion
    let transferables: Transferable[] = []

    switch (action) {
      case 'preloadBatch': {
        const { urls, concurrency = 5 } = message
        const batchResult = await batchPreload(taskId, urls, concurrency)
        result = batchResult.results
        transferables = batchResult.transferables
        break
      }
      case 'preloadSingle': {
        const single = await preloadSingleImage(message.url)
        if (single.bitmap) transferables = [single.bitmap]
        result = {
          url: single.url,
          width: single.width,
          height: single.height,
          size: single.size,
          hasBitmap: !!single.bitmap,
          blobUrl: single.blobUrl || false,
          error: single.error
        }
        break
      }
      case 'quickPreload': {
        const { urls } = message
        const promises = urls.map((url: string) =>
          quickPreload(url).catch((err: unknown) => ({
            url,
            error: err instanceof Error ? err.message : '加载失败'
          }))
        )
        result = await Promise.all(promises)
        break
      }
      default:
        throw new Error(`未知的 Worker 动作: ${action}`)
    }

    if (transferables.length > 0) {
      workerSelf.postMessage({ taskId, type: 'result', data: result }, transferables)
    } else {
      workerSelf.postMessage({ taskId, type: 'result', data: result })
    }
  } catch (error: unknown) {
    workerSelf.postMessage({ taskId, type: 'error', error: getErrorMessage(error) })
  }
}

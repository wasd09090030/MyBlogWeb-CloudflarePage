/**
 * Worker 生命周期管理器
 * 负责 Worker 实例创建、任务队列、错误处理和优雅降级
 */

import type {
  ActionName,
  PayloadOf,
  ProgressOf,
  ResultOf,
  WorkerActionMap,
  WorkerInboundMessage
} from '~/utils/workers/types'

type DefaultWorkerActionMap = Record<string, {
  payload: Record<string, unknown>
  result: unknown
  progress?: unknown
}>

type TaskRecord = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timer: ReturnType<typeof setTimeout>
  action: string
}

type PostTaskOptions<TProgress = unknown> = {
  onProgress?: (data: TProgress) => void
  timeout?: number
  transferables?: Transferable[]
}

type WorkerManagerOptions = {
  timeout?: number
  taskTimeout?: number
  singleton?: boolean
  maxRetries?: number
}

export type WorkerManager<TMap extends WorkerActionMap = DefaultWorkerActionMap> = {
  postTask: <TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    taskOptions?: PostTaskOptions<ProgressOf<TMap, TAction>>
  ) => Promise<ResultOf<TMap, TAction>>
  postTaskWithFallback: <TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    fallback: () => ResultOf<TMap, TAction> | Promise<ResultOf<TMap, TAction>>,
    taskOptions?: PostTaskOptions<ProgressOf<TMap, TAction>>
  ) => Promise<ResultOf<TMap, TAction>>
  terminate: () => void
  getPendingCount: () => number
  isAvailable: () => boolean
  readonly name: string
}

// 全局 Worker 实例缓存
const workerInstances = new Map<string, Worker>()
let taskIdCounter = 0

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * 检测浏览器是否支持 Web Workers
 */
export function isWorkerSupported(): boolean {
  return typeof Worker !== 'undefined'
}

/**
 * 检测是否支持 OffscreenCanvas
 */
export function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
}

/**
 * 检测是否支持 createImageBitmap
 */
export function isImageBitmapSupported(): boolean {
  return typeof createImageBitmap === 'function'
}

/**
 * 生成唯一任务 ID
 */
function generateTaskId(): string {
  return `task_${++taskIdCounter}_${Date.now()}`
}

/**
 * 创建 Worker 包装器
 */
export function createWorkerManager(
  name: string,
  workerFactory: () => Worker,
  options?: WorkerManagerOptions
): WorkerManager
export function createWorkerManager<TMap extends WorkerActionMap>(
  name: string,
  workerFactory: () => Worker,
  options?: WorkerManagerOptions
): WorkerManager<TMap>
export function createWorkerManager<TMap extends WorkerActionMap = DefaultWorkerActionMap>(
  name: string,
  workerFactory: () => Worker,
  options: WorkerManagerOptions = {}
): WorkerManager<TMap> {
  const {
    timeout,
    taskTimeout,
    singleton = true,
    maxRetries = 1
  } = options

  // 兼容历史调用：taskTimeout 与 timeout 等价
  const defaultTimeout = timeout ?? taskTimeout ?? 30000

  // 等待中的任务
  const pendingTasks = new Map<string, TaskRecord>()
  // 进度回调
  const progressCallbacks = new Map<string, (data: unknown) => void>()
  let worker: Worker | null = null
  let isTerminated = false

  /**
   * 获取或创建 Worker 实例
   */
  function getWorker(): Worker | null {
    if (isTerminated) return null

    // 单例模式：复用现有实例
    if (singleton && workerInstances.has(name)) {
      return workerInstances.get(name) || null
    }

    try {
      worker = workerFactory()

      worker.onmessage = handleMessage
      worker.onerror = handleError

      if (singleton) {
        workerInstances.set(name, worker)
      }

      console.log(`[WorkerManager] ${name} Worker 已创建`)
      return worker
    } catch (err) {
      console.error(`[WorkerManager] ${name} Worker 创建失败:`, err)
      return null
    }
  }

  /**
   * 处理 Worker 消息
   */
  function handleMessage(event: MessageEvent): void {
    const raw = (event.data || {}) as WorkerInboundMessage<unknown, unknown>
    const taskId = raw.taskId || ''
    const type = raw.type

    if (type === 'progress') {
      const progressCb = progressCallbacks.get(taskId)
      if (progressCb) {
        progressCb(raw.data)
      }
      return
    }

    const task = pendingTasks.get(taskId)
    if (!task) return

    clearTimeout(task.timer)
    pendingTasks.delete(taskId)
    progressCallbacks.delete(taskId)

    if (type === 'error') {
      task.reject(new Error(raw.error || 'Worker 任务执行失败'))
    } else {
      task.resolve(raw.data)
    }
  }

  /**
   * 处理 Worker 错误
   */
  function handleError(event: ErrorEvent): void {
    console.error(`[WorkerManager] ${name} Worker 错误:`, event.message)

    // 拒绝所有等待中的任务
    for (const [, task] of pendingTasks) {
      clearTimeout(task.timer)
      task.reject(new Error(`Worker 错误: ${event.message}`))
    }
    pendingTasks.clear()
    progressCallbacks.clear()

    // 移除失败的 Worker 实例以便下次重新创建
    if (singleton) {
      workerInstances.delete(name)
    }
    worker = null
  }

  /**
   * 发送任务到 Worker
   */
  function postTask<TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    taskOptions: PostTaskOptions<ProgressOf<TMap, TAction>> = {}
  ): Promise<ResultOf<TMap, TAction>> {
    return new Promise<ResultOf<TMap, TAction>>((resolve, reject) => {
      const w = getWorker()
      if (!w) {
        reject(new Error(`Worker "${name}" 不可用`))
        return
      }

      const taskId = generateTaskId()
      const perTaskTimeout = taskOptions.timeout ?? defaultTimeout

      // 设置超时
      const timer = setTimeout(() => {
        pendingTasks.delete(taskId)
        progressCallbacks.delete(taskId)
        reject(new Error(`Worker 任务超时 (${perTaskTimeout}ms): ${action}`))
      }, perTaskTimeout)

      // 注册任务
      pendingTasks.set(taskId, { resolve: resolve as (v: unknown) => void, reject, timer, action })

      // 注册进度回调
      if (taskOptions.onProgress) {
        progressCallbacks.set(taskId, taskOptions.onProgress as (data: unknown) => void)
      }

      // 发送消息
      const message = { taskId, action, ...payload } as Record<string, unknown>
      if (taskOptions.transferables) {
        w.postMessage(message, taskOptions.transferables)
      } else {
        w.postMessage(message)
      }
    })
  }

  /**
   * 带降级的任务执行
   */
  async function postTaskWithFallback<TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    fallback: () => ResultOf<TMap, TAction> | Promise<ResultOf<TMap, TAction>>,
    taskOptions: PostTaskOptions<ProgressOf<TMap, TAction>> = {}
  ): Promise<ResultOf<TMap, TAction>> {
    if (!isWorkerSupported() || isTerminated) {
      console.log(`[WorkerManager] ${name} Worker 不可用，使用主线程降级`)
      return fallback()
    }

    let retries = 0
    while (retries <= maxRetries) {
      try {
        return await postTask(action, payload, taskOptions)
      } catch (err: unknown) {
        retries++
        if (retries > maxRetries) {
          console.warn(`[WorkerManager] ${name} Worker 任务失败 (${retries}次)，降级到主线程:`, getErrorMessage(err))
          return fallback()
        }
        console.warn(`[WorkerManager] ${name} Worker 任务重试 ${retries}/${maxRetries}:`, getErrorMessage(err))
      }
    }

    return fallback()
  }

  /**
   * 终止 Worker
   */
  function terminate(): void {
    isTerminated = true

    // 拒绝所有等待中的任务
    for (const [, task] of pendingTasks) {
      clearTimeout(task.timer)
      task.reject(new Error('Worker 已终止'))
    }
    pendingTasks.clear()
    progressCallbacks.clear()

    if (worker) {
      worker.terminate()
      worker = null
    }

    if (singleton) {
      workerInstances.delete(name)
    }

    console.log(`[WorkerManager] ${name} Worker 已终止`)
  }

  /**
   * 获取等待中的任务数量
   */
  function getPendingCount(): number {
    return pendingTasks.size
  }

  /**
   * 检查 Worker 是否可用
   */
  function isAvailable(): boolean {
    return isWorkerSupported() && !isTerminated
  }

  return {
    postTask: postTask as WorkerManager<TMap>['postTask'],
    postTaskWithFallback: postTaskWithFallback as WorkerManager<TMap>['postTaskWithFallback'],
    terminate,
    getPendingCount,
    isAvailable,
    get name() { return name }
  }
}

/**
 * 终止所有 Worker 实例（应用销毁时调用）
 */
export function terminateAllWorkers(): void {
  for (const [name, worker] of workerInstances) {
    try {
      worker.terminate()
      console.log(`[WorkerManager] ${name} Worker 已终止`)
    } catch {
      // ignore
    }
  }
  workerInstances.clear()
}

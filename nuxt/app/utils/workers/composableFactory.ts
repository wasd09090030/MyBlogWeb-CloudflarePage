import { createWorkerManager, isWorkerSupported } from '~/utils/workers/workerManager'
import type { WorkerManager } from '~/utils/workers/workerManager'
import type { ActionName, PayloadOf, ProgressOf, ResultOf, WorkerActionMap } from '~/utils/workers/types'

type ControllerOptions<TMap extends WorkerActionMap> = {
  label: string
  name: string
  workerFactory: () => Worker
  managerOptions?: {
    timeout?: number
    taskTimeout?: number
    singleton?: boolean
    maxRetries?: number
  }
}

type TaskOptions<TProgress = unknown> = {
  onProgress?: (data: TProgress) => void
  timeout?: number
  transferables?: Transferable[]
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 通用 Worker 控制器。
 *
 * 设计说明：
 * - 统一“懒创建 + 可用性探测 + 释放 + 日志”模板，减少 composable 重复代码；
 * - 保留业务层 fallback 自主权，避免将业务语义耦合到基础设施；
 * - 所有任务仍沿用统一消息协议（taskId + type + data/error）。
 */
export function createWorkerComposableController<TMap extends WorkerActionMap>(
  options: ControllerOptions<TMap>
) {
  let manager: WorkerManager<TMap> | null = null

  function getManager(): WorkerManager<TMap> | null {
    if (manager) return manager

    if (!process.client || !isWorkerSupported()) {
      return null
    }

    try {
      manager = createWorkerManager<TMap>(
        options.name,
        options.workerFactory,
        options.managerOptions
      )
      return manager
    } catch (error) {
      console.warn(`[${options.label}] Worker 创建失败:`, getErrorMessage(error))
      return null
    }
  }

  async function postTask<TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    taskOptions?: TaskOptions<ProgressOf<TMap, TAction>>
  ): Promise<ResultOf<TMap, TAction>> {
    const current = getManager()
    if (!current) {
      throw new Error(`Worker "${options.name}" 不可用`)
    }
    return await current.postTask(action, payload, taskOptions)
  }

  async function postTaskOrNull<TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    taskOptions?: TaskOptions<ProgressOf<TMap, TAction>>
  ): Promise<ResultOf<TMap, TAction> | null> {
    const current = getManager()
    if (!current) return null
    try {
      return await current.postTask(action, payload, taskOptions)
    } catch (error) {
      console.warn(`[${options.label}] Worker 任务失败:`, getErrorMessage(error))
      return null
    }
  }

  async function postTaskWithFallback<TAction extends ActionName<TMap>>(
    action: TAction,
    payload: PayloadOf<TMap, TAction>,
    fallback: () => ResultOf<TMap, TAction> | Promise<ResultOf<TMap, TAction>>,
    taskOptions?: TaskOptions<ProgressOf<TMap, TAction>>
  ): Promise<ResultOf<TMap, TAction>> {
    const current = getManager()
    if (!current) {
      return await fallback()
    }
    return await current.postTaskWithFallback(action, payload, fallback, taskOptions)
  }

  function isAvailable(): boolean {
    const current = getManager()
    return current?.isAvailable() || false
  }

  function dispose(): void {
    if (manager) {
      manager.terminate()
      manager = null
    }
  }

  return {
    getManager,
    postTask,
    postTaskOrNull,
    postTaskWithFallback,
    isAvailable,
    dispose
  }
}

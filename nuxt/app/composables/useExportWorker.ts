/**
 * 文档导出 Worker Composable
 */

import { createWorkerComposableController } from '~/utils/workers/composableFactory'
import type { DocxParagraph, ExportWorkerActionMap } from '~/utils/workers/types'

const exportWorkerController = createWorkerComposableController<ExportWorkerActionMap>({
  label: 'useExportWorker',
  name: 'document-export',
  workerFactory: () => new Worker(
    new URL('~/utils/workers/documentExport.worker.ts', import.meta.url),
    { type: 'module' }
  ),
  managerOptions: { timeout: 60000, singleton: true, maxRetries: 0 }
})

export function useExportWorker() {
  const isExporting = ref(false)
  const exportProgress = ref(0)

  async function parseMarkdownForDocx(
    markdown: string,
    options: Record<string, unknown> = {}
  ): Promise<DocxParagraph[] | null> {
    return await exportWorkerController.postTaskOrNull(
      'parseForDocx',
      { markdown, options },
      {
        timeout: 30000,
        onProgress: (progress) => {
          exportProgress.value = progress?.percentage || 0
        }
      }
    )
  }

  async function prepareElementForPdf(
    sourceElement: HTMLElement,
    onChunk?: (progress: number) => void
  ): Promise<HTMLElement> {
    isExporting.value = true
    exportProgress.value = 0

    try {
      const cloned = sourceElement.cloneNode(true) as HTMLElement

      cloned.querySelectorAll('.animate-pulse, .skeleton, .loading').forEach((el) => el.remove())

      const children = Array.from(cloned.children)
      const chunkSize = 20
      let processed = 0

      for (let i = 0; i < children.length; i += chunkSize) {
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }

        processed += Math.min(chunkSize, children.length - i)
        exportProgress.value = Math.round((processed / children.length) * 50)

        if (onChunk) onChunk(exportProgress.value)
      }

      exportProgress.value = 50
      return cloned
    } catch (e) {
      console.error('[useExportWorker] DOM 预处理失败:', e)
      throw e
    }
  }

  function reset() {
    isExporting.value = false
    exportProgress.value = 0
  }

  function dispose() {
    exportWorkerController.dispose()
    reset()
  }

  return {
    parseMarkdownForDocx,
    prepareElementForPdf,
    reset,
    dispose,
    isExporting: readonly(isExporting),
    exportProgress: readonly(exportProgress)
  }
}

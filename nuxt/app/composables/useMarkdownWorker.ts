/**
 * Markdown Worker Composable
 */

import { createWorkerComposableController } from '~/utils/workers/composableFactory'
import type {
  MarkdownPreprocessResult,
  MarkdownWorkerActionMap,
  TocItem
} from '~/utils/workers/types'

const markdownWorkerController = createWorkerComposableController<MarkdownWorkerActionMap>({
  label: 'useMarkdownWorker',
  name: 'markdown-processor',
  workerFactory: () => new Worker(
    new URL('~/utils/workers/markdownProcessor.worker.ts', import.meta.url),
    { type: 'module' }
  ),
  managerOptions: { timeout: 15000, singleton: true, maxRetries: 1 }
})

function extractTocFallback(markdown: string): TocItem[] {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const headings: TocItem[] = []
  let inCodeBlock = false

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+?)(?:\s+#*)?$/)
    if (match) {
      const level = (match[1] || '').length
      const text = (match[2] || '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .trim()

      const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

      headings.push({ id, text, level })
    }
  }

  return headings
}

function preprocessFallback(markdown: string): MarkdownPreprocessResult {
  const toc = extractTocFallback(markdown)
  const hasMermaid = markdown?.includes('```mermaid') || false

  const codeBlockRegex = /```(\w+)?/g
  const languages = new Set<string>()
  let codeBlockCount = 0
  let match: RegExpExecArray | null
  let isOpening = true

  while ((match = codeBlockRegex.exec(markdown || '')) !== null) {
    if (isOpening) {
      codeBlockCount++
      if (match[1]) languages.add(match[1].toLowerCase())
    }
    isOpening = !isOpening
  }

  const text = (markdown || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*_~\[\]()>|\\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const words = text.split(/\s+/).filter((w) => w.length > 0).length
  const wordCount = cjkChars + words
  const readingTime = Math.max(1, Math.ceil(wordCount / 275))

  return {
    toc,
    codeBlocks: {
      languages: Array.from(languages),
      hasMermaid,
      codeBlockCount
    },
    stats: {
      charCount: text.length,
      wordCount,
      readingTime
    }
  }
}

export function useMarkdownWorker() {
  async function preprocessMarkdown(markdown: string): Promise<MarkdownPreprocessResult> {
    if (!markdown) {
      return {
        toc: [],
        codeBlocks: { languages: [], hasMermaid: false, codeBlockCount: 0 },
        stats: { charCount: 0, wordCount: 0, readingTime: 0 }
      }
    }

    return markdownWorkerController.postTaskWithFallback(
      'preprocess',
      { markdown },
      () => preprocessFallback(markdown)
    )
  }

  async function extractToc(markdown: string): Promise<TocItem[]> {
    return markdownWorkerController.postTaskWithFallback(
      'extractToc',
      { markdown },
      () => extractTocFallback(markdown)
    )
  }

  async function prefetchArticle(apiBase: string, articleId: string | number): Promise<Record<string, unknown> | null> {
    return await markdownWorkerController.postTaskOrNull(
      'prefetchArticle',
      { apiBase, articleId },
      { timeout: 10000 }
    )
  }

  function isAvailable() {
    return markdownWorkerController.isAvailable()
  }

  function dispose() {
    markdownWorkerController.dispose()
  }

  return {
    preprocessMarkdown,
    extractToc,
    prefetchArticle,
    isAvailable,
    dispose
  }
}

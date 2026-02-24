/**
 * Markdown 预处理 Worker
 *
 * 在 Worker 线程中执行以下任务，避免阻塞主线程：
 * 1. 从原始 Markdown 文本中提取 TOC 标题结构
 * 2. 检测 Mermaid 代码块
 * 3. 检测所需的代码高亮语言
 * 4. 计算文字统计（字数、阅读时间）
 * 5. 预取文章 API 数据
 */

import type {
  ActionName,
  MarkdownPreprocessResult,
  MarkdownStats,
  MarkdownWorkerActionMap,
  ResultOf,
  TocItem,
  WorkerInboundMessage,
  WorkerTaskUnion
} from './types'

// =========================================================
// TOC 提取
// =========================================================

function extractToc(markdown: string): TocItem[] {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const headings: Array<{ id: string; text: string; level: number }> = []

  let inCodeBlock = false

  for (const line of lines) {
    if (line.trimStart().startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    const match = line.match(/^(#{1,6})\s+(.+?)(?:\s+#*)?$/)
    if (match) {
      const headingHashes = match[1]
      const headingText = match[2]
      if (!headingHashes || !headingText) {
        continue
      }
      const level = headingHashes.length
      const text = headingText
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

  return buildTocTree(headings)
}

function buildTocTree(headings: TocItem[]): TocItem[] {
  if (headings.length === 0) return []

  const root: { children: TocItem[] } = { children: [] }
  const stack: Array<{ node: { children: TocItem[] }; level: number }> = [{ node: root, level: 0 }]

  for (const heading of headings) {
    const item = {
      id: heading.id,
      text: heading.text,
      level: heading.level,
      children: [] as TocItem[]
    }

    while (stack.length > 1 && (stack[stack.length - 1]?.level ?? 0) >= heading.level) {
      stack.pop()
    }

    const parent = stack[stack.length - 1]
    if (!parent) {
      continue
    }
    parent.node.children.push(item)
    stack.push({ node: item, level: heading.level })
  }

  return root.children
}

function analyzeCodeBlocks(markdown: string) {
  if (!markdown) return { languages: [], hasMermaid: false, codeBlockCount: 0 }

  const languages = new Set<string>()
  let hasMermaid = false
  let codeBlockCount = 0

  const codeBlockRegex = /```(\w+)?/g
  let match: RegExpExecArray | null
  let isOpening = true

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    if (isOpening) {
      codeBlockCount++
      const lang = match[1]
      if (lang) {
        if (lang === 'mermaid') {
          hasMermaid = true
        }
        languages.add(lang.toLowerCase())
      }
    }
    isOpening = !isOpening
  }

  return {
    languages: Array.from(languages),
    hasMermaid,
    codeBlockCount
  }
}

function computeTextStats(markdown: string): MarkdownStats {
  if (!markdown) return { charCount: 0, wordCount: 0, readingTime: 0 }

  let text = markdown.replace(/```[\s\S]*?```/g, '')
  text = text.replace(/`[^`]+`/g, '')
  text = text.replace(/[#*_~\[\]()>|\\-]/g, '')
  text = text.replace(/\s+/g, ' ').trim()

  const charCount = text.length
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  const englishWords = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length

  const wordCount = cjkChars + englishWords
  const readingTime = Math.max(1, Math.ceil(cjkChars / 300 + englishWords / 200))

  return { charCount, wordCount, readingTime }
}

async function prefetchArticle(apiBase: string, articleId: string | number) {
  const response = await fetch(`${apiBase}/articles/${articleId}`)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

type MarkdownAction = ActionName<MarkdownWorkerActionMap>
type MarkdownResult = ResultOf<MarkdownWorkerActionMap, MarkdownAction>
type MarkdownTask = WorkerTaskUnion<MarkdownWorkerActionMap>

const workerSelf = self as {
  onmessage: ((event: MessageEvent<MarkdownTask>) => void) | null
  postMessage: (message: WorkerInboundMessage<MarkdownResult>) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Worker 执行失败'
}

workerSelf.onmessage = async function (event: MessageEvent<MarkdownTask>) {
  const message = event.data
  const { taskId, action } = message

  try {
    let result: MarkdownResult

    switch (action) {
      case 'extractToc': {
        result = extractToc(message.markdown)
        break
      }
      case 'analyzeCodeBlocks': {
        result = analyzeCodeBlocks(message.markdown)
        break
      }
      case 'computeTextStats': {
        result = computeTextStats(message.markdown)
        break
      }
      case 'preprocess': {
        const markdown = message.markdown
        const toc = extractToc(markdown)
        const codeBlocks = analyzeCodeBlocks(markdown)
        const stats = computeTextStats(markdown)

        result = { toc, codeBlocks, stats } satisfies MarkdownPreprocessResult
        break
      }
      case 'prefetchArticle': {
        const article = await prefetchArticle(message.apiBase, message.articleId) as Record<string, unknown>

        if (typeof article.contentMarkdown === 'string') {
          const markdown = article.contentMarkdown
          article._workerPreprocessed = {
            toc: extractToc(markdown),
            codeBlocks: analyzeCodeBlocks(markdown),
            stats: computeTextStats(markdown)
          }
        }
        result = article
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

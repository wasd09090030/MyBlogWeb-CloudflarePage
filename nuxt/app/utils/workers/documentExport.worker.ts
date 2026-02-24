/**
 * 文档导出 Worker
 */

import type {
  ActionName,
  DocxParagraph,
  DocxRun,
  ExportWorkerActionMap,
  ProgressOf,
  ResultOf,
  WorkerInboundMessage,
  WorkerTaskUnion
} from './types'

type ExportAction = ActionName<ExportWorkerActionMap>
type ExportResult = ResultOf<ExportWorkerActionMap, ExportAction>
type ExportProgress = ProgressOf<ExportWorkerActionMap, ExportAction>
type ExportTask = WorkerTaskUnion<ExportWorkerActionMap>

function parseMarkdownToDocxStructure(
  markdown: string,
  options: Record<string, unknown> = {},
  taskId?: string
): DocxParagraph[] {
  void options
  const lines = markdown.split('\n')
  const paragraphs: DocxParagraph[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let codeLanguage = ''
  let inTable = false
  let tableLines: string[] = []
  const total = lines.length

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        paragraphs.push({
          type: 'codeBlock',
          language: codeLanguage,
          lines: codeBlockLines.map((text): DocxRun => ({ text, code: true }))
        })
        codeBlockLines = []
        codeLanguage = ''
        inCodeBlock = false
      } else {
        inCodeBlock = true
        codeLanguage = line.slice(3).trim()
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockLines.push(line)
      continue
    }

    if (line.match(/^\|.+\|$/)) {
      if (!inTable) inTable = true
      tableLines.push(line)
      continue
    } else if (inTable) {
      paragraphs.push({
        type: 'table',
        rows: parseTableRows(tableLines)
      })
      tableLines = []
      inTable = false
    }

    if (!line.trim()) {
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const headingHashes = headingMatch[1]
      const headingText = headingMatch[2]
      if (!headingHashes || !headingText) {
        continue
      }
      paragraphs.push({
        type: 'heading',
        level: headingHashes.length,
        text: headingText,
        runs: parseInlineFormatting(headingText)
      })
      continue
    }

    if (line.match(/^(-{3,}|\*{3,}|_{3,})\s*$/)) {
      paragraphs.push({ type: 'horizontalRule' })
      continue
    }

    if (line.startsWith('>')) {
      const text = line.replace(/^>\s*/, '')
      paragraphs.push({
        type: 'blockquote',
        text,
        runs: parseInlineFormatting(text)
      })
      continue
    }

    if (line.match(/^[-*+]\s+/)) {
      const text = line.replace(/^[-*+]\s+/, '')
      const indent = (line.match(/^\s*/) || [''])[0].length
      paragraphs.push({
        type: 'unorderedList',
        text,
        indent: Math.floor(indent / 2),
        runs: parseInlineFormatting(text)
      })
      continue
    }

    const olMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (olMatch) {
      const orderNumber = olMatch[1]
      const listText = olMatch[2]
      if (!orderNumber || !listText) {
        continue
      }
      const indent = (line.match(/^\s*/) || [''])[0].length
      paragraphs.push({
        type: 'orderedList',
        number: parseInt(orderNumber, 10),
        text: listText,
        indent: Math.floor(indent / 2),
        runs: parseInlineFormatting(listText)
      })
      continue
    }

    paragraphs.push({
      type: 'paragraph',
      text: line,
      runs: parseInlineFormatting(line)
    })

    if (i % 100 === 0) {
      const progress: ExportProgress = { percentage: Math.round((i / total) * 100) }
      if (taskId) {
        workerSelf.postMessage({
          taskId,
          type: 'progress',
          data: progress
        })
      }
    }
  }

  if (codeBlockLines.length > 0) {
    paragraphs.push({
      type: 'codeBlock',
      language: codeLanguage,
      lines: codeBlockLines.map((text): DocxRun => ({ text, code: true }))
    })
  }
  if (tableLines.length > 0) {
    paragraphs.push({
      type: 'table',
      rows: parseTableRows(tableLines)
    })
  }

  return paragraphs
}

function parseTableRows(lines: string[]) {
  return lines
    .filter((line) => !line.match(/^\|[\s:-]+\|$/))
    .map((line) =>
      line.split('|')
        .filter((cell) => cell.trim())
        .map((cell) => cell.trim())
    )
}

function parseInlineFormatting(text: string): DocxRun[] {
  const runs: DocxRun[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)|([^*`\[]+))/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      runs.push({ text: match[2], bold: true })
    } else if (match[3]) {
      runs.push({ text: match[3], italic: true })
    } else if (match[4]) {
      runs.push({ text: match[4], code: true })
    } else if (match[5]) {
      runs.push({ text: match[5], link: match[6] })
    } else if (match[7]) {
      runs.push({ text: match[7] })
    }
  }

  if (runs.length === 0 && text) {
    runs.push({ text })
  }

  return runs
}

const workerSelf = self as {
  onmessage: ((event: MessageEvent<ExportTask>) => void) | null
  postMessage: (message: WorkerInboundMessage<ExportResult, ExportProgress>) => void
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Worker 执行失败'
}

workerSelf.onmessage = function (event: MessageEvent<ExportTask>) {
  const message = event.data
  const { taskId, action } = message

  try {
    let result: ExportResult

    switch (action) {
      case 'parseForDocx': {
        result = parseMarkdownToDocxStructure(message.markdown, message.options, taskId)
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

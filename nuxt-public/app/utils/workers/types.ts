/**
 * Worker 与主线程之间的统一消息协议。
 * 约定：每个任务由 taskId 关联，返回类型使用 discriminated union 区分。
 */
export type WorkerMessageType = 'result' | 'progress' | 'error'

export type WorkerResultMessage<TResult = unknown> = {
  taskId: string
  type: 'result'
  data: TResult
}

export type WorkerProgressMessage<TProgress = unknown> = {
  taskId: string
  type: 'progress'
  data: TProgress
}

export type WorkerErrorMessage = {
  taskId: string
  type: 'error'
  error: string
}

export type WorkerInboundMessage<TResult = unknown, TProgress = unknown> =
  | WorkerResultMessage<TResult>
  | WorkerProgressMessage<TProgress>
  | WorkerErrorMessage

/**
 * ActionMap 是 Worker 类型系统的核心：为每个 action 声明 payload/result/progress。
 * 之后通过 ActionName/PayloadOf/ResultOf 在调用侧自动推导类型。
 */
export type WorkerActionDefinition = {
  payload: Record<string, unknown>
  result: unknown
  progress?: unknown
}

export type WorkerActionMap = Record<string, WorkerActionDefinition>

export type ActionName<TMap extends WorkerActionMap> = Extract<keyof TMap, string>
export type PayloadOf<TMap extends WorkerActionMap, TAction extends ActionName<TMap>> = TMap[TAction]['payload']
export type ResultOf<TMap extends WorkerActionMap, TAction extends ActionName<TMap>> = TMap[TAction]['result']
export type ProgressOf<TMap extends WorkerActionMap, TAction extends ActionName<TMap>> =
  TMap[TAction] extends { progress: infer P } ? P : unknown

export type WorkerTaskMessage<
  TMap extends WorkerActionMap,
  TAction extends ActionName<TMap>
> = {
  taskId: string
  action: TAction
} & PayloadOf<TMap, TAction>

export type WorkerTaskUnion<TMap extends WorkerActionMap> = {
  [K in ActionName<TMap>]: WorkerTaskMessage<TMap, K>
}[ActionName<TMap>]

/**
 * 搜索相关类型
 */
export type ArticleLike = {
  id?: string | number
  title?: string
  summary?: string
  tags?: string[]
  category?: string
  createdAt?: string | number | Date
  [key: string]: unknown
}

export type SearchQueryOptions = {
  keyword?: string
  category?: string
  tag?: string
  sortBy?: 'date' | 'title' | 'id'
  order?: 'asc' | 'desc'
}

export type SearchWorkerActionMap = {
  buildIndex: {
    payload: { articles: ArticleLike[] }
    result: { tokenCount: number; articleCount: number }
  }
  search: {
    payload: { articles: ArticleLike[]; keyword: string }
    result: ArticleLike[]
  }
  filter: {
    payload: { articles: ArticleLike[]; category?: string; tag?: string }
    result: ArticleLike[]
  }
  sort: {
    payload: { articles: ArticleLike[]; sortBy?: 'date' | 'title' | 'id'; order?: 'asc' | 'desc' }
    result: ArticleLike[]
  }
  query: {
    payload: { articles: ArticleLike[]; options: SearchQueryOptions }
    result: ArticleLike[]
  }
}

/**
 * Markdown 预处理类型
 */
export type TocItem = { id: string; text: string; level: number }

export type MarkdownCodeBlocks = {
  languages: string[]
  hasMermaid: boolean
  codeBlockCount: number
}

export type MarkdownStats = {
  charCount: number
  wordCount: number
  readingTime: number
}

export type MarkdownPreprocessResult = {
  toc: TocItem[]
  codeBlocks: MarkdownCodeBlocks
  stats: MarkdownStats
}

export type MarkdownWorkerActionMap = {
  extractToc: {
    payload: { markdown: string }
    result: TocItem[]
  }
  analyzeCodeBlocks: {
    payload: { markdown: string }
    result: MarkdownCodeBlocks
  }
  computeTextStats: {
    payload: { markdown: string }
    result: MarkdownStats
  }
  preprocess: {
    payload: { markdown: string }
    result: MarkdownPreprocessResult
  }
  prefetchArticle: {
    payload: { apiBase: string; articleId: string | number }
    result: Record<string, unknown>
  }
}

/**
 * 图片预加载类型
 */
export type ImagePreloadProgress = {
  loaded: number
  total: number
  failed: number
  percentage: number
}

export type ImagePreloadResult = {
  url: string
  width?: number
  height?: number
  size?: number
  hasBitmap?: boolean
  blobUrl?: boolean
  error?: string
}

export type QuickPreloadResult = {
  url: string
  cached?: boolean
  error?: string
}

export type ImagePreloadWorkerActionMap = {
  preloadBatch: {
    payload: { urls: string[]; concurrency?: number }
    result: ImagePreloadResult[]
    progress: ImagePreloadProgress
  }
  preloadSingle: {
    payload: { url: string }
    result: ImagePreloadResult
  }
  quickPreload: {
    payload: { urls: string[] }
    result: QuickPreloadResult[]
  }
}

/**
 * 图片转换（OffscreenCanvas / createImageBitmap）类型
 */
export type ImageProcessOptions = {
  format: 'png' | 'jpeg' | 'webp' | 'avif'
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

export type ImageConvertResult = {
  blob: Blob
  width: number
  height: number
  size: number
  format: string
  mimeType: string
}

export type BatchConvertProgress = {
  processed: number
  total: number
  percentage: number
}

export type ImageProcessorWorkerActionMap = {
  checkSupport: {
    payload: Record<string, never>
    result: {
      offscreenCanvas: boolean
      formats: { png: boolean; jpeg: boolean; webp: boolean; avif: boolean }
    }
  }
  convert: {
    payload: { imageBlob: Blob; options: ImageProcessOptions }
    result: ImageConvertResult
  }
  batchConvert: {
    payload: { images: Blob[]; options: ImageProcessOptions }
    result: Array<{ index: number; error?: string } & Partial<ImageConvertResult>>
    progress: BatchConvertProgress
  }
}

/**
 * Markdown -> Docx 导出类型
 */
export type DocxRun = {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  link?: string
}

export type DocxParagraph = {
  type: string
  [key: string]: unknown
  runs?: DocxRun[]
}

export type ExportWorkerActionMap = {
  parseForDocx: {
    payload: { markdown: string; options?: Record<string, unknown> }
    result: DocxParagraph[]
    progress: { percentage: number }
  }
}

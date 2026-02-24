export type AuthFetchLike = {
  authFetch: <T = unknown>(url: string, options?: NonNullable<Parameters<typeof $fetch>[1]>) => Promise<T>
}

export type ApiOperationResult = {
  success?: boolean
  message?: string
  error?: string
  [key: string]: unknown
}

export type CommentStatus = 'pending' | 'approved' | 'rejected'

export type AdminComment = {
  id: number
  content: string
  author: string
  email?: string | null
  website?: string | null
  articleId: number
  parentId?: number | null
  likes: number
  status: CommentStatus | string
  userIp?: string | null
  createdAt: string
  updatedAt: string
  article?: {
    id?: number
    title?: string
  }
}

export type CreateCommentPayload = {
  content: string
  author: string
  email?: string
  website?: string
  articleId: number
  parentId?: number | null
}

export type AdminGallery = {
  id: number
  imageUrl: string
  thumbnailUrl?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  sortOrder: number
  isActive: boolean
  tag: string
  createdAt: string
  updatedAt: string
}

export type CreateGalleryPayload = {
  imageUrl: string
  sortOrder?: number
  isActive?: boolean
  tag?: string
}

export type UpdateGalleryPayload = Partial<CreateGalleryPayload> & {
  createdAt?: string
}

export type GalleryRefreshResult = {
  total: number
  updated: number
  failed: number
}

export type BatchImportGalleryPayload = {
  imageUrls: string[]
  isActive?: boolean
  tag?: string
}

export type BatchImportGalleryResult = {
  message: string
  data: AdminGallery[]
}

export type UpdateSortOrderPayload = Array<{ id: number; sortOrder: number }>

export type ArticleCategory = 'study' | 'game' | 'work' | 'resource' | 'other' | string

export type ArticleSummary = {
  id: number
  title: string
  slug?: string | null
  coverImage?: string | null
  category: ArticleCategory
  createdAt: string
  updatedAt: string
  content?: string | null
  contentMarkdown?: string | null
  tags?: string[]
  aiSummary?: string | null
}

export type ArticleDetail = ArticleSummary & {
  content: string
}

export type PagedArticleResult = {
  data: ArticleSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type CreateArticlePayload = {
  title: string
  slug?: string
  content: string
  contentMarkdown?: string
  coverImage?: string
  category: ArticleCategory
  tags?: string[]
  aiSummary?: string
}

export type UpdateArticlePayload = Partial<CreateArticlePayload>

export type AiSummaryResult = {
  summary?: string
  slug?: string
  content?: string
  [key: string]: unknown
}

export type ImagebedConfig = {
  domain: string
  apiToken: string
  uploadFolder?: string
}

export type ImagebedUploadResult = {
  success: boolean
  src?: string
  url?: string
  fileName?: string
  error?: string
}

export type ImagebedListFile = {
  name: string
  metadata?: Record<string, string>
}

export type ImagebedListResponse = {
  files?: ImagebedListFile[]
  directories?: string[]
  totalCount?: number
  returnedCount?: number
  sum?: number
}

export type ImagebedFileItem = {
  name: string
  size: number
  type: string
  channel: string
  timestamp: string
  url: string
}

export type CfImageConfig = {
  isEnabled: boolean
  zoneDomain?: string | null
  useHttps: boolean
  fit: string
  width: number
  quality: number
  format: string
  signatureParam: string
  useWorker: boolean
  workerBaseUrl?: string | null
  tokenTtlSeconds: number
  signatureToken?: string | null
  signatureSecret?: string | null
}

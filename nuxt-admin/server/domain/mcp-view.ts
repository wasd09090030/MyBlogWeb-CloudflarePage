function clampInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (value === undefined || value === null || value === '') {
    return Math.min(Math.max(fallback, min), max)
  }
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isFinite(parsed)) {
    return Math.min(Math.max(fallback, min), max)
  }
  return Math.min(Math.max(parsed, min), max)
}

export function paginate<T>(
  rows: readonly T[],
  query: { page?: unknown; pageSize?: unknown; limit?: unknown },
  defaults: { pageSize: number; maxPageSize: number }
): {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
} {
  const rawPageSize = query.limit ?? query.pageSize ?? defaults.pageSize
  const pageSize = clampInt(rawPageSize, defaults.pageSize, 1, defaults.maxPageSize)
  const page = clampInt(query.page ?? 1, 1, 1, 100000)
  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const startIndex = (page - 1) * pageSize
  const data = rows.slice(startIndex, startIndex + pageSize)

  return {
    data,
    total,
    page,
    pageSize,
    totalPages
  }
}

export function projectArticleList(
  rows: readonly Record<string, unknown>[]
): Array<{
  id: number
  title: string
  slug: string | null
  category: string
  tags: string[]
  createdAt: string
  updatedAt: string
  aiSummary: string | null
  contentLength: number
}> {
  return rows.map(row => {
    const rawTags = row.tags
    const tags = Array.isArray(rawTags)
      ? rawTags.map(tag => String(tag))
      : []

    return {
      id: Number(row.id),
      title: String(row.title ?? ''),
      slug: row.slug === null || row.slug === undefined ? null : String(row.slug),
      category: String(row.category ?? ''),
      tags,
      createdAt: String(row.createdAt ?? ''),
      updatedAt: String(row.updatedAt ?? ''),
      aiSummary: row.aiSummary === null || row.aiSummary === undefined ? null : String(row.aiSummary),
      contentLength: String(row.content ?? '').length
    }
  })
}

export function withDiaryPublicDefault(
  input: Record<string, unknown>
): Record<string, unknown> {
  const isPublic = input.isPublic === true || input.isPublic === 1 || input.isPublic === '1'
  return {
    ...input,
    isPublic
  }
}

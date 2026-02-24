/**
 * 分页逻辑函数
 */

export type PageNumber = number | '...'

/**
 * 构建页码数组
 * @param total - 总页数
 * @param current - 当前页码
 * @returns 页码数组，包含数字和 '...' 占位符
 */
export function buildPageNumbers(total: number, current: number): PageNumber[] {
  const pages: PageNumber[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
    return pages
  }

  pages.push(1)
  if (current > 4) {
    pages.push('...')
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    pages.push(i)
  }

  if (current < total - 3) {
    pages.push('...')
  }

  pages.push(total)
  return pages
}

type NumberRef = { value: number }

type PaginationRefs = {
  totalFilteredPages: NumberRef
  currentFilteredPage: NumberRef
  totalPages: NumberRef
  currentPage: NumberRef
}

/**
 * 从 URL 查询参数同步页码
 * @param pageParam - URL 中的页码参数
 * @param isFilteredMode - 是否为筛选模式
 * @param refs - 包含页码和总页数的响应式引用对象
 */
export function syncPageFromQuery(
  pageParam: string | number | null | undefined,
  isFilteredMode: boolean,
  refs: PaginationRefs
): void {
  const pageNum = parseInt(String(pageParam), 10)
  if (Number.isNaN(pageNum) || pageNum <= 0) {
    return
  }

  if (isFilteredMode) {
    if (pageNum <= refs.totalFilteredPages.value) {
      refs.currentFilteredPage.value = pageNum
    }
  } else if (pageNum <= refs.totalPages.value) {
    refs.currentPage.value = pageNum
  }
}
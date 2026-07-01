import { getGalleryImageKey, type GalleryLike } from './masonryLayout'

export type GalleryMonthGroup<T extends GalleryLike = GalleryLike> = {
  key: string
  id: string
  label: string
  shortLabel: string
  englishShort: string
  sortValue: number
  items: T[]
  isFallback: boolean
  coverImageId: string | null
}

/** Year-level grouping: 包裹若干 GalleryMonthGroup，年份最新在上 */
export type GalleryYearGroup<T extends GalleryLike = GalleryLike> = {
  year: string // "2025" or "未归档"
  yearLabel: string // "2025" or "未归档"
  yearId: string // stable DOM id
  isFallback: boolean
  totalCount: number
  peakCount: number
  months: GalleryMonthGroup<T>[]
}

const FALLBACK_MONTH_KEY = 'unknown'
const FALLBACK_YEAR_KEY = 'unknown'
const FALLBACK_SORT_VALUE = Number.NEGATIVE_INFINITY

const padMonth = (month: number): string => `${month}`.padStart(2, '0')

/** 1-12 月 → 英文三字母简写（与 "Jan" "Feb" ... 一致；fallback 时返回空串） */
const ENGLISH_MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const getEnglishMonthShort = (monthKey: string): string => {
  if (monthKey === FALLBACK_MONTH_KEY) return ''
  const [, month] = monthKey.split('-')
  if (!month) return ''
  const idx = parseInt(month, 10) - 1
  if (idx < 0 || idx > 11) return ''
  return ENGLISH_MONTH_SHORT[idx]
}

export const getGalleryTimestamp = (image: GalleryLike | null | undefined): number => {
  const value = image?.createdAt ?? image?.created_at ?? image?.created ?? image?.date
  if (!value) return 0

  const timestamp = value instanceof Date
    ? value.getTime()
    : new Date(value as string | number).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const getGalleryMonthKey = (timestamp: number): string => {
  if (!timestamp) return FALLBACK_MONTH_KEY

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return FALLBACK_MONTH_KEY

  return `${date.getFullYear()}-${padMonth(date.getMonth() + 1)}`
}

/** 从 monthKey ("2025-01" / "unknown") 中提取年 ("2025" / "unknown") */
export const getGalleryYearFromMonthKey = (monthKey: string): string => {
  if (monthKey === FALLBACK_MONTH_KEY) return FALLBACK_YEAR_KEY
  const [year] = monthKey.split('-')
  return year || FALLBACK_YEAR_KEY
}

export const getGalleryYearSectionId = (yearKey: string, prefix = 'gallery-year'): string => {
  const safeKey = yearKey.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `${prefix}-${safeKey}`
}

export const getGalleryMonthSectionId = (monthKey: string, prefix = 'gallery-month'): string => {
  const safeKey = monthKey.replace(/[^a-zA-Z0-9_-]/g, '-')
  return `${prefix}-${safeKey}`
}

export const getGalleryMonthLabel = (monthKey: string): string => {
  if (monthKey === FALLBACK_MONTH_KEY) return '未归档'

  const [year, month] = monthKey.split('-')
  if (!year || !month) return '未归档'

  return `${year}年${month}月`
}

/** 短标签：仅显示月份（不含年；年份由外层 YearGroup header 承担） */
export const getGalleryMonthShortLabel = (monthKey: string): string => {
  if (monthKey === FALLBACK_MONTH_KEY) return '未归档'

  const [, month] = monthKey.split('-')
  if (!month) return '未归档'

  // 去掉前导零，呈现为 "1月" 而非 "01月"，更接近编辑/杂志审美
  return `${parseInt(month, 10)}月`
}

export const groupGalleryByMonth = <T extends GalleryLike>(
  images: T[],
  options: {
    sectionPrefix?: string
    preserveOrder?: boolean
  } = {}
): Array<GalleryMonthGroup<T>> => {
  const map = new Map<string, GalleryMonthGroup<T>>()
  const sortedImages = options.preserveOrder
    ? [...images]
    : [...images].sort((a, b) => getGalleryTimestamp(b) - getGalleryTimestamp(a))

  sortedImages.forEach((image, index) => {
    const timestamp = getGalleryTimestamp(image)
    const monthKey = getGalleryMonthKey(timestamp)

    if (!map.has(monthKey)) {
      map.set(monthKey, {
        key: monthKey,
        id: getGalleryMonthSectionId(monthKey, options.sectionPrefix),
        label: getGalleryMonthLabel(monthKey),
        shortLabel: getGalleryMonthShortLabel(monthKey),
        englishShort: getEnglishMonthShort(monthKey),
        sortValue: monthKey === FALLBACK_MONTH_KEY ? FALLBACK_SORT_VALUE : timestamp,
        items: [],
        isFallback: monthKey === FALLBACK_MONTH_KEY,
        coverImageId: null
      })
    }

    const group = map.get(monthKey)
    if (group && group.coverImageId == null) {
      const firstImage = image as unknown as { id?: string | number; imageKey?: string }
      const rawId = firstImage?.id ?? firstImage?.imageKey
      group.coverImageId = rawId != null ? String(rawId) : null
    }

    map.get(monthKey)?.items.push({
      ...image,
      _monthOrderKey: getGalleryImageKey(image, index)
    } as T)
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.isFallback && !b.isFallback) return 1
    if (!a.isFallback && b.isFallback) return -1
    return b.sortValue - a.sortValue
  })
}

/**
 * 在 groupGalleryByMonth 输出之上再做"按年"分组。
 * 年份最新在上；fallback 年（如有）置末。
 */
export const groupGalleryByYear = <T extends GalleryLike>(
  monthGroups: Array<GalleryMonthGroup<T>>,
  options: { yearSectionPrefix?: string } = {}
): Array<GalleryYearGroup<T>> => {
  const yearMap = new Map<string, GalleryYearGroup<T>>()
  const FALLBACK_YEAR_SORT = Number.NEGATIVE_INFINITY

  monthGroups.forEach((group) => {
    const year = getGalleryYearFromMonthKey(group.key)
    if (!yearMap.has(year)) {
      yearMap.set(year, {
        year,
        yearLabel: year === FALLBACK_YEAR_KEY ? '未归档' : year,
        yearId: getGalleryYearSectionId(year, options.yearSectionPrefix),
        isFallback: year === FALLBACK_YEAR_KEY,
        totalCount: 0,
        peakCount: 0,
        months: []
      })
    }
    const bucket = yearMap.get(year)
    if (!bucket) return
    bucket.months.push(group)
    bucket.totalCount += group.items.length
    if (group.items.length > bucket.peakCount) {
      bucket.peakCount = group.items.length
    }
  })

  return Array.from(yearMap.values()).sort((a, b) => {
    if (a.isFallback && !b.isFallback) return 1
    if (!a.isFallback && b.isFallback) return -1
    // 年份大的在前（字符串比较对纯数字年份足够；fallback 已先排除）
    if (!a.isFallback && !b.isFallback) return b.year.localeCompare(a.year)
    return 0
  })
}

import { getGalleryImageKey, type GalleryLike } from './masonryLayout'

export type GalleryMonthGroup<T extends GalleryLike = GalleryLike> = {
  key: string
  id: string
  label: string
  shortLabel: string
  sortValue: number
  items: T[]
  isFallback: boolean
}

const FALLBACK_MONTH_KEY = 'unknown'
const FALLBACK_SORT_VALUE = Number.NEGATIVE_INFINITY

const padMonth = (month: number): string => `${month}`.padStart(2, '0')

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

export const getGalleryMonthShortLabel = (monthKey: string): string => {
  if (monthKey === FALLBACK_MONTH_KEY) return '未归档'

  const [year, month] = monthKey.split('-')
  if (!year || !month) return '未归档'

  return `${month} / ${year}`
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
        sortValue: monthKey === FALLBACK_MONTH_KEY ? FALLBACK_SORT_VALUE : timestamp,
        items: [],
        isFallback: monthKey === FALLBACK_MONTH_KEY
      })
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

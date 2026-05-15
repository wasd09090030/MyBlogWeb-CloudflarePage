export type GalleryLike = {
  id?: string | number | null
  imageUrl?: string | null
  thumbnailUrl?: string | null
  imageWidth?: number | string | null
  imageHeight?: number | string | null
  width?: number | string | null
  height?: number | string | null
  [key: string]: unknown
}

export type ImageDimensions = {
  width: number
  height: number
}

export type MasonryDistributedItem<T> = T & {
  _masonry: {
    key: string
    aspectRatio: number
    aspectRatioStyle: string
    estimatedHeight: number
    columnIndex: number
    order: number
  }
}

export type MasonryColumn<T> = {
  index: number
  height: number
  items: Array<MasonryDistributedItem<T>>
}

const DEFAULT_ASPECT_RATIO = 1
const MIN_ASPECT_RATIO = 0.2
const MAX_ASPECT_RATIO = 5

const toFiniteNumber = (value: unknown): number | null => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
}

export const getGalleryImageKey = (image: GalleryLike | null | undefined, index = 0): string => {
  if (image?.id != null) return String(image.id)
  if (image?.imageUrl) return image.imageUrl
  return String(index)
}

export const getGalleryImageDimensions = (
  image: GalleryLike | null | undefined,
  measuredSize?: ImageDimensions | null
): ImageDimensions | null => {
  if (measuredSize?.width && measuredSize?.height) {
    return measuredSize
  }

  const width = toFiniteNumber(image?.imageWidth ?? image?.width)
  const height = toFiniteNumber(image?.imageHeight ?? image?.height)

  if (width && height) {
    return { width, height }
  }

  return null
}

export const getGalleryImageAspectRatio = (
  image: GalleryLike | null | undefined,
  measuredSize?: ImageDimensions | null
): number => {
  const dimensions = getGalleryImageDimensions(image, measuredSize)
  if (!dimensions) return DEFAULT_ASPECT_RATIO

  return Math.max(
    MIN_ASPECT_RATIO,
    Math.min(MAX_ASPECT_RATIO, dimensions.width / dimensions.height)
  )
}

export const getGalleryAspectRatioStyle = (
  image: GalleryLike | null | undefined,
  measuredSize?: ImageDimensions | null
): string => {
  const dimensions = getGalleryImageDimensions(image, measuredSize)
  if (!dimensions) return '1 / 1'
  return `${dimensions.width} / ${dimensions.height}`
}

export const getMasonryColumnCount = (width: number): number => {
  if (width < 768) return 2
  if (width < 1280) return 3
  return 5
}

const hashString = (value: string): number => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

export const getStableGalleryOrder = (image: GalleryLike, index: number): number => {
  const baseKey = getGalleryImageKey(image, index)
  return (hashString(`order:${baseKey}`) % 10000) / 10000
}

export const getStableGalleryShuffle = <T extends GalleryLike>(images: T[]): T[] => {
  return [...images]
    .map((image, index) => ({
      image,
      order: getStableGalleryOrder(image, index)
    }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.image)
}

export const buildMasonryColumns = <T extends GalleryLike>(
  items: T[],
  options: {
    columnCount: number
    columnWidth: number
    gap: number
    measuredSizes?: Record<string, ImageDimensions | undefined>
  }
): Array<MasonryColumn<T>> => {
  const columnCount = Math.max(1, options.columnCount)
  const columnWidth = Math.max(1, options.columnWidth)
  const measuredSizes = options.measuredSizes ?? {}

  const columns: Array<MasonryColumn<T>> = Array.from({ length: columnCount }, (_, index) => ({
    index,
    height: 0,
    items: []
  }))

  items.forEach((item, index) => {
    const key = getGalleryImageKey(item, index)
    const measuredSize = measuredSizes[key]
    const aspectRatio = getGalleryImageAspectRatio(item, measuredSize)
    const aspectRatioStyle = getGalleryAspectRatioStyle(item, measuredSize)
    const estimatedHeight = columnWidth / aspectRatio

    let targetColumn = columns[0]
    for (const column of columns) {
      if (column.height < targetColumn.height) {
        targetColumn = column
      }
    }

    targetColumn.items.push({
      ...item,
      _masonry: {
        key,
        aspectRatio,
        aspectRatioStyle,
        estimatedHeight,
        columnIndex: targetColumn.index,
        order: index
      }
    })
    targetColumn.height += estimatedHeight + options.gap
  })

  return columns
}

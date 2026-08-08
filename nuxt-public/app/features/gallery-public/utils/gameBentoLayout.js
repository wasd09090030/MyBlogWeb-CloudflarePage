const hashString = (value) => {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return hash >>> 0
}

const getMonthlyStyle = (monthKey, imageCount) => {
  if (imageCount <= 4) return 'compact'
  if (imageCount <= 8) return 'style1'
  return hashString(String(monthKey)) % 2 === 0 ? 'style2' : 'style3'
}

const getHeadCount = (style) => {
  if (style === 'style1') return 5
  if (style === 'style2') return 3
  if (style === 'style3') return 1
  return 4
}

const getTailColumns = (style) => {
  if (style === 'style3') return 4
  return 3
}

// Game screenshots use a stable monthly composition. The opening cards follow
// the selected reference design; all remaining cards repeat its final row.
export const buildGameBentoLayout = (images, monthKey = 'unknown') => {
  const style = getMonthlyStyle(monthKey, images.length)
  const headCount = style === 'compact' ? images.length : getHeadCount(style)

  return {
    style,
    head: images.slice(0, headCount).map((image, index) => ({ image, index })),
    tail: images.slice(headCount).map((image, index) => ({ image, index: headCount + index })),
    tailColumns: getTailColumns(style)
  }
}

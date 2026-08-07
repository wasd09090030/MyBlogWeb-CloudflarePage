const BENTO_ROLE_SEQUENCE = ['feature', 'wide', 'standard', 'standard', 'wide', 'standard']

const toFiniteDimension = (value) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null
}

export const getGameBentoAspect = (image) => {
  const width = toFiniteDimension(image?.imageWidth ?? image?.width)
  const height = toFiniteDimension(image?.imageHeight ?? image?.height)
  if (!width || !height) return '16x10'

  const ratio = width / height
  return ratio >= 1.7 ? '16x9' : '16x10'
}

export const buildGameBentoBlocks = (images) => {
  const blockSize = BENTO_ROLE_SEQUENCE.length

  return Array.from({ length: Math.ceil(images.length / blockSize) }, (_, blockIndex) => ({
    tiles: images
      .slice(blockIndex * blockSize, (blockIndex + 1) * blockSize)
      .map((image, offset) => ({
        image,
        index: blockIndex * blockSize + offset,
        aspect: getGameBentoAspect(image),
        role: BENTO_ROLE_SEQUENCE[offset]
      }))
  }))
}

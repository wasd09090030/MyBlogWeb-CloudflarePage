import { fingerprintPixels, PHASH_SIZE } from '~~/shared/gallery-duplicates'

export async function fingerprintBlob(blob: Blob) {
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(blob) } catch { throw new Error('浏览器无法解码该图片，请检查格式或文件是否损坏') }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) {
      throw new Error('图片超过 4000 万像素，无法在浏览器中安全检查')
    }
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = PHASH_SIZE
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('浏览器不支持像素读取')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, PHASH_SIZE, PHASH_SIZE)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, PHASH_SIZE, PHASH_SIZE)
    return fingerprintPixels(context.getImageData(0, 0, PHASH_SIZE, PHASH_SIZE).data, bitmap.width, bitmap.height)
  } finally { bitmap.close() }
}

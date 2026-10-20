import { createError } from 'h3'

export const MAX_DUPLICATE_IMAGE_BYTES = 20 * 1024 * 1024

/** Read only approved raster sources, validating each redirect before issuing a request. */
export async function readBoundedImage(source: string, validate: (url: string) => string, request = fetch) {
  const signal = AbortSignal.timeout(20_000)
  let current = source
  try {
    for (let redirect = 0; redirect <= 3; redirect++) {
      current = validate(current)
      const response = await request(current, { redirect: 'manual', signal, headers: { accept: 'image/jpeg,image/png,image/webp,image/gif,image/avif' } })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location || redirect === 3) throw createError({ statusCode: 422, statusMessage: 'Image redirect limit exceeded' })
        current = new URL(location, current).toString()
        continue
      }
      const contentType = (response.headers.get('content-type') || '').split(';')[0]!.trim().toLowerCase()
      if (!response.ok || !/^image\/(jpeg|png|webp|gif|avif)$/.test(contentType) || !response.body) {
        await response.body?.cancel()
        throw createError({ statusCode: 422, statusMessage: 'Source is unavailable or is not a supported raster image' })
      }
      if (Number(response.headers.get('content-length')) > MAX_DUPLICATE_IMAGE_BYTES) {
        await response.body.cancel()
        throw createError({ statusCode: 413, statusMessage: 'Duplicate checking supports images up to 20 MB' })
      }
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_DUPLICATE_IMAGE_BYTES) throw createError({ statusCode: 413, statusMessage: 'Duplicate checking supports images up to 20 MB' })
          chunks.push(value)
        }
      } finally {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
      }
      if (!size) throw createError({ statusCode: 422, statusMessage: 'Image source is empty' })
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
      return { bytes, contentType }
    }
  } catch (error) {
    if (signal.aborted) throw createError({ statusCode: 504, statusMessage: 'Image read timed out' })
    throw error
  }
  throw createError({ statusCode: 422, statusMessage: 'Image source could not be read' })
}

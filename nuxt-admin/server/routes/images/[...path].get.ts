import { resolveImageAsset } from '~~/server/domain/media'
import type { ThumbnailVariant } from '~~/server/domain/assets'
import { getCloudflareEnv } from '~~/server/utils/cloudflare'

const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
const THUMBNAIL_CACHE_CONTROL = 'public, max-age=31536000, immutable'

// 命名变体预设：按展示场景选择，白名单 fail-closed。
// 旧格式 /images/thumb/{publicId}.webp 缺省等价 DEFAULT_VARIANT。
const THUMBNAIL_VARIANTS: Record<ThumbnailVariant, { width: number; quality: number }> = {
  card: { width: 640, quality: 75 },
  grid: { width: 960, quality: 85 },
  lightbox: { width: 1920, quality: 85 }
}
const DEFAULT_VARIANT: ThumbnailVariant = 'grid'
const VARIANT_NAMES = new Set(Object.keys(THUMBNAIL_VARIANTS))

function imageErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'number' ? code : undefined
}

async function transformThumbnail(event: Parameters<typeof resolveImageAsset>[0], sourceUrl: string, variant: { width: number; quality: number }): Promise<Response> {
  const images = getCloudflareEnv(event).IMAGES
  if (!images) throw createError({ statusCode: 503, statusMessage: 'Image transformation is not configured' })

  let sourceResponse: Response
  try {
    sourceResponse = await fetch(sourceUrl, { redirect: 'follow' })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Image source request failed' })
  }

  if (!sourceResponse.ok || !sourceResponse.body) {
    throw createError({ statusCode: 502, statusMessage: 'Image source is unavailable' })
  }

  // Follow provider redirects only when they stay on the asset provider host.
  if (sourceResponse.url) {
    try {
      if (new URL(sourceResponse.url).host !== new URL(sourceUrl).host) {
        throw createError({ statusCode: 502, statusMessage: 'Image source redirected outside the provider' })
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'statusCode' in error) throw error
      throw createError({ statusCode: 502, statusMessage: 'Image source URL is invalid' })
    }
  }

  const contentType = sourceResponse.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (!contentType?.startsWith('image/')) {
    throw createError({ statusCode: 502, statusMessage: 'Image source is not an image' })
  }

  const contentLength = Number(sourceResponse.headers.get('content-length') || 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_INPUT_BYTES) {
    throw createError({ statusCode: 502, statusMessage: 'Image source exceeds transformation limit' })
  }

  try {
    const transformed = await images
      .input(sourceResponse.body)
      .transform({ width: variant.width, fit: 'scale-down' })
      .output({ format: 'image/webp', quality: variant.quality })
    const response = transformed.response()
    const headers = new Headers(response.headers)
    headers.set('cache-control', THUMBNAIL_CACHE_CONTROL)
    headers.set('content-type', 'image/webp')
    headers.delete('set-cookie')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
  } catch (error) {
    if (imageErrorCode(error) === 9422) {
      throw createError({ statusCode: 503, statusMessage: 'Image transformation quota exceeded' })
    }
    throw createError({ statusCode: 502, statusMessage: 'Image transformation failed' })
  }
}

export default defineEventHandler(async (event) => {
  const rawPath = getRouterParam(event, 'path') || ''
  const parts = rawPath.split('/').filter(Boolean)
  const isThumbnail = parts[0]?.toLowerCase() === 'thumb'

  let variant: ThumbnailVariant = DEFAULT_VARIANT
  let publicIdValue: string
  if (isThumbnail) {
    // 新格式 /images/thumb/{variant}/{publicId}.webp
    if (parts.length === 3 && parts[2] && /\.webp$/i.test(parts[2])) {
      const candidate = decodeURIComponent(parts[1] || '')
      if (!VARIANT_NAMES.has(candidate)) throw createError({ statusCode: 400, statusMessage: 'Invalid thumbnail variant' })
      variant = candidate as ThumbnailVariant
      publicIdValue = decodeURIComponent(parts[2].replace(/\.webp$/i, ''))
    // 旧格式 /images/thumb/{publicId}.webp，等价 DEFAULT_VARIANT(grid)
    } else if (parts.length === 2 && parts[1] && /\.webp$/i.test(parts[1])) {
      publicIdValue = decodeURIComponent(parts[1].replace(/\.webp$/i, ''))
    } else {
      throw createError({ statusCode: 400, statusMessage: 'Invalid thumbnail path' })
    }
  } else {
    publicIdValue = decodeURIComponent(parts[0] || '')
  }

  const resolved = await resolveImageAsset(event, publicIdValue)
  if (!resolved) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  if (isThumbnail) return await transformThumbnail(event, resolved.sourceUrl, THUMBNAIL_VARIANTS[variant])
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return Response.redirect(resolved.sourceUrl, 302)
})

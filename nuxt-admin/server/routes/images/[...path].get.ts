import type { AssetKind } from '~~/server/domain/assets'
import { resolveImageAsset } from '~~/server/domain/media'
import { getCloudflareEnv } from '~~/server/utils/cloudflare'

const MAX_IMAGE_INPUT_BYTES = 20 * 1024 * 1024
const THUMBNAIL_CACHE_CONTROL = 'public, max-age=31536000, immutable'

// 固定变换按素材类型区分：文章封面 640px / q75，画廊及其他 960px / q85。
const THUMBNAIL_VARIANTS: Record<AssetKind, { width: number; quality: number }> = {
  article_cover: { width: 640, quality: 75 },
  gallery: { width: 960, quality: 85 },
  other: { width: 960, quality: 85 }
}

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
  if (isThumbnail && (parts.length !== 2 || !/\.webp$/i.test(parts[1] || ''))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid thumbnail path' })
  }
  const publicId = decodeURIComponent(isThumbnail ? String(parts[1] || '').replace(/\.webp$/i, '') : String(parts[0] || ''))
  const resolved = await resolveImageAsset(event, publicId)
  if (!resolved) throw createError({ statusCode: 404, statusMessage: 'Image not found' })
  if (isThumbnail) {
    const variant = THUMBNAIL_VARIANTS[resolved.asset.kind as AssetKind] ?? THUMBNAIL_VARIANTS.other
    return await transformThumbnail(event, resolved.sourceUrl, variant)
  }
  setResponseHeader(event, 'cache-control', 'public, max-age=300')
  return Response.redirect(resolved.sourceUrl, 302)
})

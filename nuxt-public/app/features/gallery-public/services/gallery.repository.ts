import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { buildGalleryCacheKey } from '~/shared/cache/keys'

export type GalleryItem = {
  id: number
  title?: string
  imageUrl?: string
  tag?: string
  [key: string]: any
}

type NuxtDataContainer = {
  data?: Record<string, unknown>
}

/**
 * 从 Nuxt payload/static 缓存中读取指定 key 的数据。
 *
 * 重要：必须返回 undefined（而非 null）表示"无缓存"。
 * Nuxt 的 getCachedData 回调规则：
 *   - 返回 undefined → 触发实际 fetch
 *   - 返回任何其他值（包括 null）→ 直接使用该值，跳过 fetch
 */
function getCachedNuxtData<T>(nuxtApp: { payload: unknown; static: unknown }, key: string): T | undefined {
  const payloadData = (nuxtApp.payload as NuxtDataContainer).data
  if (payloadData && key in payloadData) {
    return payloadData[key] as T
  }

  const staticData = (nuxtApp.static as NuxtDataContainer).data
  if (staticData && key in staticData) {
    return staticData[key] as T
  }

  return undefined
}

/**
 * 画廊仓储。
 *
 * 使用 useFetch + getCachedData 将画廊列表数据注入 SSG payload：
 * - 构建时（SSG 预渲染阶段）：向后端发起请求，结果写入 _payload.json
 * - 客户端水化时：从 payload 直接读取，无需额外网络请求，实现首屏零延迟渲染
 */
export const createGalleryRepository = () => {
  const client = createApiClient()

  const getGalleriesSSG = async (): Promise<GalleryItem[]> => {
    const key = buildGalleryCacheKey()
    const { data, error } = await useFetch<GalleryItem[]>(
      `${client.baseURL}${API_ENDPOINTS.gallery.publicList}`,
      {
        key,
        getCachedData: (k, nuxtApp) => {
          return getCachedNuxtData<GalleryItem[]>(
            nuxtApp as { payload: unknown; static: unknown },
            k
          )
        }
      }
    )

    if (error.value) throw error.value
    return data.value ?? []
  }

  return { getGalleriesSSG }
}

import type { AdminGallery } from '~/types/api'
import { createApiClient, withApiError } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { createTimedCacheState, withInFlightDedup } from '~/shared/cache'
import { toAppResult } from '~/shared/types/result'
import type { AppResult } from '~/shared/types/result'

type GalleryItem = AdminGallery

export const useGalleryFeature = () => {
  const client = createApiClient()

  const timedCache = createTimedCacheState<GalleryItem[]>({
    key: 'galleries-cache',
    ttl: 10 * 60 * 1000,
    initial: () => null
  })
  const galleriesCache = timedCache.data
  const isLoadingGalleries = useState<boolean>('galleries-loading', () => false)

  const isCacheValid = (): boolean => {
    return timedCache.isValid()
  }

  const getGalleries = async (forceRefresh = false): Promise<GalleryItem[] | null> => {
    return await withInFlightDedup('cache:galleries:getAll', async () => {
      if (!forceRefresh && isCacheValid()) {
        return timedCache.get()
      }

      isLoadingGalleries.value = true

      try {
        const result = await withApiError('gallery-public', '获取画廊数据', async () => {
          return await client.get<GalleryItem[]>(API_ENDPOINTS.gallery.publicList)
        })
        timedCache.set(result)
        return result
      } finally {
        isLoadingGalleries.value = false
      }
    })
  }

  const getAllGalleries = async (): Promise<GalleryItem[]> => {
    return await client.get<GalleryItem[]>(API_ENDPOINTS.gallery.adminList, {
      headers: {
        Authorization: 'AdminToken'
      }
    })
  }

  const invalidateCache = (): void => {
    timedCache.invalidate()
  }

  const preloadCache = async (): Promise<void> => {
    if (!isCacheValid()) {
      await getGalleries()
    }
  }

  const getGalleriesResult = async (forceRefresh = false): Promise<AppResult<GalleryItem[] | null>> => {
    return await toAppResult(() => getGalleries(forceRefresh), '获取画廊数据失败')
  }

  return {
    getGalleries,
    getGalleriesResult,
    getAllGalleries,
    invalidateCache,
    preloadCache,
    isLoading: isLoadingGalleries,
    cachedGalleries: galleriesCache
  }
}
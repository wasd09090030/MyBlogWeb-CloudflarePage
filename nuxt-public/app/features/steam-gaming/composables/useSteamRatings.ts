import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import type { SteamRatingData } from '../types'

const api = createApiClient()

/**
 * 详情页：完整评分列表（上限 60 条，一次性返回）。
 * 页面是 SSG，只在客户端请求；增量展示交给容器层的「再加载」。
 */
export function useSteamRatings() {
  const { data, status, error, refresh } = useAsyncData<SteamRatingData | null>(
    'steam-ratings-detail',
    () => api.get<SteamRatingData>(API_ENDPOINTS.steam.ratings),
    { server: false, lazy: true, default: () => null }
  )

  return { data, status, error, refresh }
}

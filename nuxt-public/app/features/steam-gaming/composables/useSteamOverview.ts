import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import type { SteamOverview } from '../types'

const api = createApiClient()

/**
 * 公开页只读快照：客户端拉取，SSG 构建期不请求 Steam，也不接触任何凭证。
 * 失败时不抛出到页面，交给容器层展示重试态。
 */
export function useSteamOverview() {
  const { data, status, error, refresh } = useAsyncData<SteamOverview>(
    'steam-overview',
    () => api.get<SteamOverview>(API_ENDPOINTS.steam.overview),
    {
      server: false,
      lazy: true,
      default: () => ({
        status: 'ok' as const,
        syncedAt: null,
        stale: false,
        profile: null,
        showcases: [],
        freshnessWindowMinutes: 26 * 60
      })
    }
  )

  return {
    overview: data,
    status,
    error,
    refresh
  }
}

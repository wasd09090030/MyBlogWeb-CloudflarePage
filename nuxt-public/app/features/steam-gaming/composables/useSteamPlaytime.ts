import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import type { SteamPlaytimePage, SteamRankedGame } from '../types'

const api = createApiClient()

type ListStatus = 'pending' | 'success' | 'error'

/**
 * 详情页分页榜单：首屏取一页，之后按已加载条数作为 offset 追加。
 * 静态站不做 SSR 数据请求，只在客户端拉取。
 */
export function useSteamPlaytime(pageSize = 24) {
  const route = useRoute()
  const games = ref<SteamRankedGame[]>([])
  const total = ref(0)
  const totalMinutes = ref(0)
  const status = ref<ListStatus>('pending')
  const loadingMore = ref(false)
  const sort = computed<'total' | 'recent'>(() => (route.query.sort === 'recent' ? 'recent' : 'total'))

  async function fetchPage(reset: boolean) {
    if (reset) {
      status.value = 'pending'
      games.value = []
      total.value = 0
      totalMinutes.value = 0
    } else if (loadingMore.value || games.value.length >= total.value) {
      return
    } else {
      loadingMore.value = true
    }

    try {
      const page = await api.get<SteamPlaytimePage>(API_ENDPOINTS.steam.playtime({
        offset: reset ? 0 : games.value.length,
        limit: pageSize,
        sort: sort.value
      }))
      games.value = reset ? page.games : [...games.value, ...page.games]
      total.value = page.total
      totalMinutes.value = page.totalMinutes
      status.value = 'success'
    } catch (error) {
      console.error('[steam-gaming] 游玩时长加载失败:', error)
      if (reset) status.value = 'error'
    } finally {
      loadingMore.value = false
    }
  }

  onMounted(() => fetchPage(true))
  // 首页的「总时长 / 近两周」两种入口共用这个页面，切换查询参数时重新取第一页。
  watch(sort, () => fetchPage(true))

  return {
    games,
    total,
    totalMinutes,
    status,
    loadingMore,
    sort,
    loadMore: () => fetchPage(false),
    retry: () => fetchPage(true)
  }
}

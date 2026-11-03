import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import type { SteamWishlistItem, SteamWishlistPage } from '../types'

const api = createApiClient()

type ListStatus = 'pending' | 'success' | 'error'

/**
 * 详情页分页愿望单：愿望单可能上百条，按页追加，避免一次渲染整表。
 * 静态站不做 SSR 数据请求，只在客户端拉取。
 */
export function useSteamWishlist(pageSize = 24) {
  const items = ref<SteamWishlistItem[]>([])
  const total = ref(0)
  const status = ref<ListStatus>('pending')
  const loadingMore = ref(false)

  async function fetchPage(reset: boolean) {
    if (reset) {
      status.value = 'pending'
      items.value = []
      total.value = 0
    } else if (loadingMore.value || items.value.length >= total.value) {
      return
    } else {
      loadingMore.value = true
    }

    try {
      const page = await api.get<SteamWishlistPage>(API_ENDPOINTS.steam.wishlist({
        offset: reset ? 0 : items.value.length,
        limit: pageSize
      }))
      items.value = reset ? page.items : [...items.value, ...page.items]
      total.value = page.total
      status.value = 'success'
    } catch (error) {
      console.error('[steam-gaming] 愿望单加载失败:', error)
      if (reset) status.value = 'error'
    } finally {
      loadingMore.value = false
    }
  }

  onMounted(() => fetchPage(true))

  return {
    items,
    total,
    status,
    loadingMore,
    loadMore: () => fetchPage(false),
    retry: () => fetchPage(true)
  }
}

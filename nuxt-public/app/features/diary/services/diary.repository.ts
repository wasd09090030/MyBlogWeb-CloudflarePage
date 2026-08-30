import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'

export type DiaryEntry = {
  entryDate: string
  contentMarkdown?: string
  mood?: string
  weather?: string
  location?: string
  tags?: string[]
  isPublic?: boolean
  createdAt?: string
  updatedAt?: string
}

type NuxtDataContainer = {
  data?: Record<string, unknown>
}

/**
 * 从 Nuxt payload/static 缓存中读取指定 key 的数据。
 * 必须返回 undefined（而非 null）表示"无缓存"：Nuxt 的 getCachedData
 * 回调中，undefined 触发实际 fetch，其他值直接使用。
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
 * 每日日记仓储（SSG 构建时拉取）。
 *
 * 使用 useFetch + getCachedData 将日记列表注入 SSG payload：
 * - 构建时（预渲染阶段）：请求公开 API，结果写入 _payload.json；
 * - 客户端水化时：直接从 payload 读取，首屏零请求。
 *
 * 因此写完日记后，需触发「重构 nuxt-public」重建静态站才能更新公开页。
 */
export const createDiaryRepository = () => {
  const client = createApiClient()

  const getDiaryEntriesSSG = async (): Promise<DiaryEntry[]> => {
    const key = 'diary:public:all'
    const { data, error } = await useFetch<DiaryEntry[]>(
      `${client.baseURL}${API_ENDPOINTS.diary.publicList}`,
      {
        key,
        getCachedData: (k, nuxtApp) => {
          return getCachedNuxtData<DiaryEntry[]>(
            nuxtApp as { payload: unknown; static: unknown },
            k
          )
        }
      }
    )

    if (error.value) throw error.value
    return data.value ?? []
  }

  return { getDiaryEntriesSSG }
}

<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })

type ShowcaseConfig = { limit?: number, sort?: 'total' | 'recent', appid?: number, more?: boolean }
type ShowcaseEntry = { type: string, visible: boolean, config: ShowcaseConfig }
type LibraryItem = {
  type: string
  label: string
  span: number
  description: string
  defaults: ShowcaseConfig
  limitRange?: [number, number]
  sortOptions?: Array<'total' | 'recent'>
  detailPath?: string
}
type ShowcaseResponse = { showcases: ShowcaseEntry[], updatedAt: string | null, limit: number, library: LibraryItem[] }
type StatusResponse = {
  configured: boolean
  meta: { status: string, stale: boolean, syncedAt: string | null }
  latestRun: null | {
    id: number
    startedAt: string
    finishedAt: string | null
    status: string
    trigger: string
    apiCalls: number
    gamesUpserted: number
    achievementsUpserted: number
    errorCode: string | null
    errorMessage: string | null
  }
}

const api = useAdminApi()
const toast = useToast()

const draft = ref<ShowcaseEntry[]>([])
const library = ref<LibraryItem[]>([])
const limit = ref(12)
const updatedAt = ref<string | null>(null)
const selectedType = ref<string | null>(null)
const saving = ref(false)
const syncing = ref(false)

const { data: showcaseData, refresh: refreshShowcases } = await useAsyncData(
  'admin-steam-showcases',
  () => api.get<ShowcaseResponse>('steam/showcases'),
  { server: false }
)

const { data: statusData, refresh: refreshStatus } = await useAsyncData(
  'admin-steam-status',
  () => api.get<StatusResponse>('steam/status'),
  { server: false }
)

type CredentialState = {
  steamId: string | null
  hasKey: boolean
  keyLast4: string | null
  source: 'db' | 'env' | 'none'
  updatedAt: string | null
  updatedBy: string | null
  decryptionFailed: boolean
}
const { data: credentialData, refresh: refreshCredentials } = await useAsyncData(
  'admin-steam-credentials',
  () => api.get<CredentialState>('steam/credentials'),
  { server: false }
)
const steamIdInput = ref('')
const apiKeyInput = ref('')
const savingCredentials = ref(false)
const clearOpen = ref(false)
const sourceLabel = computed(() => ({ db: '后台保存', env: '环境变量', none: '未配置' }[credentialData.value?.source ?? 'none']))
const keyPlaceholder = computed(() => credentialData.value?.hasKey
  ? `已保存 ••••${credentialData.value.keyLast4 ?? ''}，留空则不修改`
  : '32 位十六进制 API Key')
watch(credentialData, (value) => {
  if (value?.steamId && !steamIdInput.value) steamIdInput.value = value.steamId
}, { immediate: true })

async function saveCredential() {
  savingCredentials.value = true
  try {
    await api.put('steam/credentials', {
      steamId: steamIdInput.value.trim(),
      apiKey: apiKeyInput.value.trim() || undefined
    })
    apiKeyInput.value = ''
    await Promise.all([refreshCredentials(), refreshStatus()])
    toast.add({ title: '凭证已保存', description: '可以点「立即同步」拉取数据', color: 'success' })
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '保存凭证失败', color: 'error' })
  } finally {
    savingCredentials.value = false
  }
}

async function clearCredential() {
  savingCredentials.value = true
  try {
    await api.del('steam/credentials')
    clearOpen.value = false
    await Promise.all([refreshCredentials(), refreshStatus()])
    toast.add({ title: '已清除后台保存的凭证', color: 'success' })
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '清除失败', color: 'error' })
  } finally {
    savingCredentials.value = false
  }
}

watch(showcaseData, (value) => {
  if (!value) return
  draft.value = value.showcases.map(entry => ({ type: entry.type, visible: entry.visible, config: { ...entry.config } }))
  library.value = value.library
  limit.value = value.limit
  updatedAt.value = value.updatedAt
  if (!selectedType.value || !draft.value.some(entry => entry.type === selectedType.value)) {
    selectedType.value = draft.value[0]?.type ?? null
  }
}, { immediate: true })

const definitionOf = (type: string) => library.value.find(item => item.type === type)
const selectedEntry = computed(() => draft.value.find(entry => entry.type === selectedType.value) ?? null)
const selectedDefinition = computed(() => (selectedType.value ? definitionOf(selectedType.value) : null))
const available = computed(() => library.value.filter(item => !draft.value.some(entry => entry.type === item.type)))

const statusLabel: Record<string, string> = {
  ok: '正常',
  stale: '快照过期',
  privacy_blocked: '隐私受限',
  unconfigured: '未配置',
  empty: '暂无数据',
  success: '成功',
  partial: '部分完成',
  failed: '失败',
  skipped: '已跳过'
}

function badgeColor(status: string | undefined) {
  if (status === 'ok' || status === 'success') return 'success' as const
  if (status === 'stale' || status === 'partial' || status === 'skipped') return 'warning' as const
  if (status === 'unconfigured' || status === 'empty') return 'neutral' as const
  return 'error' as const
}

function move(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= draft.value.length) return
  const next = [...draft.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  draft.value = next
}

function toggle(entry: ShowcaseEntry, value: boolean) {
  entry.visible = value
}

function add(type: string) {
  const definition = definitionOf(type)
  if (!definition || draft.value.length >= limit.value) return
  draft.value = [...draft.value, { type, visible: true, config: { ...definition.defaults } }]
  selectedType.value = type
}

function remove(type: string) {
  draft.value = draft.value.filter(entry => entry.type !== type)
  if (selectedType.value === type) selectedType.value = draft.value[0]?.type ?? null
}

async function save() {
  saving.value = true
  try {
    const payload = draft.value.map(entry => ({ type: entry.type, visible: entry.visible, config: entry.config }))
    await api.put('steam/showcases', { showcases: payload, updatedAt: updatedAt.value })
    await refreshShowcases()
    toast.add({ title: '展柜顺序已保存', description: '公开页最长 5 分钟后生效', color: 'success' })
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function reset() {
  saving.value = true
  try {
    await api.post('steam/showcases/reset', {})
    await refreshShowcases()
    toast.add({ title: '已恢复默认展柜', color: 'success' })
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '恢复默认失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function syncNow() {
  syncing.value = true
  try {
    const result = await api.post<{ status: string, apiCalls: number }>('steam/sync', {})
    toast.add({ title: `同步完成：${statusLabel[result.status] || result.status}`, description: `本轮 ${result.apiCalls} 次上游请求`, color: 'success' })
    await refreshStatus()
  } catch (error: any) {
    const message = error?.data?.statusMessage || error?.data?.message || '同步失败'
    toast.add({ title: message, color: 'error' })
  } finally {
    syncing.value = false
  }
}

const formatTime = (value: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false })
}

/* ---------------- 我的评分 ---------------- */

type RatingEntry = { appid: number, score: number, comment: string | null }
type RatingRow = RatingEntry & { name: string, headerUrl: string | null, minutesTotal: number }
type RatingLibraryItem = { appid: number, name: string, headerUrl: string | null, minutesTotal: number }
type RatingResponse = { ratings: RatingRow[], library: RatingLibraryItem[], commentMax: number }

const { data: ratingData, refresh: refreshRatings } = await useAsyncData(
  'admin-steam-ratings',
  () => api.get<RatingResponse>('steam/ratings'),
  { server: false }
)

const ratingDraft = ref<RatingRow[]>([])
const ratingLibrary = ref<RatingLibraryItem[]>([])
const ratingCommentMax = ref(60)
const ratingQuery = ref('')
const savingRatings = ref(false)

/* 编辑列表分页：和公开页一样，不把几十条评分堆在一屏里。 */
const RATING_PAGE_SIZE = 8
const ratingFilter = ref('')
const ratingPage = ref(1)

const filteredRatings = computed(() => {
  const query = ratingFilter.value.trim().toLowerCase()
  if (!query) return ratingDraft.value
  return ratingDraft.value.filter(item =>
    item.name.toLowerCase().includes(query) || String(item.appid) === query
  )
})

const ratingPageCount = computed(() => Math.max(1, Math.ceil(filteredRatings.value.length / RATING_PAGE_SIZE)))

const pagedRatings = computed(() => {
  const page = Math.min(Math.max(1, ratingPage.value), ratingPageCount.value)
  const start = (page - 1) * RATING_PAGE_SIZE
  return filteredRatings.value.slice(start, start + RATING_PAGE_SIZE)
})

const ratingIndexOf = (appid: number) => ratingDraft.value.findIndex(item => item.appid === appid)

/** 分页/筛选后按钮上的 index 不再是全局位置，按 appid 找回真实下标。 */
function canMoveRating(appid: number, direction: -1 | 1): boolean {
  const query = ratingFilter.value.trim().toLowerCase()
  if (query) {
    const position = filteredRatings.value.findIndex(item => item.appid === appid)
    const target = position + direction
    return position >= 0 && target >= 0 && target < filteredRatings.value.length
  }
  const index = ratingIndexOf(appid)
  const target = index + direction
  return index >= 0 && target >= 0 && target < ratingDraft.value.length
}

function moveRatingBy(appid: number, direction: -1 | 1) {
  const index = ratingIndexOf(appid)
  if (index < 0) return
  const query = ratingFilter.value.trim().toLowerCase()
  if (!query) {
    moveRating(index, direction)
    return
  }
  // 筛选状态下与「可见的相邻项」互换，避免和夹在中间的未匹配项交换后看起来没动。
  const position = filteredRatings.value.findIndex(item => item.appid === appid)
  const neighbour = filteredRatings.value[position + direction]
  if (!neighbour) return
  const neighbourIndex = ratingIndexOf(neighbour.appid)
  if (neighbourIndex < 0) return
  const next = [...ratingDraft.value]
  ;[next[index], next[neighbourIndex]] = [next[neighbourIndex]!, next[index]!]
  ratingDraft.value = next
}

watch(ratingFilter, () => { ratingPage.value = 1 })
watch(ratingPageCount, (count) => {
  if (ratingPage.value > count) ratingPage.value = count
})

watch(ratingData, (value) => {
  if (!value) return
  ratingDraft.value = value.ratings.map(item => ({ ...item }))
  ratingLibrary.value = value.library
  ratingCommentMax.value = value.commentMax
}, { immediate: true })

const ratedIds = computed(() => new Set(ratingDraft.value.map(item => item.appid)))

const ratingAverage = computed(() => {
  if (!ratingDraft.value.length) return '—'
  const sum = ratingDraft.value.reduce((total, item) => total + item.score, 0)
  return (Math.round((sum / ratingDraft.value.length) * 10) / 10).toFixed(1)
})

const ratingCandidates = computed(() => {
  const query = ratingQuery.value.trim().toLowerCase()
  if (!query) return []
  return ratingLibrary.value
    .filter(item => !ratedIds.value.has(item.appid))
    .filter(item => item.name.toLowerCase().includes(query) || String(item.appid) === query)
    .slice(0, 6)
})

function addRating(item: RatingLibraryItem) {
  if (ratedIds.value.has(item.appid)) return
  ratingDraft.value = [
    ...ratingDraft.value,
    { appid: item.appid, name: item.name, headerUrl: item.headerUrl, minutesTotal: item.minutesTotal, score: 8, comment: null }
  ]
  ratingQuery.value = ''
  // 新加的评分往往在末尾：清掉筛选并跳到它的那一页，避免「点了没反应」。
  ratingFilter.value = ''
  ratingPage.value = Math.max(1, Math.ceil(ratingDraft.value.length / RATING_PAGE_SIZE))
}

function removeRating(appid: number) {
  ratingDraft.value = ratingDraft.value.filter(item => item.appid !== appid)
}

function moveRating(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= ratingDraft.value.length) return
  const next = [...ratingDraft.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  ratingDraft.value = next
}

async function saveRatingDraft() {
  savingRatings.value = true
  try {
    const payload: RatingEntry[] = ratingDraft.value.map(item => ({
      appid: item.appid,
      score: Number(item.score),
      comment: item.comment?.trim() ? item.comment.trim() : null
    }))
    await api.put('steam/ratings', { ratings: payload })
    await refreshRatings()
    toast.add({ title: '评分已保存', description: '公开页最长 5 分钟后生效', color: 'success' })
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '保存评分失败', color: 'error' })
  } finally {
    savingRatings.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm text-muted">Steam 接入与展示</p>
        <h2 class="mt-1 text-2xl font-semibold">游戏</h2>
        <p class="mt-1 text-sm text-muted">在这里填写 Steam 凭证、查看同步状态，并决定公开页 /games 显示哪些展柜。评分、游玩时长、愿望单首页只放预览，其余内容走各自的「更多…」详情页。</p>
      </div>
      <div class="flex items-center gap-2">
        <UBadge variant="subtle" color="neutral">展柜位 {{ draft.length }} / {{ limit }}</UBadge>
        <UButton color="neutral" variant="ghost" :loading="saving" @click="reset">恢复默认</UButton>
        <UButton icon="i-lucide-save" :loading="saving" @click="save">保存顺序</UButton>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="font-medium">Steam 凭证</p>
          <UBadge variant="subtle" :color="credentialData?.source === 'db' ? 'success' : credentialData?.source === 'env' ? 'warning' : 'neutral'">
            来源：{{ sourceLabel }}
          </UBadge>
        </div>
      </template>
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField label="SteamID64（17 位数字）">
          <UInput v-model="steamIdInput" placeholder="7656119xxxxxxxxxx" autocomplete="off" class="w-full" />
        </UFormField>
        <UFormField label="API Key">
          <UInput v-model="apiKeyInput" type="password" autocomplete="off" :placeholder="keyPlaceholder" class="w-full" />
        </UFormField>
      </div>
      <p class="mt-3 text-xs text-muted">
        密钥以 AES-GCM 加密后存入 D1，保存后不可回显；留空表示沿用已保存的 key。保存前会调用一次 Steam 校验。
      </p>
      <p v-if="credentialData?.decryptionFailed" class="mt-2 text-sm text-amber-600">
        已保存的密钥无法解密（可能轮换过 SESSION_PEPPER），请重新填写 API Key。
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UButton icon="i-lucide-shield-check" :loading="savingCredentials" @click="saveCredential">保存并验证</UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          :disabled="credentialData?.source !== 'db'"
          @click="clearOpen = true"
        >
          清除后台凭证
        </UButton>
        <span class="text-xs text-muted">
          更新于 {{ formatTime(credentialData?.updatedAt ?? null) }}
          <template v-if="credentialData?.updatedBy"> · {{ credentialData.updatedBy }}</template>
        </span>
      </div>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-3">
      <UCard class="lg:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="font-medium">Steam 同步</p>
            <p class="mt-1 text-sm text-muted">
              最近成功同步：{{ formatTime(statusData?.meta.syncedAt ?? null) }}
              <span v-if="statusData?.latestRun"> · 本轮 {{ statusData.latestRun.apiCalls }} 次请求 / {{ statusData.latestRun.gamesUpserted }} 款游戏</span>
            </p>
            <p v-if="statusData?.latestRun?.errorMessage" class="mt-1 text-sm text-red-500">{{ statusData.latestRun.errorMessage }}</p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="badgeColor(statusData?.meta.status)" variant="subtle">{{ statusLabel[statusData?.meta.status || ''] || statusData?.meta.status || '未知' }}</UBadge>
            <UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" :loading="syncing" :disabled="!statusData?.configured" @click="syncNow">立即同步</UButton>
          </div>
        </div>
        <p v-if="!statusData?.configured" class="mt-3 text-sm text-amber-600">尚未配置 STEAM_ID / STEAM_API_KEY，同步会被跳过。</p>
      </UCard>

      <UCard>
        <p class="font-medium">生效说明</p>
        <p class="mt-2 text-sm text-muted">保存后公开页最长 5 分钟后生效（边缘缓存 300 秒）。同步失败时页面会保留上一次成功快照并标注过期。</p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="font-medium">我的评分</p>
            <p class="mt-1 text-xs text-muted">
              公开页「我的评分」板块、评分详情页（/games/ratings）与最爱游戏上的分数都来自这里，只写在自己的库里，不会同步回 Steam。列表已分页，可先筛选再改分。
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UBadge variant="subtle" color="neutral">已评 {{ ratingDraft.length }} 款</UBadge>
            <UBadge variant="subtle" color="primary">平均 {{ ratingAverage }}</UBadge>
            <UButton icon="i-lucide-save" :loading="savingRatings" @click="saveRatingDraft">保存评分</UButton>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <UInput
            v-model="ratingQuery"
            icon="i-lucide-search"
            placeholder="搜索库里的游戏（名字或 appid）"
            class="w-full sm:w-72"
          />
          <UInput
            v-model="ratingFilter"
            icon="i-lucide-list-filter"
            placeholder="筛选已评游戏"
            class="w-full sm:w-56"
            :disabled="!ratingDraft.length"
          />
          <span class="text-xs text-muted">分数 1 - 10，0.5 档；短评最多 {{ ratingCommentMax }} 字</span>
        </div>

        <div v-if="ratingCandidates.length" class="divide-y divide-default rounded-lg border border-default">
          <button
            v-for="item in ratingCandidates"
            :key="item.appid"
            type="button"
            class="flex w-full items-center gap-3 p-2 text-left hover:bg-elevated/60"
            @click="addRating(item)"
          >
            <img
              v-if="item.headerUrl"
              :src="item.headerUrl"
              :alt="item.name"
              class="h-9 w-16 rounded object-cover"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
            <span class="min-w-0 flex-1 truncate text-sm">{{ item.name }}</span>
            <span class="text-xs text-muted">{{ Math.round(item.minutesTotal / 60) }} 小时</span>
            <UIcon name="i-lucide-plus" class="size-4" />
          </button>
        </div>

        <div v-if="ratingDraft.length" class="space-y-2">
          <div
            v-for="item in pagedRatings"
            :key="item.appid"
            class="flex flex-wrap items-center gap-3 rounded-lg border border-default p-2"
          >
            <div class="flex flex-col gap-1">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-up" :disabled="!canMoveRating(item.appid, -1)" @click="moveRatingBy(item.appid, -1)" />
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" :disabled="!canMoveRating(item.appid, 1)" @click="moveRatingBy(item.appid, 1)" />
            </div>
            <img
              v-if="item.headerUrl"
              :src="item.headerUrl"
              :alt="item.name"
              class="h-9 w-16 rounded object-cover"
              loading="lazy"
              referrerpolicy="no-referrer"
            >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium">{{ item.name }}</p>
              <p class="text-xs text-muted">appid {{ item.appid }}</p>
            </div>
            <UInput
              v-model.number="item.score"
              type="number"
              step="0.5"
              min="1"
              max="10"
              class="w-20"
            />
            <UInput
              v-model="item.comment"
              :maxlength="ratingCommentMax"
              placeholder="一句话短评（可空）"
              class="min-w-0 flex-1 sm:max-w-md"
            />
            <UButton size="xs" color="error" variant="ghost" icon="i-lucide-x" @click="removeRating(item.appid)" />
          </div>

          <p v-if="filteredRatings.length === 0" class="p-2 text-sm text-muted">
            没有匹配「{{ ratingFilter }}」的评分。
          </p>

          <div v-if="filteredRatings.length > RATING_PAGE_SIZE" class="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span class="text-xs text-muted">第 {{ ratingPage }} / {{ ratingPageCount }} 页 · 共 {{ filteredRatings.length }} 条</span>
            <div class="flex items-center gap-1">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-left" :disabled="ratingPage <= 1" @click="ratingPage = Math.max(1, ratingPage - 1)" />
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-right" :disabled="ratingPage >= ratingPageCount" @click="ratingPage = Math.min(ratingPageCount, ratingPage + 1)" />
            </div>
          </div>
        </div>
        <p v-else class="p-2 text-sm text-muted">还没有评分。上面搜一款游戏，加进来打分。</p>
      </div>
    </UCard>

    <div class="grid gap-4 lg:grid-cols-2">
      <UCard :ui="{ body: 'p-3 sm:p-3' }">
        <template #header>
          <div class="flex items-center justify-between">
            <p class="font-medium">已启用展柜</p>
            <span class="text-xs text-muted">{{ draft.length }} 个</span>
          </div>
        </template>
        <div class="space-y-2">
          <div
            v-for="(entry, index) in draft"
            :key="entry.type"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition"
            :class="[
              selectedType === entry.type ? 'border-primary bg-primary/5' : 'border-default hover:border-primary/40',
              entry.visible ? '' : 'opacity-50'
            ]"
            @click="selectedType = entry.type"
          >
            <div class="flex flex-col gap-1">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-up" :disabled="index === 0" @click.stop="move(index, -1)" />
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" :disabled="index === draft.length - 1" @click.stop="move(index, 1)" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ definitionOf(entry.type)?.label || entry.type }}</p>
              <p class="truncate text-xs text-muted">
                {{ definitionOf(entry.type)?.description || '' }}
                <span v-if="entry.config.limit"> · 数量 {{ entry.config.limit }}</span>
                <span v-if="entry.config.sort"> · {{ entry.config.sort === 'recent' ? '近两周' : '总时长' }}</span>
                <span v-if="definitionOf(entry.type)?.detailPath"> · 更多入口{{ entry.config.more === false ? '关' : '开' }}</span>
                <span v-if="entry.config.appid"> · appid {{ entry.config.appid }}</span>
              </p>
            </div>
            <USwitch :model-value="entry.visible" @update:model-value="toggle(entry, Boolean($event))" @click.stop />
            <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-x" @click.stop="remove(entry.type)" />
          </div>
          <p v-if="draft.length === 0" class="p-4 text-sm text-muted">还没有启用任何展柜。</p>
        </div>
      </UCard>

      <div class="space-y-4">
        <UCard>
          <template #header>
            <p class="font-medium">配置 · {{ selectedDefinition?.label || '未选择' }}</p>
          </template>
          <div v-if="selectedEntry && selectedDefinition" class="space-y-4">
            <UFormField v-if="selectedDefinition.limitRange" :label="`首页预览条数（${selectedDefinition.limitRange[0]} - ${selectedDefinition.limitRange[1]}）`">
              <UInput
                v-model.number="selectedEntry.config.limit"
                type="number"
                :min="selectedDefinition.limitRange[0]"
                :max="selectedDefinition.limitRange[1]"
                class="w-32"
              />
            </UFormField>
            <UFormField v-if="selectedDefinition.sortOptions" label="排序方式">
              <USelect
                v-model="selectedEntry.config.sort"
                :items="[{ label: '总时长', value: 'total' }, { label: '近两周', value: 'recent' }]"
                class="w-40"
              />
            </UFormField>
            <UFormField v-if="selectedDefinition.detailPath" label="首页「更多…」入口">
              <div class="flex flex-wrap items-center gap-3">
                <USwitch v-model="selectedEntry.config.more" />
                <span class="text-xs text-muted">
                  关闭后首页只显示预览；完整列表始终可通过
                  <a :href="selectedDefinition.detailPath" target="_blank" rel="noopener" class="text-primary underline">{{ selectedDefinition.detailPath }}</a>
                  直接访问。
                </span>
              </div>
            </UFormField>
            <UFormField v-if="selectedDefinition.type === 'favorite'" label="指定游戏 AppID（留空则取时长最高）">
              <UInput v-model.number="selectedEntry.config.appid" type="number" placeholder="例如 1245620" class="w-56" />
            </UFormField>
            <p class="text-xs text-muted">{{ selectedDefinition.description }}</p>
          </div>
          <p v-else class="text-sm text-muted">从左侧选择一个展柜进行配置。</p>
        </UCard>

        <UCard :ui="{ body: 'p-3 sm:p-3' }">
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-medium">可选展柜</p>
              <span class="text-xs text-muted">{{ available.length }} 个可用</span>
            </div>
          </template>
          <div class="grid gap-2 sm:grid-cols-2">
            <div v-for="item in available" :key="item.type" class="flex items-center gap-2 rounded-lg border border-dashed p-3">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">{{ item.label }}</p>
                <p class="truncate text-xs text-muted">{{ item.description }}</p>
              </div>
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-plus" :disabled="draft.length >= limit" @click="add(item.type)" />
            </div>
            <p v-if="available.length === 0" class="p-2 text-sm text-muted">所有展柜都已启用。</p>
          </div>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="clearOpen" title="清除后台保存的凭证">
      <template #body>
        将删除 D1 中加密保存的 API Key 与 SteamID。若 Worker 上仍配置了
        <code>STEAM_ID</code> / <code>STEAM_API_KEY</code>，同步会自动回退到环境变量；否则同步会暂停。
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" :disabled="savingCredentials" @click="clearOpen = false">取消</UButton>
          <UButton color="error" :loading="savingCredentials" icon="i-lucide-trash-2" @click="clearCredential">确认清除</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

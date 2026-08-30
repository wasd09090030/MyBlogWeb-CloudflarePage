<template>
  <div class="diary-feed">
    <header class="diary-feed__head">
      <div class="diary-feed__rule"><span>◆</span></div>
      <h1 class="diary-feed__title">每日日记 <em>Diary</em></h1>
      <div class="diary-feed__rule"><span>◆</span></div>
      <p class="diary-feed__subtitle">每天的碎碎念</p>
    </header>

    <StateLoading v-if="loading" message="正在翻开日记..." class="py-12" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="数据读取失败"
      class="mb-8"
      :description="error"
    />

    <template v-else>
      <!-- 时间筛选：年份 + 月份 -->
      <div class="diary-feed__filters">
        <div class="diary-feed__filter-row">
          <button
            v-for="option in yearOptions"
            :key="option.value"
            type="button"
            class="diary-feed__chip"
            :class="{ 'diary-feed__chip--active': yearFilter === option.value }"
            @click="setYear(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <div v-if="yearFilter !== 'all'" class="diary-feed__filter-row">
          <button
            v-for="option in monthOptions"
            :key="option.value"
            type="button"
            class="diary-feed__chip"
            :class="{ 'diary-feed__chip--active': monthFilter === option.value }"
            @click="setMonth(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
        <p class="diary-feed__count">当前显示：<b>{{ currentLabel }}</b> · 共 {{ filteredEntries.length }} 篇</p>
      </div>

      <StateEmpty
        v-if="filteredEntries.length === 0"
        icon="heroicons:book-open"
        description="这个时间段没有记录"
        class="my-16"
      />

      <div v-else class="diary-feed__list">
        <article v-for="entry in filteredEntries" :key="entry.entryDate" class="diary-feed__item">
          <div class="diary-feed__date">
            <div class="diary-feed__day">{{ dayOf(entry.entryDate) }}</div>
            <div class="diary-feed__ym">{{ yearMonthOf(entry.entryDate) }} · {{ weekdayOf(entry.entryDate) }}</div>
          </div>

          <div class="diary-feed__card">
            <div class="diary-feed__meta">
              <span class="diary-feed__mood">
                <span class="diary-feed__dot" :style="{ background: moodColor(entry.mood) }" />
                {{ moodLabel(entry.mood) }}
              </span>
              <span v-if="entry.weather" class="diary-feed__text-chip">{{ weatherLabel(entry.weather) }}</span>
              <span v-if="entry.location" class="diary-feed__loc">{{ entry.location }}</span>
              <span v-if="entry.createdAt" class="diary-feed__time">{{ timeOf(entry.createdAt) }}</span>
            </div>

            <div class="diary-feed__content article-prose article-prose--base max-w-none">
              <ClientOnly>
                <MDCCached :value="entry.contentMarkdown || ''" tag="article" />
              </ClientOnly>
            </div>

            <div v-if="entry.tags && entry.tags.length" class="diary-feed__tags">
              <span v-for="tag in entry.tags" :key="tag" class="diary-feed__tag"># {{ tag }}</span>
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { createDiaryRepository, type DiaryEntry } from '~/features/diary/services/diary.repository'
import StateLoading from '~/shared/ui/StateLoading.vue'
import StateEmpty from '~/shared/ui/StateEmpty.vue'

// 心情 → 文字 + 主题色点（无 emoji，与后台一致）
const MOODS: Record<string, { label: string; color: string }> = {
  happy: { label: '开心', color: '#e11d48' },
  excited: { label: '兴奋', color: '#fb923c' },
  calm: { label: '平静', color: '#0d9488' },
  busy: { label: '忙碌', color: '#be123c' },
  tired: { label: '疲惫', color: '#8a7368' },
  cozy: { label: '惬意', color: '#f97316' },
  pensive: { label: '沉思', color: '#8b5cf6' }
}
const WEATHERS: Record<string, string> = {
  sunny: '晴', cloudy: '多云', overcast: '阴', rain: '雨', thunder: '雷阵雨', haze: '雾霾'
}

// SSG 构建时拉取：数据在预渲染阶段写入 _payload.json，水化时零请求直接使用。
const { getDiaryEntriesSSG } = createDiaryRepository()
let _initialEntries: DiaryEntry[] = []
let _initialError: Error | null = null
try {
  _initialEntries = await getDiaryEntriesSSG()
} catch (e) {
  _initialError = e as Error
}

const entries = ref(_initialEntries.filter(e => e.isPublic !== false))
const loading = ref(false) // SSG 数据已就绪，无需加载状态
const error = ref<string | null>(_initialError ? '获取日记数据失败' : null)
const yearFilter = ref<string>('all')
const monthFilter = ref<string>('all')

const yearOptions = computed(() => {
  const years = [...new Set(entries.value.map(e => e.entryDate.slice(0, 4)))].sort().reverse()
  return [{ label: '全部时间', value: 'all' }, ...years.map(y => ({ label: `${y} 年`, value: y }))]
})

const monthOptions = computed(() => {
  if (yearFilter.value === 'all') return []
  const months = entries.value
    .filter(e => e.entryDate.startsWith(yearFilter.value))
    .map(e => Number(e.entryDate.slice(5, 7)))
  const unique = [...new Set(months)].sort((a, b) => a - b)
  return [{ label: '全年', value: 'all' }, ...unique.map(m => ({ label: `${m}月`, value: String(m) }))]
})

const filteredEntries = computed(() => {
  return entries.value.filter(entry => {
    const [y, m] = entry.entryDate.split('-').map(Number)
    if (yearFilter.value !== 'all' && y !== Number(yearFilter.value)) return false
    if (monthFilter.value !== 'all' && m !== Number(monthFilter.value)) return false
    return true
  })
})

const currentLabel = computed(() => {
  if (yearFilter.value === 'all') return '全部时间'
  if (monthFilter.value === 'all') return `${yearFilter.value} 年`
  return `${yearFilter.value}年${monthFilter.value}月`
})

function setYear(value: string) {
  yearFilter.value = value
  monthFilter.value = 'all'
}
function setMonth(value: string) {
  monthFilter.value = value
}

function moodLabel(mood?: string): string {
  return (MOODS as Record<string, { label: string; color: string }>)[mood || 'calm']?.label || '平静'
}
function moodColor(mood?: string): string {
  return (MOODS as Record<string, { label: string; color: string }>)[mood || 'calm']?.color || '#8a7368'
}
function weatherLabel(weather?: string): string {
  return WEATHERS[weather || 'sunny'] || '晴'
}
function dayOf(date: string): string {
  return String(Number(date.slice(8, 10)))
}
function yearMonthOf(date: string): string {
  const [y, m] = date.split('-')
  return `${y}.${m}`
}
function weekdayOf(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
}
function timeOf(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d)
}
</script>

<style scoped>
@import '~/assets/css/components/DiaryPageContainer.desktop.css';
@import '~/assets/css/components/DiaryPageContainer.mobile.css';
</style>

<script setup lang="ts">
import type { DiaryEntry, DiaryMood, DiaryWeather } from '~/types/admin'
import { markdownCommands, type MarkdownCommand } from '~/composables/useMarkdownTemplates'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })

const api = useAdminApi()
const toast = useToast()

const MOODS: Record<DiaryMood, { label: string; color: string }> = {
  happy: { label: '开心', color: '#e11d48' },
  excited: { label: '兴奋', color: '#fb923c' },
  calm: { label: '平静', color: '#0d9488' },
  busy: { label: '忙碌', color: '#be123c' },
  tired: { label: '疲惫', color: '#8a7368' },
  cozy: { label: '惬意', color: '#f97316' },
  pensive: { label: '沉思', color: '#8b5cf6' }
}
const MOOD_KEYS = Object.keys(MOODS) as DiaryMood[]
const WEATHERS: Array<{ key: DiaryWeather; label: string }> = [
  { key: 'sunny', label: '晴' },
  { key: 'cloudy', label: '多云' },
  { key: 'overcast', label: '阴' },
  { key: 'rain', label: '雨' },
  { key: 'thunder', label: '雷阵雨' },
  { key: 'haze', label: '雾霾' }
]

const { data: entries, refresh } = await useAsyncData('admin-diary', () => api.get<DiaryEntry[]>('diary/admin', { cache: false }))

// keepalive 页面从缓存恢复时重新拉取数据
let hasActivated = false
onActivated(() => {
  if (!hasActivated) { hasActivated = true; return }
  refresh()
})

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 日历状态
const calYear = ref(new Date().getFullYear())
const calMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref(todayStr())

// 编辑表单
const form = reactive<{ contentMarkdown: string; mood: DiaryMood; weather: DiaryWeather; location: string; tags: string; isPublic: boolean }>({
  contentMarkdown: '',
  mood: 'calm',
  weather: 'sunny',
  location: '',
  tags: '',
  isPublic: true
})
const editor = ref<{
  wrapSelection: (before: string, after: string, placeholder: string) => void
  toggleLinePrefix: (prefix: string) => void
  insertBlock: (text: string, caretOffset?: number) => void
  undo: () => void
  redo: () => void
}>()
const mode = ref<'source' | 'split' | 'preview'>('split')
const saving = ref(false)

const entryByDate = computed(() => new Map((entries.value || []).map(e => [e.entryDate, e])))
const monthEntries = computed(() => (entries.value || []).filter(e => e.entryDate.startsWith(`${calYear.value}-${String(calMonth.value).padStart(2, '0')}`)))

// 月历矩阵（周一开头）
function buildMonthMatrix(year: number, month: number): Array<Array<{ date: string; day: number; inMonth: boolean }>> {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = []
  for (let i = 0; i < lead; i += 1) {
    const d = new Date(year, month - 1, 1 - (lead - i))
    cells.push({ date: fmt(d), day: d.getDate(), inMonth: false })
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: fmt(new Date(year, month - 1, day)), day, inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const d = new Date(`${last.date}T00:00:00`)
    d.setDate(d.getDate() + 1)
    cells.push({ date: fmt(d), day: d.getDate(), inMonth: false })
  }
  const weeks: Array<Array<{ date: string; day: number; inMonth: boolean }>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const calWeeks = computed(() => buildMonthMatrix(calYear.value, calMonth.value))

function shiftMonth(delta: number) {
  calMonth.value += delta
  if (calMonth.value < 1) { calMonth.value = 12; calYear.value -= 1 }
  if (calMonth.value > 12) { calMonth.value = 1; calYear.value += 1 }
}

function moodColor(mood?: string): string {
  return (MOODS as Record<string, { label: string; color: string }>)[mood || 'calm']?.color || '#8a7368'
}

function fillForm(entry?: DiaryEntry) {
  if (entry) {
    form.contentMarkdown = entry.contentMarkdown || ''
    form.mood = (entry.mood as DiaryMood) || 'calm'
    form.weather = (entry.weather as DiaryWeather) || 'sunny'
    form.location = entry.location || ''
    form.tags = (entry.tags || []).join(', ')
    form.isPublic = entry.isPublic !== false
  } else {
    form.contentMarkdown = ''
    form.mood = 'calm'
    form.weather = 'sunny'
    form.location = ''
    form.tags = ''
    form.isPublic = true
  }
}

function selectDate(date: string) {
  selectedDate.value = date
  fillForm(entryByDate.value.get(date))
}

const recentEntries = computed(() => [...(entries.value || [])].sort((a, b) => b.entryDate.localeCompare(a.entryDate)).slice(0, 12))

function runMarkdownCommand(command: MarkdownCommand) {
  if (command.type === 'wrap') editor.value?.wrapSelection(command.before || '', command.after || '', command.placeholder || '')
  else if (command.type === 'prefix') editor.value?.toggleLinePrefix(command.value || '')
  else editor.value?.insertBlock(command.value || '', command.caretOffset)
}

async function save() {
  if (!form.contentMarkdown.trim()) { toast.add({ title: '正文不能为空', color: 'warning' }); return }
  saving.value = true
  try {
    await api.put(`diary/${selectedDate.value}`, {
      contentMarkdown: form.contentMarkdown,
      mood: form.mood,
      weather: form.weather,
      location: form.location || null,
      tags: form.tags.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      isPublic: form.isPublic
    })
    toast.add({ title: `已保存 ${selectedDate.value} 的日记`, color: 'success' })
    await refresh()
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '保存失败', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!entryByDate.value.has(selectedDate.value)) return
  if (!confirm(`删除 ${selectedDate.value} 的日记？`)) return
  try {
    await api.del(`diary/${selectedDate.value}`)
    toast.add({ title: '日记已删除', color: 'success' })
    await refresh()
    fillForm()
  } catch (error: any) {
    toast.add({ title: error?.data?.statusMessage || '删除失败', color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-muted">每日记录</p>
        <h2 class="text-2xl font-semibold">每日日记</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" icon="i-lucide-calendar-days" :disabled="selectedDate === todayStr()" @click="selectDate(todayStr())">今天</UButton>
        <UButton :loading="saving" icon="i-lucide-save" @click="save">保存日记</UButton>
      </div>
    </div>

    <div class="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <!-- 左：日历 + 近期记录 -->
      <div class="space-y-5">
        <UCard>
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold">{{ calYear }}年{{ calMonth }}月</p>
            <div class="flex gap-1">
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-left" aria-label="上个月" @click="shiftMonth(-1)" />
              <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-right" aria-label="下个月" @click="shiftMonth(1)" />
            </div>
          </div>
          <div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted">
            <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span>
          </div>
          <div class="mt-1 grid grid-cols-7 gap-1">
            <template v-for="week in calWeeks" :key="week[0].date">
              <button
                v-for="cell in week"
                :key="cell.date"
                type="button"
                :disabled="!cell.inMonth"
                class="relative grid aspect-square place-items-center rounded-md border text-sm transition disabled:opacity-20"
                :class="[
                  cell.date === selectedDate ? 'border-primary bg-primary/10 font-semibold text-primary' : 'border-default hover:border-primary/50',
                  cell.date === todayStr() ? 'ring-1 ring-primary' : ''
                ]"
                :title="cell.date"
                @click="selectDate(cell.date)"
              >
                {{ cell.day }}
                <span
                  v-if="entryByDate.get(cell.date)"
                  class="absolute bottom-1 h-1.5 w-1.5 rounded-full"
                  :style="{ background: moodColor(entryByDate.get(cell.date)?.mood) }"
                />
              </button>
            </template>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 border-t border-default pt-3 text-xs text-muted">
            <span>本月 <b class="text-primary">{{ monthEntries.length }}</b> 天</span>
            <span>共 <b class="text-primary">{{ entries?.length || 0 }}</b> 篇</span>
          </div>
        </UCard>

        <UCard>
          <template #header><p class="text-sm font-semibold">近期记录</p></template>
          <button
            v-for="entry in recentEntries"
            :key="entry.entryDate"
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-default"
            :class="entry.entryDate === selectedDate ? 'bg-primary/10 text-primary' : ''"
            @click="selectDate(entry.entryDate)"
          >
            <span class="h-2 w-2 flex-none rounded-full" :style="{ background: moodColor(entry.mood) }" />
            <span class="font-medium">{{ entry.entryDate.slice(5) }}</span>
            <span class="text-muted">{{ MOODS[(entry.mood as DiaryMood) || 'calm'].label }}</span>
            <span class="ms-auto truncate text-muted">{{ (entry.contentMarkdown || '').replace(/[#>*`\-\n]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12) }}</span>
          </button>
          <p v-if="!recentEntries.length" class="py-4 text-center text-sm text-muted">还没有写过日记，选个日期开始吧。</p>
        </UCard>
      </div>

      <!-- 右：编辑器 -->
      <UCard :ui="{ body: 'p-0' }">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-default p-4">
          <div class="flex flex-wrap items-center gap-3">
            <UFormField label="日期">
              <UInput v-model="selectedDate" type="date" class="w-40" @update:model-value="selectDate(selectedDate)" />
            </UFormField>
            <UFormField label="地点（可选）">
              <UInput v-model="form.location" class="w-44" placeholder="家 · 书房" />
            </UFormField>
            <UFormField label="标签（逗号分隔）">
              <UInput v-model="form.tags" class="w-48" placeholder="生活, 咖啡" />
            </UFormField>
          </div>
          <UCheckbox v-model="form.isPublic" label="公开显示" />
        </div>

        <div class="space-y-4 p-4">
          <div class="flex flex-wrap items-start gap-6">
            <div>
              <p class="mb-2 text-xs font-medium text-muted">心情</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="(meta, key) in MOODS"
                  :key="key"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition"
                  :class="form.mood === key ? 'border-primary text-primary' : 'border-default text-muted hover:border-primary/50'"
                  @click="form.mood = key"
                >
                  <span class="h-2.5 w-2.5 rounded-full" :style="{ background: meta.color }" />
                  {{ meta.label }}
                </button>
              </div>
            </div>
            <div>
              <p class="mb-2 text-xs font-medium text-muted">天气</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="item in WEATHERS"
                  :key="item.key"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-sm transition"
                  :class="form.weather === item.key ? 'border-primary text-primary' : 'border-default text-muted hover:border-primary/50'"
                  @click="form.weather = item.key"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-md border border-default">
            <div class="flex flex-wrap items-center gap-1 border-b border-default px-2 py-1.5">
              <span class="pe-1 text-xs font-medium text-muted">Markdown</span>
              <UTooltip v-for="item in markdownCommands" :key="item.label" :text="item.label">
                <UButton size="xs" color="neutral" variant="ghost" :icon="item.icon" :aria-label="item.label" @click="runMarkdownCommand(item)" />
              </UTooltip>
              <USeparator orientation="vertical" class="mx-1 h-5" />
              <UTooltip text="撤销"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-undo-2" aria-label="撤销" @click="editor?.undo()" /></UTooltip>
              <UTooltip text="重做"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-redo-2" aria-label="重做" @click="editor?.redo()" /></UTooltip>
              <div class="ms-auto flex gap-1">
                <UButton
                  v-for="item in [{ value: 'source', label: '源码' }, { value: 'split', label: '分屏' }, { value: 'preview', label: '预览' }]"
                  :key="item.value"
                  size="xs"
                  :color="mode === item.value ? 'primary' : 'neutral'"
                  :variant="mode === item.value ? 'solid' : 'ghost'"
                  @click="mode = item.value as typeof mode"
                >
                  {{ item.label }}
                </UButton>
              </div>
            </div>
            <div class="grid" :class="mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1'">
              <section v-show="mode !== 'preview'" class="min-w-0 border-r border-default">
                <MarkdownSourceEditor ref="editor" v-model="form.contentMarkdown" />
              </section>
              <section v-show="mode !== 'source'" class="min-w-0">
                <AdminMarkdownPreview :markdown="form.contentMarkdown" />
              </section>
            </div>
          </div>
        </div>

        <div class="flex justify-between gap-2 border-t border-default bg-elevated p-3">
          <UButton color="error" variant="soft" icon="i-lucide-trash-2" :disabled="!entryByDate.get(selectedDate)" @click="remove">删除这天</UButton>
          <UButton :loading="saving" icon="i-lucide-save" @click="save">保存日记</UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

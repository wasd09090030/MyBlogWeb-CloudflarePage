<script setup lang="ts">
import type { GalleryHeroConfiguration, GalleryHeroItem, GalleryHeroSection, GalleryItem } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })

const api = useAdminApi()
const toast = useToast()
const open = ref(false)
const importOpen = ref(false)
const batchUpdateOpen = ref(false)
const editing = ref<GalleryItem | null>(null)
const form = reactive({ imageUrl: '', tag: 'artwork', isActive: true, sortOrder: 0, createdAt: '' })
const batch = reactive({ imageUrls: '', tag: 'artwork', isActive: true })
const batchUpdate = reactive({ changeTag: false, tag: 'artwork', changeCreatedAt: false, createdAt: '' })
const selectedIds = ref<number[]>([])
const tagFilter = ref('all')
const visibilityFilter = ref('all')
const sortMode = ref('manual')
const orderDirty = ref(false)
const backfilling = ref(false)
const heroSaving = ref(false)
const heroSections = reactive<Record<GalleryHeroSection, GalleryHeroItem[]>>({
  fade: [],
  accordion: [],
  coverflow: [],
  preview: []
})
const heroDefinitions: Array<{ key: GalleryHeroSection; label: string; limit: number }> = [
  { key: 'fade', label: '淡入轮播', limit: 5 },
  { key: 'accordion', label: '手风琴', limit: 5 },
  { key: 'coverflow', label: 'Coverflow', limit: 5 },
  { key: 'preview', label: '右侧预览', limit: 3 }
]
const tagOptions = [
  { label: 'Artwork', value: 'artwork' },
  { label: 'Game', value: 'game' }
]
const tagFilterOptions = [{ label: '全部类型', value: 'all' }, ...tagOptions]
const visibilityOptions = [
  { label: '全部状态', value: 'all' },
  { label: '公开显示', value: 'visible' },
  { label: '已隐藏', value: 'hidden' }
]
const sortOptions = [
  { label: '手动排序', value: 'manual' },
  { label: '排序号：从小到大', value: 'order-asc' },
  { label: '排序号：从大到小', value: 'order-desc' },
  { label: '最新创建', value: 'newest' }
]
const { data: items, refresh } = await useAsyncData('admin-gallery', () => api.get<GalleryItem[]>('gallery/admin'))
const { data: heroConfiguration, refresh: refreshHeroConfiguration } = await useAsyncData(
  'admin-gallery-hero',
  () => api.get<GalleryHeroConfiguration>('gallery/hero')
)

function applyHeroConfiguration(configuration: GalleryHeroConfiguration) {
  for (const definition of heroDefinitions) {
    heroSections[definition.key] = (configuration.sections[definition.key] || []).map(item => ({
      ...item,
      imageUrl: item.sourceImageUrl || item.imageUrl
    }))
  }
}

watch(heroConfiguration, (configuration) => {
  if (configuration) applyHeroConfiguration(configuration)
}, { immediate: true })

function toShanghaiDateTimeLocal(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const fields = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`
}

function toCreatedAtUtc(value: string) {
  if (!value) return undefined
  const localValue = value.length === 16 ? `${value}:00` : value
  const date = new Date(`${localValue}+08:00`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

const visibleItems = computed(() => {
  const list = (items.value || []).filter((item) => {
    const tagMatches = tagFilter.value === 'all' || (item.tag || 'artwork') === tagFilter.value
    const visibilityMatches = visibilityFilter.value === 'all' || (visibilityFilter.value === 'visible' ? item.isActive !== false : item.isActive === false)
    return tagMatches && visibilityMatches
  })
  return [...list].sort((a, b) => {
    if (sortMode.value === 'order-desc') return (b.sortOrder || 0) - (a.sortOrder || 0)
    if (sortMode.value === 'newest') return b.id - a.id
    return (a.sortOrder || 0) - (b.sortOrder || 0)
  })
})

const allVisibleSelected = computed(() => visibleItems.value.length > 0 && visibleItems.value.every(item => selectedIds.value.includes(item.id)))

function setItemSelected(id: number, selected: boolean | 'indeterminate') {
  if (selected === true) {
    if (!selectedIds.value.includes(id)) selectedIds.value = [...selectedIds.value, id]
    return
  }
  selectedIds.value = selectedIds.value.filter(value => value !== id)
}

function toggleVisibleSelection() {
  const visibleIds = visibleItems.value.map(item => item.id)
  if (allVisibleSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !visibleIds.includes(id))
    return
  }
  selectedIds.value = [...new Set([...selectedIds.value, ...visibleIds])]
}

function openBatchUpdate() {
  if (!selectedIds.value.length) return
  batchUpdate.changeTag = false
  batchUpdate.tag = 'artwork'
  batchUpdate.changeCreatedAt = false
  batchUpdate.createdAt = ''
  batchUpdateOpen.value = true
}

async function saveBatchUpdate() {
  if (!batchUpdate.changeTag && !batchUpdate.changeCreatedAt) {
    toast.add({ title: '请选择要批量修改的字段', color: 'warning' })
    return
  }
  if (batchUpdate.changeCreatedAt && !batchUpdate.createdAt) {
    toast.add({ title: '请选择展示时间', color: 'warning' })
    return
  }
  const payload: { ids: number[]; tag?: string; createdAt?: string } = { ids: selectedIds.value }
  if (batchUpdate.changeTag) payload.tag = batchUpdate.tag
  if (batchUpdate.changeCreatedAt) payload.createdAt = toCreatedAtUtc(batchUpdate.createdAt)
  const result = await api.patch<{ updated: number }>('gallery/batch/update', payload)
  batchUpdateOpen.value = false
  selectedIds.value = []
  toast.add({ title: `已修改 ${result.updated} 张图片`, color: 'success' })
  await refresh()
}

function edit(item?: GalleryItem) {
  editing.value = item || null
  Object.assign(form, item
    ? { imageUrl: item.imageUrl, tag: item.tag === 'game' ? 'game' : 'artwork', isActive: item.isActive !== false, sortOrder: item.sortOrder || 0, createdAt: toShanghaiDateTimeLocal(item.createdAt) }
    : { imageUrl: '', tag: 'artwork', isActive: true, sortOrder: (items.value?.length || 0) + 1, createdAt: '' })
  open.value = true
}
async function save() {
  const { createdAt, ...galleryInput } = form
  if (editing.value) await api.patch(`gallery/${editing.value.id}`, { ...galleryInput, createdAt: toCreatedAtUtc(createdAt) })
  else await api.post('gallery', galleryInput)
  open.value = false
  toast.add({ title: '画廊已保存', color: 'success' })
  await refresh()
}
async function importBatch() {
  const imageUrls = batch.imageUrls.split('\n').map(value => value.trim()).filter(Boolean)
  if (!imageUrls.length) {
    toast.add({ title: '请至少填写一个图片地址', color: 'warning' })
    return
  }
  await api.post('gallery/batch/import', { imageUrls, tag: batch.tag, isActive: batch.isActive })
  importOpen.value = false
  batch.imageUrls = ''
  toast.add({ title: `已导入 ${imageUrls.length} 张${batch.tag === 'game' ? '游戏' : '作品'}图片`, color: 'success' })
  await refresh()
}
function move(item: GalleryItem, direction: -1 | 1) {
  const list = [...(items.value || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  const index = list.findIndex(entry => entry.id === item.id)
  const target = list[index + direction]
  if (index < 0 || !target) return
  const currentOrder = item.sortOrder || index + 1
  item.sortOrder = target.sortOrder || index + direction + 1
  target.sortOrder = currentOrder
  orderDirty.value = true
}
async function saveOrder() {
  const updates = [...(items.value || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((item, index) => ({ id: item.id, sortOrder: index + 1 }))
  await api.patch('gallery/batch/sort-order', updates)
  orderDirty.value = false
  toast.add({ title: '手动排序已保存', color: 'success' })
  await refresh()
}
function addHeroItem(section: GalleryHeroSection) {
  const definition = heroDefinitions.find(item => item.key === section)
  if (!definition || heroSections[section].length >= definition.limit) return
  heroSections[section].push({ imageUrl: '' })
}
function moveHeroItem(section: GalleryHeroSection, index: number, direction: -1 | 1) {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= heroSections[section].length) return
  const [item] = heroSections[section].splice(index, 1)
  heroSections[section].splice(targetIndex, 0, item!)
}
function removeHeroItem(section: GalleryHeroSection, index: number) {
  heroSections[section].splice(index, 1)
}
async function saveHeroConfiguration() {
  const sections = Object.fromEntries(heroDefinitions.map(({ key }) => [
    key,
    heroSections[key].map(item => ({ imageUrl: item.imageUrl.trim() }))
  ])) as Record<GalleryHeroSection, Array<{ imageUrl: string }>>
  if (Object.values(sections).flat().some(item => !item.imageUrl)) {
    toast.add({ title: '请填写所有 Hero 图片地址，或删除空项', color: 'warning' })
    return
  }
  heroSaving.value = true
  try {
    const saved = await api.put<GalleryHeroConfiguration>('gallery/hero', { sections })
    applyHeroConfiguration(saved)
    toast.add({ title: 'Artwork Hero 已保存', color: 'success' })
    await refreshHeroConfiguration()
  } finally {
    heroSaving.value = false
  }
}
async function toggle(item: GalleryItem) { await api.patch(`gallery/${item.id}/toggle-active`); await refresh() }
async function backfillImageAssets() {
  backfilling.value = true
  try {
    const result = await api.post<{ updated: number; skipped: number }>('gallery/backfill-image-assets')
    toast.add({ title: `已迁移 ${result.updated} 张，跳过 ${result.skipped} 张`, color: 'success' })
    await refresh()
  } catch {
    toast.add({ title: '素材迁移失败，请稍后重试', color: 'error' })
  } finally {
    backfilling.value = false
  }
}
async function remove(item: GalleryItem) { if (!confirm('删除该画廊项？')) return; await api.del(`gallery/${item.id}`); await refresh() }
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><p class="text-sm text-muted">视觉内容</p><h2 class="text-2xl font-semibold">画廊</h2></div>
      <div class="flex flex-wrap gap-2"><UButton color="neutral" variant="soft" icon="i-lucide-ruler" @click="api.post('gallery/refresh-dimensions').then(() => refresh())">刷新尺寸</UButton><UButton v-if="orderDirty" color="neutral" variant="soft" icon="i-lucide-save" @click="saveOrder">保存手动排序</UButton><UButton color="neutral" variant="soft" icon="i-lucide-import" @click="importOpen = true">批量导入</UButton><UButton icon="i-lucide-plus" @click="edit()">添加图片</UButton></div>
    </div>

    <div class="flex justify-end"><UButton color="neutral" variant="soft" icon="i-lucide-refresh-cw" :loading="backfilling" @click="backfillImageAssets">迁移永久缩略图</UButton></div>

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><p class="text-sm text-muted">独立于瀑布流</p><h3 class="text-lg font-semibold">Artwork Hero</h3></div>
          <UButton icon="i-lucide-save" :loading="heroSaving" @click="saveHeroConfiguration">保存 Hero 配置</UButton>
        </div>
      </template>
      <div class="grid gap-5 lg:grid-cols-2">
        <section v-for="definition in heroDefinitions" :key="definition.key" class="space-y-3 rounded-md border border-default p-4">
          <div class="flex items-center justify-between gap-2"><h4 class="font-medium">{{ definition.label }}</h4><span class="text-sm text-muted">{{ heroSections[definition.key].length }} / {{ definition.limit }}</span></div>
          <div v-for="(item, index) in heroSections[definition.key]" :key="item.id || `${definition.key}-${index}`" class="flex items-center gap-2">
            <UInput v-model="item.imageUrl" class="min-w-0 flex-1" :aria-label="`${definition.label} 图片地址 ${index + 1}`" />
            <UTooltip text="上移"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-up" :disabled="index === 0" :aria-label="`上移 ${definition.label} 图片`" @click="moveHeroItem(definition.key, index, -1)" /></UTooltip>
            <UTooltip text="下移"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-down" :disabled="index === heroSections[definition.key].length - 1" :aria-label="`下移 ${definition.label} 图片`" @click="moveHeroItem(definition.key, index, 1)" /></UTooltip>
            <UTooltip text="删除"><UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" :aria-label="`删除 ${definition.label} 图片`" @click="removeHeroItem(definition.key, index)" /></UTooltip>
          </div>
          <UButton size="sm" color="neutral" variant="soft" icon="i-lucide-plus" :disabled="heroSections[definition.key].length >= definition.limit" @click="addHeroItem(definition.key)">添加图片</UButton>
        </section>
      </div>
    </UCard>
    <UCard :ui="{ body: 'p-3 sm:p-3' }">
      <div class="flex flex-wrap items-center gap-3">
        <USelect v-model="tagFilter" :items="tagFilterOptions" class="w-36" />
        <USelect v-model="visibilityFilter" :items="visibilityOptions" class="w-36" />
        <USelect v-model="sortMode" :items="sortOptions" class="w-48" />
        <span class="ms-auto text-sm text-muted">显示 {{ visibleItems.length }} / {{ items?.length || 0 }} 项</span>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-default pt-3">
        <UButton size="sm" color="neutral" variant="soft" :icon="allVisibleSelected ? 'i-lucide-square-check-big' : 'i-lucide-square'" :disabled="!visibleItems.length" @click="toggleVisibleSelection">
          {{ allVisibleSelected ? '取消全选当前结果' : '全选当前结果' }}
        </UButton>
        <span class="text-sm text-muted">已选 {{ selectedIds.length }} 项</span>
        <UButton size="sm" icon="i-lucide-pencil-line" :disabled="!selectedIds.length" @click="openBatchUpdate">批量修改</UButton>
      </div>
    </UCard>

    <div v-if="visibleItems.length" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="item in visibleItems" :key="item.id" :ui="{ body: 'p-0' }">
        <img :src="item.imageUrl" :alt="item.tag || 'gallery image'" class="aspect-square w-full object-cover" />
        <div class="space-y-3 p-3">
          <div class="flex items-center justify-between gap-2"><UBadge variant="subtle" color="primary">{{ item.tag === 'game' ? 'Game' : 'Artwork' }}</UBadge><UBadge :color="item.isActive ? 'success' : 'neutral'">{{ item.isActive ? '显示' : '隐藏' }}</UBadge></div>
          <div class="flex items-center justify-between gap-2">
            <UCheckbox :model-value="selectedIds.includes(item.id)" :aria-label="`选择图片 ${item.id}`" @update:model-value="setItemSelected(item.id, $event)" />
            <span class="me-auto text-xs text-muted">排序 {{ item.sortOrder || '-' }}</span>
            <div class="flex gap-1"><UTooltip v-if="sortMode === 'manual'" text="上移"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-up" :disabled="visibleItems[0]?.id === item.id" aria-label="上移" @click="move(item, -1)" /></UTooltip><UTooltip v-if="sortMode === 'manual'" text="下移"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-arrow-down" :disabled="visibleItems.at(-1)?.id === item.id" aria-label="下移" @click="move(item, 1)" /></UTooltip><UTooltip text="编辑"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pencil" aria-label="编辑" @click="edit(item)" /></UTooltip><UTooltip :text="item.isActive ? '隐藏' : '显示'"><UButton size="xs" color="neutral" variant="ghost" :icon="item.isActive ? 'i-lucide-eye-off' : 'i-lucide-eye'" :aria-label="item.isActive ? '隐藏' : '显示'" @click="toggle(item)" /></UTooltip><UTooltip text="删除"><UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="删除" @click="remove(item)" /></UTooltip></div>
          </div>
        </div>
      </UCard>
    </div>
    <UEmpty v-else icon="i-lucide-images" title="没有符合条件的图片" description="调整筛选条件或导入新的图片。" />

    <UModal v-model:open="open" title="画廊项">
      <template #body><UForm :state="form" class="space-y-4" @submit="save"><UFormField label="图片地址"><UInput v-model="form.imageUrl" class="w-full" /></UFormField><UFormField label="素材类型"><USelect v-model="form.tag" :items="tagOptions" class="w-full" /></UFormField><UFormField v-if="editing" label="展示时间（UTC+8）"><UInput v-model="form.createdAt" type="datetime-local" class="w-full" /></UFormField><UFormField label="排序"><UInput v-model.number="form.sortOrder" type="number" class="w-full" /></UFormField><UCheckbox v-model="form.isActive" label="公开显示" /><UButton type="submit" block>保存</UButton></UForm></template>
    </UModal>
    <UModal v-model:open="batchUpdateOpen" title="批量修改图片">
      <template #body>
        <UForm :state="batchUpdate" class="space-y-5" @submit="saveBatchUpdate">
          <p class="text-sm text-muted">将修改已选的 {{ selectedIds.length }} 张图片。</p>
          <div class="space-y-3 rounded-md border border-default p-3">
            <UCheckbox v-model="batchUpdate.changeTag" label="修改图片类别" />
            <USelect v-model="batchUpdate.tag" :items="tagOptions" class="w-full" :disabled="!batchUpdate.changeTag" />
          </div>
          <div class="space-y-3 rounded-md border border-default p-3">
            <UCheckbox v-model="batchUpdate.changeCreatedAt" label="修改展示时间（UTC+8）" />
            <UInput v-model="batchUpdate.createdAt" type="datetime-local" class="w-full" :disabled="!batchUpdate.changeCreatedAt" />
          </div>
          <div class="flex justify-end gap-2"><UButton color="neutral" variant="ghost" @click="batchUpdateOpen = false">取消</UButton><UButton type="submit" icon="i-lucide-save">保存修改</UButton></div>
        </UForm>
      </template>
    </UModal>
    <UModal v-model:open="importOpen" title="批量导入图片"><template #body><UForm :state="batch" class="space-y-4" @submit="importBatch"><UFormField label="每行一个图片地址"><UTextarea v-model="batch.imageUrls" :rows="8" class="w-full" /></UFormField><UFormField label="素材类型"><USelect v-model="batch.tag" :items="tagOptions" class="w-full" /></UFormField><UCheckbox v-model="batch.isActive" label="导入后公开显示" /><UButton type="submit" block icon="i-lucide-import">导入图片</UButton></UForm></template></UModal>
  </div>
</template>

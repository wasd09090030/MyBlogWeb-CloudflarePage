<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })

type FileItem = { name: string; url?: string; metadata?: Record<string, string> }
type Listing = { files: FileItem[]; directories: string[]; domain: string; totalCount: number }

const api = useAdminApi()
const toast = useToast()
const configOpen = ref(false)
const previewOpen = ref(false)
const preview = ref('')
const selected = ref<string[]>([])
const directory = ref('')
const search = ref('')
const config = reactive({ domain: '', uploadFolder: '' })

const { data: settings, refresh: refreshSettings } = await useAsyncData('imagebed-config', () => api.get<{ domain: string; uploadFolder: string; configured: boolean }>('imagebed/config'))
const emptyListing: Listing = { files: [], directories: [], domain: '', totalCount: 0 }
const { data: listing, refresh, status } = await useAsyncData<Listing>(
  'imagebed-files',
  () => settings.value?.configured
    ? api.get(`imagebed/files?dir=${encodeURIComponent(directory.value)}&search=${encodeURIComponent(search.value)}&count=50`)
    : Promise.resolve(emptyListing),
  { watch: [directory, search, () => settings.value?.configured] }
)

const pathParts = computed(() => directory.value.split('/').filter(Boolean))
function fileUrl(file: FileItem) { return file.url || `${listing.value?.domain.replace(/\/$/, '')}/file/${encodeURI(file.name)}` }
async function copy(url: string) { await navigator.clipboard.writeText(url); toast.add({ title: '链接已复制', color: 'success' }) }
function openDirectory(value: string) { directory.value = value.replace(/^\/+|\/+$/g, '') }
function goCrumb(index: number) { directory.value = pathParts.value.slice(0, index + 1).join('/') }
async function saveConfig() { await api.post('imagebed/config', config); configOpen.value = false; toast.add({ title: '图床配置已保存', color: 'success' }); await refreshSettings(); await refresh() }
async function upload(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; const data = new FormData(); data.append('file', file); await $fetch('/admin/api/imagebed/upload', { method: 'POST', body: data, credentials: 'include' }); toast.add({ title: '上传完成', color: 'success' }); await refresh() }
async function remove(name: string) { if (!confirm(`删除 ${name}？`)) return; await api.post(`imagebed/delete/${encodeURIComponent(name)}`); selected.value = selected.value.filter(value => value !== name); await refresh() }
async function deleteSelected() { if (!selected.value.length || !confirm(`删除选中的 ${selected.value.length} 个文件？`)) return; const result = await api.post<{ deleted: number; failed: number }>('imagebed/bulk-delete', { files: selected.value }); toast.add({ title: `已删除 ${result.deleted} 个文件${result.failed ? `，${result.failed} 个失败` : ''}`, color: result.failed ? 'warning' : 'success' }); selected.value = []; await refresh() }
watch(settings, value => { if (value) { config.domain = value.domain || ''; config.uploadFolder = value.uploadFolder || '' } }, { immediate: true })
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><p class="text-sm text-muted">资产管理</p><h2 class="text-2xl font-semibold">图床</h2></div>
      <div class="flex gap-2"><label><input class="hidden" type="file" accept="image/*" @change="upload" /><UButton as="span" icon="i-lucide-upload">上传图片</UButton></label><UButton color="neutral" variant="soft" icon="i-lucide-settings" @click="configOpen = true">配置</UButton></div>
    </div>
    <UAlert v-if="!settings?.configured" color="warning" title="图床尚未就绪" description="请确认图床域名已保存，并已在 blog-api Worker 配置图床 API。" />
    <div class="flex flex-wrap items-center gap-3"><UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" :disabled="!directory" @click="openDirectory(pathParts.slice(0, -1).join('/'))" /><UBreadcrumb :items="[{ label: '根目录', onSelect: () => openDirectory('') }, ...pathParts.map((part, index) => ({ label: part, onSelect: () => goCrumb(index) }))]" /><UInput v-model="search" icon="i-lucide-search" placeholder="搜索文件" class="ms-auto w-56" /></div>
    <div class="flex items-center justify-between"><span class="text-sm text-muted">{{ listing?.totalCount || 0 }} 个资源</span><UButton v-if="selected.length" color="error" variant="soft" icon="i-lucide-trash-2" @click="deleteSelected">删除 {{ selected.length }} 项</UButton></div>
    <div v-if="status === 'pending'" class="grid place-items-center py-16"><USkeleton class="h-32 w-full" /></div>
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UCard v-for="folder in listing?.directories || []" :key="folder" class="cursor-pointer transition hover:border-primary" @click="openDirectory(folder)"><div class="flex items-center gap-3"><UIcon name="i-lucide-folder" class="size-8 text-primary" /><span class="truncate">{{ folder.split('/').pop() }}</span></div></UCard>
      <UCard v-for="file in listing?.files || []" :key="file.name" :ui="{ body: 'p-0' }"><img :src="fileUrl(file)" :alt="file.name" class="aspect-square w-full cursor-zoom-in object-cover" @click="preview = fileUrl(file); previewOpen = true" /><div class="flex items-center gap-2 p-3"><UCheckbox :model-value="selected.includes(file.name)" @update:model-value="value => selected = value ? [...selected, file.name] : selected.filter(item => item !== file.name)" /><span class="min-w-0 flex-1 truncate text-sm">{{ file.name.split('/').pop() }}</span><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-copy" aria-label="复制链接" @click="copy(fileUrl(file))" /><UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="删除" @click="remove(file.name)" /></div></UCard>
    </div>
    <UEmpty v-if="status !== 'pending' && !(listing?.files.length || listing?.directories.length)" title="当前目录为空" />
    <UModal v-model:open="configOpen" title="图床配置"><template #body><UForm :state="config" class="space-y-4" @submit="saveConfig"><UFormField label="图床域名"><UInput v-model="config.domain" class="w-full" placeholder="https://images.example.com" /></UFormField><UFormField label="上传目录"><UInput v-model="config.uploadFolder" class="w-full" /></UFormField><UButton type="submit" block>保存配置</UButton></UForm></template></UModal>
    <UModal v-model:open="previewOpen" title="图片预览"><template #body><img :src="preview" alt="预览" class="max-h-[70vh] w-full object-contain" /></template></UModal>
  </div>
</template>

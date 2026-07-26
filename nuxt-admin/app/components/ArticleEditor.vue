<script setup lang="ts">
import type { Article } from '~/types/admin'
import { markdownCommands, mdcTemplates, type MarkdownCommand } from '~/composables/useMarkdownTemplates'

const props = defineProps<{ article?: Article }>()
const api = useAdminApi()
const toast = useToast()
const router = useRouter()
const editor = ref<{
  wrapSelection: (before: string, after: string, placeholder: string) => void
  toggleLinePrefix: (prefix: string) => void
  insertBlock: (text: string, caretOffset?: number) => void
  undo: () => void
  redo: () => void
}>()
const mode = ref<'source' | 'split' | 'preview'>('split')
const fullscreen = ref(false)
const saving = ref(false)
const aiPending = ref(false)
const restoreOpen = ref(false)
const imageOpen = ref(false)
const imageUrl = ref('')
const imageUploading = ref(false)
const draftSavedAt = ref<number>()
const coverPreviewError = ref(false)
const form = reactive({ title: props.article?.title || '', slug: props.article?.slug || '', category: props.article?.category || 'study', coverImage: props.article?.coverImage || '', tags: props.article?.tags || [], contentMarkdown: props.article?.contentMarkdown || props.article?.content || '', aiSummary: props.article?.aiSummary || '' })
const suggestedTags = ['技术', '教程', '游戏', '资源', '心得', '随笔']
const isEdit = computed(() => Boolean(props.article?.id))
const draftKey = computed(() => `admin-markdown-draft:${props.article?.id || 'new'}`)
const stats = computed(() => ({ characters: form.contentMarkdown.length, words: form.contentMarkdown.trim() ? form.contentMarkdown.trim().split(/\s+/).length : 0, headings: (form.contentMarkdown.match(/^#{1,6}\s/gm) || []).length }))
let draftTimer: ReturnType<typeof setTimeout> | undefined

function runMarkdownCommand(command: MarkdownCommand) {
  if (command.type === 'wrap') editor.value?.wrapSelection(command.before || '', command.after || '', command.placeholder || '')
  else if (command.type === 'prefix') editor.value?.toggleLinePrefix(command.value || '')
  else editor.value?.insertBlock(command.value || '', command.caretOffset)
}
function insertMdcTemplate(text: string) { editor.value?.insertBlock(text) }
function toggleTag(tag: string) {
  const index = form.tags.indexOf(tag)
  if (index === -1) form.tags = [...form.tags, tag]
  else form.tags = form.tags.filter(item => item !== tag)
}
function saveDraft() {
  if (!import.meta.client) return
  try { localStorage.setItem(draftKey.value, JSON.stringify({ savedAt: Date.now(), form: { ...form } })); draftSavedAt.value = Date.now() } catch { toast.add({ title: 'Draft storage is unavailable', color: 'warning' }) }
}
function discardDraft() { if (import.meta.client) localStorage.removeItem(draftKey.value); draftSavedAt.value = undefined; restoreOpen.value = false }
function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(draftKey.value) || '{}')
    if (draft.form) Object.assign(form, draft.form)
    draftSavedAt.value = draft.savedAt
  } finally { restoreOpen.value = false }
}
function checkDraft() {
  if (!import.meta.client) return
  try { const draft = JSON.parse(localStorage.getItem(draftKey.value) || '{}'); if (draft.savedAt && Date.now() - draft.savedAt < 14 * 24 * 60 * 60 * 1000) restoreOpen.value = true; else if (draft.savedAt) discardDraft() } catch { discardDraft() }
}
async function aiSummary() { aiPending.value = true; try { const result = await api.post<{ summary: string, slug: string }>('ai/summary', { title: form.title, content: form.contentMarkdown }); form.aiSummary = result.summary; form.slug = result.slug } catch { toast.add({ title: 'AI summary failed', color: 'error' }) } finally { aiPending.value = false } }
async function save() {
  if (!form.title.trim() || !form.contentMarkdown.trim()) { toast.add({ title: 'Title and content are required', color: 'warning' }); return }
  saving.value = true
  try {
    const payload = { ...form, content: form.contentMarkdown }
    if (isEdit.value) await api.put(`articles/${props.article!.id}`, payload); else await api.post('articles', payload)
    discardDraft()
    toast.add({ title: 'Article saved', color: 'success' })
    await router.push('/admin/articles')
  } catch (error: any) { toast.add({ title: error?.data?.statusMessage || 'Save failed', color: 'error' }) } finally { saving.value = false }
}
function insertImageUrl() { if (imageUrl.value.trim()) editor.value?.insertBlock(`![Image](${imageUrl.value.trim()})`); imageUrl.value = ''; imageOpen.value = false }
async function uploadImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageUploading.value = true
  try { const body = new FormData(); body.append('file', file); const result: any = await $fetch('/admin/api/imagebed/upload', { method: 'POST', body, credentials: 'include' }); const url = Array.isArray(result) ? result[0]?.src : result?.src; if (!url) throw new Error(); editor.value?.insertBlock(`![${file.name}](${url})`); toast.add({ title: 'Image inserted', color: 'success' }) } catch { toast.add({ title: 'Image upload requires a configured imagebed', color: 'warning' }) } finally { imageUploading.value = false }
}
onMounted(() => { checkDraft(); window.addEventListener('beforeunload', saveDraft) })
onBeforeUnmount(() => { window.removeEventListener('beforeunload', saveDraft); if (draftTimer) clearTimeout(draftTimer) })
watch(form, () => { if (!import.meta.client) return; if (draftTimer) clearTimeout(draftTimer); draftTimer = setTimeout(saveDraft, 800) }, { deep: true })
watch(() => form.coverImage, () => { coverPreviewError.value = false })
</script>

<template>
  <div :class="['space-y-5', { 'fixed inset-0 z-50 overflow-auto bg-default p-5': fullscreen }]">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div><p class="text-sm text-muted">Content authoring</p><h2 class="text-2xl font-semibold">{{ isEdit ? '编辑文章' : '新建文章' }}</h2></div>
      <div class="flex items-center gap-2"><UButton to="/admin/articles" color="neutral" variant="ghost" icon="i-lucide-arrow-left" aria-label="返回文章列表" /><UButton color="neutral" variant="soft" :loading="saving" icon="i-lucide-save" @click="save">保存</UButton></div>
    </div>
    <div class="flex flex-wrap items-center gap-2 border-y border-default py-2">
      <span class="text-xs font-medium text-muted">Markdown</span>
      <UTooltip v-for="item in markdownCommands" :key="item.label" :text="item.label"><UButton size="xs" color="neutral" variant="ghost" :icon="item.icon" :aria-label="item.label" @click="runMarkdownCommand(item)" /></UTooltip>
      <USeparator orientation="vertical" class="h-6" />
      <UTooltip text="Undo"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-undo-2" aria-label="Undo" @click="editor?.undo()" /></UTooltip>
      <UTooltip text="Redo"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-redo-2" aria-label="Redo" @click="editor?.redo()" /></UTooltip>
      <UTooltip text="Insert image"><UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-image-plus" aria-label="Insert image" @click="imageOpen = true" /></UTooltip>
      <UTooltip :text="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"><UButton size="xs" color="neutral" variant="ghost" :icon="fullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" :aria-label="fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'" @click="fullscreen = !fullscreen" /></UTooltip>
      <div class="ms-auto flex gap-1"><UButton v-for="item in [{ value: 'source', label: '源码' }, { value: 'split', label: '分屏' }, { value: 'preview', label: '预览' }]" :key="item.value" size="xs" :color="mode === item.value ? 'primary' : 'neutral'" :variant="mode === item.value ? 'solid' : 'ghost'" @click="mode = item.value as typeof mode">{{ item.label }}</UButton></div>
    </div>
    <div class="flex flex-wrap items-center gap-2 border-b border-default pb-2">
      <span class="text-xs font-medium text-muted">MDC 组件</span>
      <UTooltip v-for="item in mdcTemplates" :key="item.label" :text="item.label"><UButton size="xs" color="neutral" variant="soft" :icon="item.icon" :aria-label="item.label" @click="insertMdcTemplate(item.value)" /></UTooltip>
    </div>
    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div :class="['grid gap-4', mode === 'split' ? 'lg:grid-cols-2' : 'grid-cols-1']">
        <section v-show="mode !== 'preview'"><MarkdownSourceEditor ref="editor" v-model="form.contentMarkdown" /></section>
        <section v-show="mode !== 'source'"><AdminMarkdownPreview :markdown="form.contentMarkdown" /></section>
      </div>
      <UCard class="h-fit xl:sticky xl:top-20"><div class="space-y-4"><UFormField label="标题" required><UInput v-model="form.title" class="w-full" /></UFormField><UFormField label="Slug"><UInput v-model="form.slug" class="w-full" /></UFormField><UFormField label="分类"><USelect v-model="form.category" :items="['study', 'game', 'work', 'resource', 'other']" class="w-full" /></UFormField><UFormField label="封面图"><UInput v-model="form.coverImage" class="w-full" placeholder="https://..." /></UFormField><div class="overflow-hidden rounded-md border border-default bg-elevated"><img v-if="form.coverImage && !coverPreviewError" :src="form.coverImage" alt="文章封面预览" class="aspect-video w-full object-cover" @error="coverPreviewError = true" /><div v-else class="grid aspect-video place-items-center p-4 text-center text-sm text-muted"><div><UIcon :name="coverPreviewError ? 'i-lucide-image-off' : 'i-lucide-image'" class="mx-auto mb-2 size-6" /><p>{{ coverPreviewError ? '封面地址无法加载' : '输入封面地址后在此预览' }}</p></div></div></div><UFormField label="标签" help="输入后按 Enter、Tab 或离开输入框即可添加；可直接粘贴逗号分隔的多个标签。"><UInputTags v-model="form.tags" class="w-full" placeholder="输入标签" add-on-tab add-on-blur add-on-paste separator="," /></UFormField><div class="flex flex-wrap gap-1"><UButton v-for="tag in suggestedTags" :key="tag" size="xs" :color="form.tags.includes(tag) ? 'primary' : 'neutral'" :variant="form.tags.includes(tag) ? 'soft' : 'ghost'" @click="toggleTag(tag)">{{ tag }}</UButton></div><UFormField label="AI 摘要"><UTextarea v-model="form.aiSummary" :rows="4" class="w-full" /></UFormField><UButton block variant="soft" :loading="aiPending" icon="i-lucide-sparkles" @click="aiSummary">生成 AI 摘要</UButton><USeparator /><p class="text-sm text-muted">{{ stats.characters }} 字符 · {{ stats.words }} 词 · {{ stats.headings }} 标题</p><p v-if="draftSavedAt" class="text-xs text-muted">草稿已保存</p></div></UCard>
    </div>
    <UModal v-model:open="restoreOpen" title="恢复本地草稿"><template #body>发现一个未过期的本地草稿。恢复会覆盖当前表单内容。</template><template #footer><div class="flex justify-end gap-2"><UButton color="neutral" variant="ghost" @click="discardDraft">丢弃</UButton><UButton @click="restoreDraft">恢复草稿</UButton></div></template></UModal>
    <UModal v-model:open="imageOpen" title="插入图片"><template #body><div class="space-y-4"><UInput v-model="imageUrl" placeholder="https://example.com/image.jpg" class="w-full" /><label class="block"><input class="hidden" type="file" accept="image/*" @change="uploadImage" /><UButton as="span" variant="soft" icon="i-lucide-upload" :loading="imageUploading">上传到图床</UButton></label></div></template><template #footer><UButton @click="insertImageUrl">插入 URL</UButton></template></UModal>
  </div>
</template>

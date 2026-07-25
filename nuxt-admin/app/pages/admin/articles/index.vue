<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { Article } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })
const api = useAdminApi()
const toast = useToast()
const query = ref('')
const page = ref(1)
const pageSize = 10
const { data: articles, refresh, status } = await useAsyncData('admin-articles', () => api.get<Article[]>('articles'))
const filtered = computed(() => (articles.value || []).filter(article => article.title.toLowerCase().includes(query.value.toLowerCase())))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch(query, () => { page.value = 1 })
watch(pageCount, (count) => { if (page.value > count) page.value = count })
async function remove(article: Article) {
  if (!confirm(`删除“${article.title}”？`)) return
  await api.del(`articles/${article.id}`)
  toast.add({ title: '文章已删除', color: 'success' })
  await refresh()
}
const columns = [
  { accessorKey: 'title', header: '标题' },
  { accessorKey: 'category', header: '分类' },
  { accessorKey: 'updatedAt', header: '更新时间', cell: ({ row }: any) => row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleDateString('zh-CN') : '-' },
  { id: 'actions', header: '', cell: ({ row }: any) => h('div', { class: 'flex justify-end gap-1' }, [h(resolveComponent('UButton'), { to: `/admin/articles/${row.original.id}`, icon: 'i-lucide-pencil', color: 'neutral', variant: 'ghost', 'aria-label': '编辑' }), h(resolveComponent('UButton'), { icon: 'i-lucide-trash-2', color: 'error', variant: 'ghost', 'aria-label': '删除', onClick: () => remove(row.original) })]) }
]
</script>

<template><div class="space-y-5"><div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-sm text-muted">内容库</p><h2 class="text-2xl font-semibold">文章</h2></div><UButton to="/admin/articles/create" icon="i-lucide-plus">新建文章</UButton></div><UInput v-model="query" icon="i-lucide-search" placeholder="搜索标题" class="max-w-md" /><UCard :ui="{ body: 'p-0 sm:p-0' }"><UTable :loading="status === 'pending'" :data="rows" :columns="columns" /><template #footer><div class="flex flex-wrap items-center justify-between gap-3"><span class="text-sm text-muted">共 {{ filtered.length }} 篇</span><UPagination v-model:page="page" :total="filtered.length" :items-per-page="pageSize" /></div></template></UCard></div></template>

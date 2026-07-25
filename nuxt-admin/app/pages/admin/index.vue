<script setup lang="ts">
import type { Article, Comment } from '~/types/admin'
definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })
const api = useAdminApi()
const { data: overview } = await useAsyncData('admin-overview', async () => {
  const [articles, comments] = await Promise.all([api.get<Article[]>('articles'), api.get<Comment[]>('comments/admin/all')])
  return { articles: Array.isArray(articles) ? articles : [], comments: Array.isArray(comments) ? comments : [] }
})
const cards = computed(() => [
  { label: '文章', value: overview.value?.articles.length || 0, icon: 'i-lucide-file-text', to: '/admin/articles' },
  { label: '待审核评论', value: overview.value?.comments.filter(comment => comment.status === 'pending').length || 0, icon: 'i-lucide-message-circle-warning', to: '/admin/comments' },
  { label: '全部评论', value: overview.value?.comments.length || 0, icon: 'i-lucide-messages-square', to: '/admin/comments' }
])
</script>
<template><div class="space-y-8"><div><p class="text-sm text-muted">运行概览</p><h2 class="mt-1 text-2xl font-semibold">内容工作台</h2></div><div class="grid gap-4 md:grid-cols-3"><NuxtLink v-for="card in cards" :key="card.label" :to="card.to"><UCard class="transition hover:border-primary"><div class="flex items-center justify-between"><div><p class="text-sm text-muted">{{ card.label }}</p><p class="mt-2 text-3xl font-semibold">{{ card.value }}</p></div><UIcon :name="card.icon" class="size-6 text-primary" /></div></UCard></NuxtLink></div></div></template>

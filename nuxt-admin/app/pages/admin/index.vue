<script setup lang="ts">
import type { Article, Comment } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })

const api = useAdminApi()
const toast = useToast()
const rebuildOpen = ref(false)
const rebuilding = ref(false)
// 不使用 await：让工作台外壳先渲染，统计数据异步填充，避免两个 API 请求阻塞页面显示
const { data: overview, status } = useAsyncData('admin-overview', async () => {
  const [articles, comments] = await Promise.all([api.get<Article[]>('articles'), api.get<Comment[]>('comments/admin/all')])
  return { articles: Array.isArray(articles) ? articles : [], comments: Array.isArray(comments) ? comments : [] }
})
const cards = computed(() => [
  { label: '文章', value: overview.value?.articles.length || 0, icon: 'i-lucide-file-text', to: '/admin/articles' },
  { label: '待审核评论', value: overview.value?.comments.filter(comment => comment.status === 'pending').length || 0, icon: 'i-lucide-message-circle-warning', to: '/admin/comments' },
  { label: '全部评论', value: overview.value?.comments.length || 0, icon: 'i-lucide-messages-square', to: '/admin/comments' }
])

async function rebuildPublicSite() {
  rebuilding.value = true
  try {
    const result = await api.post<{ success: boolean, message: string }>('ops/pages/deploy-hook', {})
    toast.add({ title: result.message || '已触发 Cloudflare Pages 重构发布', color: 'success' })
    rebuildOpen.value = false
  } catch (error: any) {
    toast.add({ title: error?.data?.message || error?.data?.statusMessage || '触发重构失败，请检查 Deploy Hook 配置', color: 'error' })
  } finally {
    rebuilding.value = false
  }
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-end justify-between gap-3"><div><p class="text-sm text-muted">运行概览</p><h2 class="mt-1 text-2xl font-semibold">内容工作台</h2></div><UButton color="neutral" variant="soft" icon="i-lucide-cloud-upload" @click="rebuildOpen = true">重构 nuxt-public</UButton></div>
    <div class="grid gap-4 md:grid-cols-3"><NuxtLink v-for="card in cards" :key="card.label" :to="card.to"><UCard class="transition hover:border-primary"><div class="flex items-center justify-between"><div><p class="text-sm text-muted">{{ card.label }}</p><USkeleton v-if="status === 'pending'" class="mt-2 h-8 w-14" /><p v-else class="mt-2 text-3xl font-semibold">{{ status === 'error' ? '—' : card.value }}</p></div><UIcon :name="card.icon" class="size-6 text-primary" /></div></UCard></NuxtLink></div>
    <UCard :ui="{ body: 'p-4 sm:p-4' }"><div class="flex flex-wrap items-center justify-between gap-3"><div><p class="font-medium">Cloudflare Pages</p><p class="mt-1 text-sm text-muted">在文章、画廊或公开内容更新后，重新生成并部署 `nuxt-public` 静态站。</p></div><UButton color="neutral" variant="outline" icon="i-lucide-refresh-cw" @click="rebuildOpen = true">触发重构</UButton></div></UCard>
    <UModal v-model:open="rebuildOpen" title="重构 nuxt-public"><template #body>将向 Cloudflare Pages Deploy Hook 发起一次构建请求。静态站会重新生成并发布，通常需要几分钟。</template><template #footer><div class="flex justify-end gap-2"><UButton color="neutral" variant="ghost" :disabled="rebuilding" @click="rebuildOpen = false">取消</UButton><UButton :loading="rebuilding" icon="i-lucide-cloud-upload" @click="rebuildPublicSite">确认触发</UButton></div></template></UModal>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/admin'
definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
const api = useAdminApi(); const route = useRoute()
const { data: article, status, error } = useLazyAsyncData(`admin-article-${route.params.id}`, () => api.get<Article>(`articles/${route.params.id}`))
</script>

<template>
  <div v-if="status === 'pending' || status === 'idle'" class="space-y-4 p-6">
    <USkeleton class="mb-4 h-10 w-1/2" />
    <USkeleton class="h-96 w-full" />
  </div>
  <UAlert v-else-if="error" color="error" title="文章加载失败" :description="error.message" />
  <ArticleEditor v-else-if="article" :article="article" />
</template>

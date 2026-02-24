<template>
  <aside 
    v-if="article"
    class="hidden lg:block w-72 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 rounded-r-xl"
  >
    <div class="sticky top-16 p-4 h-[calc(100vh-4rem)] overflow-y-auto">
      <!-- 目录加载中骨架屏 -->
      <div v-if="headings.length === 0 && pending" class="animate-pulse space-y-3">
        <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div class="space-y-2 px-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5 ml-4"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/5"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 ml-4"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
      <!-- 实际目录 -->
      <ArticleDetailToc v-else-if="headings.length > 0" :headings="headings" />
      <!-- 无目录提示 -->
      <div v-else class="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
        <Icon name="list-ul" size="lg" class="mb-2 opacity-50" />
        <p>暂无目录</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import ArticleDetailToc from '~/features/article-detail/components/Toc.vue'

defineProps({
  article: {
    type: Object,
    required: true
  },
  headings: {
    type: Array,
    default: () => []
  },
  pending: {
    type: Boolean,
    default: false
  }
})
</script>

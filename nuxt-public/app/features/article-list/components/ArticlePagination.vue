<template>
  <div v-if="totalPages > 1" class="pagination-container">
    <UPagination
      v-model:page="currentPageLocal"
      :total="totalPages"
      :items-per-page="1"
      :show-controls="false"
      show-edges
    />
    <div class="pagination-summary">
      共 {{ totalCount }} 篇文章，当前 {{ currentPageLocal }} / {{ totalPages }} 页
    </div>
  </div>
</template>

<script setup>
/**
 * ArticlePagination
 *
 * 基于 Nuxt UI v4 UPagination 的分页组件，对外 API 保持不变：
 *   props: currentPage / totalPages / totalCount / articlesPerPage
 *   emit:  update:page
 *
 * UPagination 用 total/itemsPerPage 推导总页数；这里以容器传入的
 * totalPages 为准（totalPages:itemsPerPage = 1:1），保证页数与摘要一致。
 * 分页控件本体完全交给 UPagination（含首/末页与省略号），不再添加自定义
 * 分页样式；外层仅保留居中容器与计数摘要文本。
 */
const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  totalCount: {
    type: Number,
    required: true
  },
  // 保留以兼容调用方；UPagination 以 totalPages 直接推导页数，不再使用该值。
  articlesPerPage: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:page'])

const currentPageLocal = computed({
  get: () => props.currentPage,
  set: (page) => {
    if (page < 1 || page > props.totalPages || page === props.currentPage) return
    emit('update:page', page)
  }
})
</script>

<style scoped>
.pagination-container {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.pagination-summary {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
}
</style>

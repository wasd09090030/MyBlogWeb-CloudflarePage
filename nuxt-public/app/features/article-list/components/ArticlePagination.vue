<template>
  <div v-if="totalPages > 1" class="pagination-container">
    <nav class="article-pagination" aria-label="文章分页">
      <button
        type="button"
        class="pagination-edge-btn"
        :disabled="currentPageLocal <= 1"
        aria-label="首页"
        @click="goTo(1)"
      >
        <Icon name="heroicons:chevron-double-left" size="sm" />
      </button>
      <button
        type="button"
        class="pagination-edge-btn"
        :disabled="currentPageLocal <= 1"
        aria-label="上一页"
        @click="goTo(currentPageLocal - 1)"
      >
        <Icon name="heroicons:chevron-left" size="sm" />
      </button>

      <ul class="pagination-list">
        <li v-for="(item, idx) in pageNumbers" :key="`${item}-${idx}`">
          <span v-if="item === '...'" class="pagination-ellipsis" aria-hidden="true">···</span>
          <button
            v-else
            type="button"
            class="pagination-item"
            :class="{ active: item === currentPageLocal }"
            :aria-current="item === currentPageLocal ? 'page' : undefined"
            :aria-label="`第 ${item} 页`"
            @click="goTo(item)"
          >
            {{ item }}
          </button>
        </li>
      </ul>

      <button
        type="button"
        class="pagination-edge-btn"
        :disabled="currentPageLocal >= totalPages"
        aria-label="下一页"
        @click="goTo(currentPageLocal + 1)"
      >
        <Icon name="heroicons:chevron-right" size="sm" />
      </button>
      <button
        type="button"
        class="pagination-edge-btn"
        :disabled="currentPageLocal >= totalPages"
        aria-label="末页"
        @click="goTo(totalPages)"
      >
        <Icon name="heroicons:chevron-double-right" size="sm" />
      </button>
    </nav>

    <div class="pagination-summary">
      共 {{ totalCount }} 篇文章，当前 {{ currentPageLocal }} / {{ totalPages }} 页
    </div>
  </div>
</template>

<script setup>
/**
 * ArticlePagination
 *
 * 独立设计的分页组件（不依赖 UPagination 主题），对外 API 保持不变：
 *   props: currentPage / totalPages / totalCount
 *   emit:  update:page
 *
 * 视觉上复用文章列表页已有的配色令牌（--article-active-gradient /
 * --article-category-hover-bg 等），而非分页专属色，以与分类栏、视图切换按钮统一。
 */
import { buildPageNumbers } from '~/features/article-list/utils/pagination'

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
  articlesPerPage: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:page'])

const currentPageLocal = ref(props.currentPage)

watch(
  () => props.currentPage,
  (newVal) => {
    if (typeof newVal === 'number' && newVal !== currentPageLocal.value) {
      currentPageLocal.value = newVal
    }
  }
)

const pageNumbers = computed(() => buildPageNumbers(props.totalPages, currentPageLocal.value))

const goTo = (page) => {
  if (page < 1 || page > props.totalPages || page === currentPageLocal.value) return
  currentPageLocal.value = page
  emit('update:page', page)
}
</script>

<style scoped>
.pagination-container {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.article-pagination {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
}

.pagination-list {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagination-edge-btn,
.pagination-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0 0.5rem;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-edge-btn:hover:not(:disabled),
.pagination-item:hover:not(.active) {
  background: var(--article-category-hover-bg);
  border-color: var(--article-category-hover-border);
  color: var(--accent-primary);
}

.pagination-edge-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pagination-item.active {
  background: var(--article-active-gradient);
  border-color: transparent;
  color: var(--text-inverse);
  font-weight: 600;
}

.pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  color: var(--text-tertiary);
  user-select: none;
}

.pagination-summary {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
}

@media (max-width: 576px) {
  .article-pagination {
    gap: 0.25rem;
    padding: 0.25rem;
  }

  .pagination-edge-btn,
  .pagination-item,
  .pagination-ellipsis {
    min-width: 34px;
    height: 34px;
    font-size: 0.85rem;
  }
}
</style>

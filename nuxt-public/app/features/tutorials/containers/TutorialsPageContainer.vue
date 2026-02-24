<template>
  <div class="tutorials-page min-vh-100">
    <div class="page-hero">
      <div class="container-fluid">
        <div class="tags-container">
          <button
            v-for="(tag, index) in availableTags"
            :key="tag"
            class="filter-chip chip-animate"
            :class="{ active: selectedTag === tag }"
            :style="{ animationDelay: `${index * 0.03}s` }"
            @click="selectTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
    </div>

    <div class="container-fluid content-container" ref="articleListContainer">
      <n-alert v-if="error" type="error" title="加载失败" class="mb-4 animate-in-fade">
        加载教程文章失败：{{ error.message }}
      </n-alert>

      <StateLoading v-if="loading" message="正在整理教程资源..." />

      <div v-else-if="paginatedArticles.length" class="tutorials-grid">
        <TransitionGroup name="list-stagger">
          <NuxtLink
            v-for="(article, index) in paginatedArticles"
            :key="article.id"
            :to="getArticlePath(article)"
            class="tutorial-card glass-panel"
            :style="{ '--delay': `${index * 0.05}s` }"
          >
            <div class="card-image-wrapper">
              <img
                v-if="article.coverImage && article.coverImage !== 'null'"
                :src="article.coverImage"
                :alt="article.title"
                class="card-img"
                loading="lazy"
                @error="handleImageError"
              />
              <div v-else class="image-placeholder gradient-soft">
                <Icon name="journal-code" size="3xl" class="opacity-50" />
              </div>

              <div class="image-overlay">
                <span class="read-btn">
                  开始学习 <Icon name="arrow-right" size="sm" />
                </span>
              </div>
            </div>

            <div class="card-content">
              <div class="card-meta">
                <span class="date">
                  <Icon name="calendar3" size="xs" class="me-1" />
                  {{ formatDate(article.createdAt) }}
                </span>
                <div v-if="article.tags && article.tags.length" class="tags-mini">
                  <span v-for="tag in article.tags.slice(0, 2)" :key="tag" class="tag-dot">#{{ tag }}</span>
                </div>
              </div>

              <h3 class="card-title" :title="article.title">{{ article.title }}</h3>

              <p class="card-excerpt">{{ getExcerpt(article.content, 100) }}</p>
            </div>
          </NuxtLink>
        </TransitionGroup>
      </div>

      <n-empty v-else description="暂无符合条件的教程" class="my-5 animate-in-fade">
        <template #icon>
          <Icon name="journal-x" size="4xl" />
        </template>
        <template #extra>
          <button class="btn-reset" @click="resetFilters">重置筛选</button>
        </template>
      </n-empty>

      <div v-if="totalPages > 1" class="pagination-wrapper animate-in-up delay-3">
        <n-pagination
          v-model:page="currentPage"
          :page-count="totalPages"
          :page-slot="5"
          size="medium"
          @update:page="handleScrollToTop"
        />
        <div class="pagination-info">
          第 {{ currentPage }} 页 / 共 {{ totalPages }} 页
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getExcerpt } from '~/utils/excerpt'
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'
import { formatDate, getArticlePath } from '~/features/tutorials/utils/formatters'
import { extractAvailableTags, processArticles } from '~/features/tutorials/utils/filters'
import { scrollToListTop, handleImageError } from '~/features/tutorials/utils/navigation'
import StateLoading from '~/shared/ui/StateLoading.vue'

const articleListContainer = ref(null)
const articles = ref([])
const error = ref(null)
const loading = ref(true)
const { getAllArticles } = useArticlesFeature()

const currentPage = ref(1)
const articlesPerPage = 9
const selectedTag = ref('all')
const sortOrder = ref('desc')

const fetchArticles = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getAllArticles()
    articles.value = data || []
  } catch (e) {
    error.value = e
    console.error('获取教程失败:', e)
  } finally {
    loading.value = false
  }
}

const allTutorialArticles = computed(() => {
  return articles.value.filter(article => {
    if (!article.tags || !Array.isArray(article.tags)) return false
    return article.tags.includes('教程')
  })
})

const availableTags = computed(() => {
  return extractAvailableTags(allTutorialArticles.value, '教程')
})

const processedArticles = computed(() => {
  return processArticles(allTutorialArticles.value, selectedTag.value, sortOrder.value)
})

const totalPages = computed(() => Math.ceil(processedArticles.value.length / articlesPerPage))
const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * articlesPerPage
  return processedArticles.value.slice(start, start + articlesPerPage)
})

const selectTag = (tag) => {
  if (selectedTag.value === tag) {
    selectedTag.value = 'all'
  } else {
    selectedTag.value = tag
  }
  currentPage.value = 1
}

const resetFilters = () => {
  selectedTag.value = 'all'
  sortOrder.value = 'desc'
  currentPage.value = 1
}

const handleScrollToTop = () => {
  scrollToListTop(articleListContainer, 100)
}

onMounted(() => {
  fetchArticles()
})

watch([selectedTag, sortOrder], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1
  }
})

defineExpose({ refreshData: fetchArticles })
</script>

<style scoped>
/* 页面容器 */
.tutorials-page {
  padding-bottom: 4rem;
}

/* Hero Section */
.page-hero {
  padding: 3rem 1rem 2rem;
  display: flex;
  justify-content: center;
  background-color: transparent;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  max-width: 800px;
  margin: 0 auto;
}

.filter-chip {
  padding: 8px 20px;
  border-radius: 50px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  color: #555;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
  transition: all 0.3s ease;
}

.dark-theme .filter-chip {
  background: #2a2a2a;
  color: #aaa;
  border-color: rgba(255, 255, 255, 0.05);
}

.filter-chip:hover {
  color: #000;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.dark-theme .filter-chip:hover {
  color: #fff;
  background: #333;
}

.filter-chip.active {
  background: #000;
  color: #fff;
  border-color: #000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.dark-theme .filter-chip.active {
  background: #fff;
  color: #000;
}

.filter-chip:active {
  transform: scale(0.98);
}

.chip-animate {
  animation: chip-pop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes chip-pop {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .chip-animate {
    animation: none;
  }
}

.btn-reset {
  background: var(--accent-primary);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 2rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: var(--accent-primary-hover, #0b5ed7);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* 列表网格 */
.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  padding: 0 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* 卡片样式 */
.tutorial-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  text-decoration: none;
  background: rgb(255, 255, 255);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 100%;
}

.dark-theme .tutorial-card {
  background: rgba(30, 30, 30, 0.6);
  border-color: rgba(255, 255, 255, 0.05);
}

.tutorial-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.8);
  border-color: var(--accent-primary);
  z-index: 10;
}

.dark-theme .tutorial-card:hover {
  background: rgba(40, 40, 40, 0.8);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.3);
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  overflow: hidden;
}

.card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.tutorial-card:hover .card-img {
  transform: scale(1.08);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(2px);
}

.tutorial-card:hover .image-overlay {
  opacity: 1;
}

.read-btn {
  color: white;
  font-weight: 600;
  padding: 0.5rem 1.2rem;
  border-radius: 2rem;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  transform: translateY(10px);
  transition: transform 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.tutorial-card:hover .read-btn {
  transform: translateY(0);
}

.card-content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.tags-mini {
  display: flex;
  gap: 0.5rem;
}

.tag-dot {
  color: var(--accent-primary);
  font-weight: 500;
  background: color-mix(in srgb, var(--accent-primary), transparent 90%);
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
}

.card-title {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;

}

.card-excerpt {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0;
}

/* 分页 */
.pagination-wrapper {
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pagination-info {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

/* 动画 */
.animate-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  opacity: 0;
  transform: translateY(20px);
}

.animate-in-fade {
  animation: fadeIn 0.6s ease forwards;
  opacity: 0;
}

.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  to { opacity: 1; }
}

/* 列表交错动画 Vue Transition Group */
.list-stagger-enter-active,
.list-stagger-leave-active {
  transition: all 0.4s ease;
  transition-delay: var(--delay);
}
.list-stagger-enter-from,
.list-stagger-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .tutorials-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .tags-container {
    gap: 0.5rem;
  }

  .filter-chip {
    padding: 0.4rem 1rem;
    font-size: 0.9rem;
  }
}
</style>

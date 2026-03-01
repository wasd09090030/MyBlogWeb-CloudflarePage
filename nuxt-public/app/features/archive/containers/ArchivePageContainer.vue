<template>
  <div class="archive-page limit-max-width">
    <div class="archive-body">
      <!-- 左侧 65%：主内容区/时间线 -->
      <div class="archive-main">
        <StateLoading v-if="loading" message="探索记忆坐标中..." class="py-12" />

        <n-alert v-else-if="error" type="error" title="数据读取失败" class="mb-8">
          {{ error.message }}
        </n-alert>

        <template v-else>
          <!-- MD3 风格的筛选气泡 -->
          <div v-if="selectedTag" class="md3-filter-chip">
            <span class="filter-text">包含 <strong>#{{ selectedTag }}</strong> 的快照 ({{ filteredArticles.length }})</span>
            <button class="md3-icon-btn" @click="selectedTag = null" aria-label="清除筛选">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" stroke="currentColor" stroke-width="1.5" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>

          <n-empty
            v-if="timelineGroups.length === 0"
            description="此处空空如也，尚未有记录"
            class="my-16"
          />

          <!-- MD3 极简风格时间线 -->
          <div v-else class="md3-timeline">
            <div v-for="group in timelineGroups" :key="group.month" class="timeline-group">
              <h2 class="timeline-month">{{ group.month }}</h2>
              <div class="timeline-list">
                <NuxtLink
                  v-for="article in group.articles"
                  :key="article.id"
                  :to="getArticlePath(article)"
                  class="timeline-item"
                >
                  <!-- 左侧轨道与互动圆点 -->
                  <div class="timeline-track">
                    <div class="timeline-line"></div>
                    <div class="timeline-dot-wrapper">
                      <div class="timeline-dot"></div>
                    </div>
                  </div>
                  <!-- 右侧卡片内容 -->
                  <div class="timeline-content md3-surface">
                    <h3 class="article-title">{{ article.title }}</h3>
                    <div class="article-meta">
                      <svg class="meta-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/></svg>
                      {{ formatDateShort(article.createdAt) }}
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧 35%：Tag 面板 -->
      <aside class="archive-sidebar">
        <div class="md3-card tag-cloud-panel">
          <div class="panel-header">
            <svg class="panel-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.36-.36.58-.86.58-1.41s-.22-1.06-.58-1.42zM5.5 7A1.5 1.5 0 0 1 4 5.5A1.5 1.5 0 0 1 5.5 4A1.5 1.5 0 0 1 7 5.5A1.5 1.5 0 0 1 5.5 7z"/></svg>
            <span class="panel-title">探索标签</span>
            <span class="panel-count">{{ tagStats.length }}</span>
          </div>

          <ArchiveTagCloud
            :tags="tagStats"
            :selected-tag="selectedTag"
            @update:selected-tag="selectedTag = $event"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'
import { computeTagStats, groupArticlesByMonth } from '~/features/archive/utils/archive'
import { formatDateShort, getArticlePath } from '~/features/archive/utils/formatters'
import StateLoading from '~/shared/ui/StateLoading.vue'
import ArchiveTagCloud from '~/shared/ui/ArchiveTagCloud.vue'

const { getAllArticles } = useArticlesFeature()

const allArticles = ref<any[]>([])
const loading = ref(true)
const error = ref<Error | null>(null)
const selectedTag = ref<string | null>(null)

const fetchArticles = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await getAllArticles()
    allArticles.value = data || []
  } catch (e: any) {
    error.value = e
  } finally {
    loading.value = false
  }
}

const tagStats = computed(() => computeTagStats(allArticles.value))

const filteredArticles = computed(() => {
  if (!selectedTag.value) return allArticles.value
  return allArticles.value.filter(a =>
    Array.isArray(a.tags) && a.tags.includes(selectedTag.value)
  )
})

const timelineGroups = computed(() => groupArticlesByMonth(filteredArticles.value))

onMounted(fetchArticles)
</script>

<style scoped>
:root {
  --md-sys-motion-easing: cubic-bezier(0.2, 0, 0, 1);
}

.archive-page {
  min-height: 100vh;
  padding: 3rem 1.5rem 5rem;
  max-width: 1080px;
  margin: 0 auto;
}

.archive-body {
  display: flex;
  gap: 3.5rem;
  align-items: flex-start;
}

.archive-main {
  flex: 0 0 62%;
  min-width: 0;
}

.archive-sidebar {
  flex: 0 0 calc(38% - 3.5rem);
  position: sticky;
  top: 6rem; /* 根据全局顶部导航高度预留 */
}

/* 筛选气泡 */
.md3-filter-chip {
  display: inline-flex;
  align-items: center;
  background: var(--primary-color-10, rgba(99, 102, 241, 0.08));
  color: var(--primary-color, #6366f1);
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  margin-bottom: 2.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s var(--md-sys-motion-easing);
  animation: chip-pop 0.4s var(--md-sys-motion-easing) forwards;
}

@keyframes chip-pop {
  0% { opacity: 0; transform: translateY(10px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.filter-text strong {
  font-weight: 700;
}

.md3-icon-btn {
  background: transparent;
  border: none;
  color: currentColor;
  margin-left: 0.5rem;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.25s, transform 0.15s;
}

.md3-icon-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  transform: scale(1.1);
}

/* --- 自定义时间线核心样式 --- */
.md3-timeline {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.timeline-group {
  display: flex;
  flex-direction: column;
}

.timeline-month {
  font-size: 1.6rem;
  font-weight: 800;
  margin: 0 0 1.75rem 2.8rem;
  position: relative;
  color: var(--n-text-color, #1e293b);
  letter-spacing: -0.02em;
}

/* 月份标识大圆点（轨道顶端） */
.timeline-month::before {
  content: '';
  position: absolute;
  left: -2.8rem;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--n-card-color, #fff);
  border: 4px solid var(--primary-color, #6366f1);
  box-shadow: 0 0 0 4px var(--primary-color-10, rgba(99, 102, 241, 0.15));
  z-index: 2;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  position: relative;
}

/* 时间线轨道主线 */
.timeline-list::before {
  content: '';
  position: absolute;
  top: -1.75rem;
  bottom: 0;
  left: 6px; /* 中对齐大圆点 (14px/2 - 1) */
  width: 2px;
  background: var(--n-border-color, rgba(0, 0, 0, 0.06));
  z-index: 0;
}

.timeline-item {
  position: relative;
  display: flex;
  text-decoration: none;
  padding-left: 2.8rem;
  outline: none;
}

.timeline-track {
  position: absolute;
  left: 6px;
  top: 0;
  bottom: 0;
  width: 2px;
  z-index: 1;
}

.timeline-dot-wrapper {
  position: absolute;
  top: 1.65rem; /* 对齐卡片视觉中心（首行文本） */
  left: 50%;
  transform: translate(-50%, -50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  transition: background 0.35s var(--md-sys-motion-easing);
}

.timeline-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--n-border-color, rgba(0, 0, 0, 0.15));
  border: 2px solid var(--n-card-color, #fff);
  box-sizing: content-box;
  transition: all 0.35s var(--md-sys-motion-easing);
}

/* 悬浮互动效果 */
.timeline-item:hover .timeline-dot {
  background: var(--primary-color, #6366f1);
  border-color: var(--primary-color, #6366f1);
  transform: scale(1.4);
}

.timeline-item:hover .timeline-dot-wrapper {
  background: var(--primary-color-20, rgba(99, 102, 241, 0.2));
}

.timeline-content {
  flex: 1;
  padding: 1.25rem 1.6rem;
  border-radius: 20px; /* MD3 List Item Shape */
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.35s var(--md-sys-motion-easing);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.timeline-item:hover .timeline-content {
  background: var(--n-card-color, #fff);
  border-color: var(--n-border-color, rgba(0, 0, 0, 0.04));
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.02);
  transform: translateX(6px); /* Mizuki / MD3 的平滑推进感 */
}

.article-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--n-text-color, #2d3748);
  margin: 0;
  line-height: 1.5;
  transition: color 0.35s var(--md-sys-motion-easing);
}

.timeline-item:hover .article-title {
  color: var(--primary-color, #6366f1);
}

.article-meta {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  color: var(--n-text-color-3, #718096);
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.meta-icon {
  margin-right: 0.3rem;
  opacity: 0.8;
}

/* --- 右侧 Tag Cloud 卡片 --- */
.md3-card {
  background: var(--n-card-color, #fff);
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
  border: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.03));
}

.panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
}

.panel-icon {
  color: var(--primary-color, #6366f1);
  margin-right: 0.6rem;
}

.panel-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--n-text-color, #1e293b);
  flex: 1;
}

.panel-count {
  background: var(--primary-color-10, rgba(99, 102, 241, 0.1));
  color: var(--primary-color, #6366f1);
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
}

/* 响应式 */
@media (max-width: 860px) {
  .archive-body {
    flex-direction: column-reverse;
    gap: 2.5rem;
  }
  .archive-main,
  .archive-sidebar {
    flex: 0 0 100%;
    width: 100%;
  }
  .archive-sidebar {
    position: static;
  }
  .archive-page {
    padding: 1.5rem 1.25rem 3rem;
  }
  .timeline-month {
    font-size: 1.4rem;
    margin-left: 2.2rem;
  }
  .timeline-month::before {
    left: -2.2rem;
  }
  .timeline-item {
    padding-left: 2.2rem;
  }
  .timeline-content {
    padding: 1rem 1.2rem;
  }
}
</style>
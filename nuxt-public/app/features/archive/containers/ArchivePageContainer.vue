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
                  <!-- 轨道圆点 -->
                  <div class="timeline-track">
                    <div class="timeline-dot-wrapper">
                      <div class="timeline-dot"></div>
                    </div>
                  </div>
                  <!-- 日期（左）+ 标题（右）行内布局 -->
                  <div class="timeline-content">
                    <time class="article-date">{{ formatDateShort(article.createdAt) }}</time>
                    <span class="article-title">{{ article.title }}</span>
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
  --archive-accent-soft: rgba(13, 110, 253, 0.08);
  --archive-accent-soft-strong: rgba(13, 110, 253, 0.18);
  --archive-track-color: var(--border-color-light);
  --archive-hover-bg: var(--nav-link-hover-bg);
  --archive-dot-color: var(--text-tertiary);
  --archive-dot-border: var(--bg-primary);
  --archive-dot-wrapper-hover: rgba(13, 110, 253, 0.12);
  --archive-card-bg: var(--card-bg);
  --archive-card-border: var(--border-color);
  --archive-card-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  --archive-chip-dismiss-bg: rgba(0, 0, 0, 0.08);
  min-height: 100vh;
  padding: 2rem 1.5rem 5rem;
  max-width: 1080px;
  margin: 0 auto;
  color: var(--text-primary);
}

:global(.dark) .archive-page,
.dark-theme .archive-page {
  --archive-accent-soft: rgba(66, 153, 225, 0.16);
  --archive-accent-soft-strong: rgba(66, 153, 225, 0.28);
  --archive-track-color: var(--border-color);
  --archive-hover-bg: rgba(96, 165, 250, 0.14);
  --archive-dot-color: var(--text-muted);
  --archive-dot-border: var(--card-bg);
  --archive-dot-wrapper-hover: rgba(66, 153, 225, 0.2);
  --archive-card-border: var(--border-color-light);
  --archive-card-shadow: 0 20px 44px rgba(2, 6, 23, 0.28);
  --archive-chip-dismiss-bg: rgba(255, 255, 255, 0.1);
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
  background: var(--archive-accent-soft);
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
  background: var(--archive-chip-dismiss-bg);
  transform: scale(1.1);
}

/* --- 自定义时间线核心样式 --- */
.md3-timeline {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.timeline-group {
  display: flex;
  flex-direction: column;
}

.timeline-month {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 0.65rem 2.4rem;
  position: relative;
  color: var(--primary-color, #6366f1);
  letter-spacing: 0.01em;
  text-transform: uppercase;
}

/* 月份标识锚点圆点 */
.timeline-month::before {
  content: '';
  position: absolute;
  left: -2.4rem;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--primary-color, #6366f1);
  box-shadow: 0 0 0 3px var(--archive-accent-soft-strong);
  z-index: 2;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

/* 时间线轨道主线 */
.timeline-list::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 4px;
  width: 1.5px;
  background: var(--archive-track-color);
  z-index: 0;
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: center;
  text-decoration: none;
  padding: 0.28rem 0.75rem 0.28rem 2.2rem;
  border-radius: 10px;
  transition: background 0.22s cubic-bezier(0.2, 0, 0, 1);
  outline: none;
  gap: 0;
}

.timeline-item:hover {
  background: var(--archive-hover-bg);
}

.timeline-item:focus-visible {
  background: var(--archive-hover-bg);
  box-shadow: 0 0 0 3px var(--archive-accent-soft);
}

.timeline-track {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  z-index: 1;
}

.timeline-dot-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  transition: background 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.timeline-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--archive-dot-color);
  border: 1.5px solid var(--archive-dot-border);
  box-sizing: content-box;
  transition: all 0.25s cubic-bezier(0.2, 0, 0, 1);
}

.timeline-item:hover .timeline-dot {
  background: var(--primary-color, #6366f1);
  border-color: var(--primary-color, #6366f1);
  transform: scale(1.5);
}

.timeline-item:hover .timeline-dot-wrapper {
  background: var(--archive-dot-wrapper-hover);
}

/* 内容区：日期左 + 标题右 */
.timeline-content {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 1rem;
  min-width: 0;
}

.article-date {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  letter-spacing: 0.02em;
  line-height: 1.4;
  width: 2.8rem;
  font-weight: 500;
}

.article-title {
  flex: 1;
  font-size: 0.93rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.55;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.22s cubic-bezier(0.2, 0, 0, 1);
}

.timeline-item:hover .article-title {
  color: var(--primary-color, #6366f1);
}

/* --- 右侧 Tag Cloud 卡片 --- */
.md3-card {
  background: var(--archive-card-bg);
  border-radius: 24px;
  padding: 1.8rem;
  box-shadow: var(--archive-card-shadow);
  border: 1px solid var(--archive-card-border);
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
  color: var(--text-primary);
  flex: 1;
}

.panel-count {
  background: var(--archive-accent-soft);
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
    padding: 1.25rem 1rem 3rem;
  }
  .timeline-month {
    font-size: 1rem;
    margin-left: 2rem;
  }
  .timeline-month::before {
    left: -2rem;
  }
  .timeline-item {
    padding-left: 1.9rem;
  }
}
</style>

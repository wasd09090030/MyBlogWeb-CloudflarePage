<template>
  <div class="archive-page limit-max-width">
    <div class="archive-body">
      <!-- 左侧 65%：高密度时间线 -->
      <div class="archive-main">
        <StateLoading v-if="loading" message="探索记忆坐标中..." class="py-12" />

        <n-alert v-else-if="error" type="error" title="数据读取失败" class="mb-6">
          {{ error.message }}
        </n-alert>

        <template v-else>
          <!-- MD3 风格的筛选气泡 -->
          <div v-if="selectedTag" class="md3-filter-chip">
            <span class="filter-text">包含 <strong>#{{ selectedTag }}</strong> 的博客内容 ({{ filteredArticles.length }})</span>
            <button class="md3-icon-btn" @click="selectedTag = null" aria-label="清除筛选">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="currentColor" stroke="currentColor" stroke-width="1.5" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/></svg>
            </button>
          </div>

          <n-empty
            v-if="timelineGroups.length === 0"
            description="此处空空如也，尚未有记录"
            class="my-12"
          />

          <!-- 精致高密度时间线 -->
          <div v-else class="compact-timeline">
            <div v-for="group in timelineGroups" :key="group.month" class="timeline-group">
              <h2 class="timeline-month">{{ group.month }}</h2>
              <div class="timeline-list">
                <NuxtLink
                  v-for="article in group.articles"
                  :key="article.id"
                  :to="getArticlePath(article)"
                  class="timeline-item"
                >
                  <!-- 左侧区域：日期 (固定宽度) -->
                  <div class="item-date">
                    <span class="date-text">{{ formatDateShort(article.createdAt) }}</span>
                  </div>

                  <!-- 轨道与互动圆点 -->
                  <div class="item-track">
                    <div class="track-line"></div>
                    <div class="dot-wrapper">
                      <div class="track-dot"></div>
                    </div>
                  </div>

                  <!-- 右侧区域：标题 -->
                  <div class="item-content">
                    <h3 class="article-title">{{ article.title }}</h3>
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
            <svg class="panel-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.36-.36.58-.86.58-1.41s-.22-1.06-.58-1.42zM5.5 7A1.5 1.5 0 0 1 4 5.5A1.5 1.5 0 0 1 5.5 4A1.5 1.5 0 0 1 7 5.5A1.5 1.5 0 0 1 5.5 7z"/></svg>
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
  padding: 3.5rem 1.5rem 5rem;
  max-width: 1040px;
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
  top: 6rem;
}

/* 筛选气泡 */
.md3-filter-chip {
  display: inline-flex;
  align-items: center;
  background: var(--primary-color-10, rgba(99, 102, 241, 0.08));
  color: var(--primary-color, #6366f1);
  padding: 0.5rem 1rem;
  border-radius: 999px;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  font-weight: 500;
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
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.md3-icon-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* --- 高密度时间线样式 --- */
.compact-timeline {
  display: flex;
  flex-direction: column;
  gap: 2.2rem;
}

.timeline-group {
  display: flex;
  flex-direction: column;
}

.timeline-month {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 1rem 4.5rem; /* 为左侧日期预留空间对齐 */
  color: var(--n-text-color, #1e293b);
  position: relative;
  letter-spacing: -0.01em;
}

/* 装饰性大圆点 */
.timeline-month::before {
  content: '';
  position: absolute;
  left: -4.5rem; /* 推回轨道位置 */
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--n-card-color, #fff);
  border: 3px solid var(--primary-color, #6366f1);
  box-shadow: 0 0 0 3px var(--primary-color-10, rgba(99, 102, 241, 0.15));
  z-index: 2;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-bottom: 0.5rem;
}

/* 轨道主轴 */
.timeline-list::before {
  content: '';
  position: absolute;
  top: -1rem;
  bottom: 0;
  left: 5px; /* 12/2 - 1 让线和圈中心对齐 */
  width: 2px;
  background: var(--n-border-color, rgba(0, 0, 0, 0.08));
  z-index: 0;
}

.timeline-item {
  display: flex;
  align-items: center; /* 纵向居中对齐，高密度 */
  text-decoration: none;
  padding: 0.5rem 0;
  min-height: 2.8rem;
  outline: none;
  group: timeline-row; /* 用于控制 hover 区间 */
}

/* 左侧日期 */
.item-date {
  width: 3.2rem; /* 固定宽度 */
  flex-shrink: 0;
  text-align: right;
  padding-right: 1rem; /* 与轨道的距离 */
  margin-left: -5.3rem; /* 负边距抵消父级对齐，让日期跑到轨道左侧 */
}

.date-text {
  font-size: 0.85rem;
  color: var(--n-text-color-3, #94a3b8);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  transition: color 0.3s var(--md-sys-motion-easing);
}

/* 轨道组件 */
.item-track {
  position: relative;
  width: 0;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.dot-wrapper {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  transition: background 0.3s var(--md-sys-motion-easing);
}

.track-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--n-border-color, rgba(0, 0, 0, 0.2));
  transition: all 0.3s var(--md-sys-motion-easing);
}

/* 右侧标题区 */
.item-content {
  flex: 1;
  padding-left: 1.25rem;
  display: flex;
  align-items: center;
}

.article-title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--n-text-color-2, #334155);
  margin: 0;
  line-height: 1.4;
  transition: all 0.3s var(--md-sys-motion-easing);
  /* 单行截断保障视觉整洁 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 95%;
}

/* ====== Hover 交互状态 ====== */
.timeline-item:hover .date-text {
  color: var(--primary-color, #6366f1);
}

.timeline-item:hover .track-dot {
  background: var(--primary-color, #6366f1);
  transform: scale(1.5);
  box-shadow: 0 0 0 2px var(--n-card-color, #fff); /* 制造空心截断面感 */
}

.timeline-item:hover .dot-wrapper {
  background: var(--primary-color-10, rgba(99, 102, 241, 0.15));
}

.timeline-item:hover .article-title {
  color: var(--primary-color, #6366f1);
  transform: translateX(4px);
}

/* --- 右侧 Tag Cloud 卡片微调 --- */
.md3-card {
  background: var(--n-card-color, #fff);
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.02);
  border: 1px solid var(--n-border-color, rgba(0, 0, 0, 0.04));
}

.panel-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.2rem;
}

.panel-icon {
  color: var(--primary-color, #6366f1);
  margin-right: 0.5rem;
}

.panel-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--n-text-color, #1e293b);
  flex: 1;
}

.panel-count {
  background: var(--primary-color-10, rgba(99, 102, 241, 0.1));
  color: var(--primary-color, #6366f1);
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* 响应式 */
@media (max-width: 860px) {
  .archive-body {
    flex-direction: column-reverse;
    gap: 2rem;
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
  
  /* 移动端削减左侧对齐深度 */
  .timeline-month {
    margin-left: 3.5rem;
  }
  .timeline-month::before {
    left: -3.5rem;
  }
  .item-date {
    width: 2.2rem;
    margin-left: -4.3rem; 
    padding-right: 0.8rem;
  }
  .item-content {
    padding-left: 1rem;
  }
  .article-title {
    font-size: 0.95rem;
  }
}
</style>

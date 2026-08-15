<template>
  <div class="magazine-archive">
    <header class="mag-head">
      <div class="mag-rule"><span>◆</span></div>
      <h1 class="mag-title">文章归档 <em>Archive</em></h1>
      <div class="mag-rule"><span>◆</span></div>
      <p class="mag-subtitle">Timeline × Tags · 按时间与标签浏览全部文章</p>
      <div v-if="selectedTag" class="mag-filter">
        <span>正在阅读 <strong>#{{ selectedTag }}</strong> · {{ filteredArticles.length }} 篇</span>
        <button class="mag-filter-close" @click="selectedTag = null" aria-label="清除筛选">✕</button>
      </div>
    </header>

    <StateLoading v-if="loading" message="正在翻阅旧刊..." class="py-12" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="数据读取失败"
      class="mb-8"
      :description="error.message"
    />

    <template v-else>
      <StateEmpty
        v-if="timelineGroups.length === 0"
        icon="heroicons:book-open"
        description="此处空空如也，尚未有记录"
        class="my-16"
      />

      <div v-else class="mag-body">
        <div class="mag-timeline">
          <div
            v-for="(group, index) in timelineGroups"
            :key="group.month"
            class="mag-event"
            :class="index % 2 === 0 ? 'mag-event--left' : 'mag-event--right'"
          >
            <div class="mag-event-card">
              <div class="mag-month">
                <span class="mag-year">{{ monthParts(group.month).year }}</span>
                <span class="mag-month-number">{{ monthParts(group.month).month }}</span>
              </div>
              <div class="mag-articles">
                <NuxtLink
                  v-for="article in group.articles"
                  :key="article.id"
                  :to="getArticlePath(article)"
                  class="mag-article"
                >
                  <time class="mag-date">{{ formatDateShort(article.createdAt) }}</time>
                  <span class="mag-title">{{ article.title }}</span>
                  <span v-if="article.summary" class="mag-summary">{{ article.summary }}</span>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>

        <aside class="mag-tags">
          <div class="tags-box">
            <p class="tags-label">专栏标签 · Tags</p>
            <ArchiveTagCloud
              :tags="tagStats"
              :selected-tag="selectedTag"
              @update:selected-tag="selectedTag = $event"
            />
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
<script setup lang="ts">
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'
import { computeTagStats, groupArticlesByMonth } from '~/features/archive/utils/archive'
import { formatDateShort, getArticlePath } from '~/features/archive/utils/formatters'
import StateLoading from '~/shared/ui/StateLoading.vue'
import StateEmpty from '~/shared/ui/StateEmpty.vue'
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

function monthParts(monthKey: string) {
  const match = monthKey.match(/^(\d{4})年(\d{2})月$/)
  if (!match) return { year: monthKey, month: '' }
  return { year: match[1], month: match[2] }
}

onMounted(fetchArticles)
</script>

<style scoped>
.magazine-archive {
  --paper: #f6f1e7;
  --paper-2: #efe7d8;
  --ink: #191510;
  --ink-soft: #4a423a;
  --muted: #8a7f6f;
  --accent: #b3372a;
  --line: #d9cfbd;
  --serif: 'Playfair Display', 'Noto Serif SC', 'Songti SC', 'SimSun', Georgia, 'Times New Roman', serif;
  --sans: 'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  background: var(--paper);
  color: var(--ink);
  border: 1px solid var(--line);

  font-family: var(--sans);
}

:global(.dark) .magazine-archive,
.dark .magazine-archive {
  --paper: #171412;
  --paper-2: #201c18;
  --ink: #f1e9dd;
  --ink-soft: #c9bfae;
  --muted: #8f8577;
  --accent: #e06a5a;
  --line: #3a342d;

}

/* ---------- 报头 ---------- */
.mag-head {
  text-align: center;
  padding: 0.75rem 0 2.5rem;
}

.mag-rule {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--accent);
  max-width: 640px;
  margin: 0 auto;
}

.mag-rule::before,
.mag-rule::after {
  content: '';
  height: 1px;
  flex: 1;
  background: var(--ink);
}

.mag-title {
  font-family: var(--serif);
  font-size: clamp(34px, 6vw, 54px);
  font-weight: 800;
  letter-spacing: 0.03em;
  line-height: 1.1;
  margin: 10px 0;
}

.mag-title em {
  font-style: italic;
  color: var(--accent);
  font-weight: 600;
}

.mag-subtitle {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--muted);
}

.mag-filter {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.55rem 1.1rem;
  border: 1px solid var(--line);
  background: var(--paper-2);
  font-size: 13px;
  letter-spacing: 0.04em;
  color: var(--ink-soft);
}

.mag-filter strong {
  color: var(--accent);
  font-weight: 700;
}

.mag-filter-close {
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  padding: 2px 4px;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.mag-filter-close:hover {
  color: var(--accent);
  transform: scale(1.15);
}

/* ---------- 主体双栏 ---------- */
.mag-body {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(220px, 1fr);
  gap: 64px;
  align-items: start;
}

/* ---------- 杂志风时间线 ---------- */
.mag-timeline {
  position: relative;
  padding: 8px 0 20px;
}

.mag-timeline::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--ink);
  transform: translateX(-50%);
}

.mag-event {
  position: relative;
  width: 50%;
  padding: 0 44px 52px 0;
}

.mag-event--right {
  left: 50%;
  padding: 0 0 52px 44px;
}

.mag-event:last-child {
  padding-bottom: 0;
}

.mag-event::before {
  content: '◆';
  position: absolute;
  top: 2px;
  right: -6px;
  font-size: 12px;
  color: var(--accent);
  z-index: 2;
}

.mag-event--right::before {
  right: auto;
  left: -6px;
}

.mag-event-card {
  background: transparent;
  border: 0;
  padding: 0;
}

.mag-month {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.mag-year {
  font-family: var(--serif);
  font-size: clamp(30px, 3.2vw, 38px);
  font-weight: 800;
  color: var(--accent);
  line-height: 1;
}

.mag-month-number {
  font-family: var(--serif);
  font-size: 18px;
  color: var(--ink-soft);
  letter-spacing: 0.08em;
}

.mag-articles {
  margin-top: 14px;
  border-top: 1px solid var(--ink);
}

.mag-article {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  padding: 12px 2px;
  border-bottom: 1px solid var(--line);
  text-decoration: none;
  transition: background 0.25s;
}

.mag-article:last-child {
  border-bottom: none;
}

.mag-article:hover {
  background: rgba(179, 55, 42, 0.05);
}

.mag-date {
  flex: 0 0 auto;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 2px;
}

.mag-title {
  flex: 1;
  min-width: 0;
  font-family: var(--serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
  transition: color 0.25s;
}

.mag-article:hover .mag-title {
  color: var(--accent);
}

.mag-summary {
  width: 100%;
  font-size: 12px;
  color: var(--ink-soft);
  line-height: 1.6;
  margin-top: 2px;
}

/* ---------- 右侧标签云 ---------- */
.mag-tags {
  position: sticky;
  top: 6rem;
}

.tags-box {
  border-top: 2px solid var(--ink);
  padding-top: 20px;
}

.tags-label {
  font-size: 10.5px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 16px;
}

/* ---------- 响应式 ---------- */
@media (max-width: 960px) {
  .mag-body {
    grid-template-columns: 1fr;
    gap: 52px;
  }

  .mag-tags {
    position: static;
  }
}

@media (max-width: 760px) {
  .magazine-archive {
    padding: 1.25rem 1rem 3rem;
  }

  .mag-timeline::before {
    left: 10px;
    transform: none;
  }

  .mag-event,
  .mag-event--right {
    width: 100%;
    left: auto !important;
    padding: 0 0 44px 40px;
  }

  .mag-event::before,
  .mag-event--right::before {
    right: auto;
    left: 4px;
  }

  .mag-title {
    font-size: 15px;
  }
}
</style>

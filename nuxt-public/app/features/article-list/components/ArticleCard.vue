<template>
  <div
    :class="[
      'article-card',
      {
        'article-card-reverse': isListView && isReverse,
        'article-card-grid': isGridView
      }
    ]"
    @mouseenter="handleMouseEnter"
  >
    <!-- 封面图片区域 -->
    <div class="article-image-section">
      <img
        v-if="article.coverImage && article.coverImage !== 'null'"
        :src="article.coverImage"
        :alt="article.title"
        class="article-image lazy-image"
        style="height: 300px; aspect-ratio: 16/9; object-fit: cover; width: 100%;"
        @error="handleImageError"
        @load="handleImageLoad"
        :loading="isPriority ? 'eager' : 'lazy'"
        :fetchpriority="isPriority ? 'high' : 'low'"
      />
      <div v-else class="article-image-placeholder">
        <Icon name="image" size="3xl" class="text-muted" />
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="article-content-section">
      <div class="article-meta mb-2">
        <span class="article-date">{{ formatDate(article.createdAt) }}</span>
        <span :class="['article-category', getCategoryClass(article.category)]">
          {{ getCategoryName(article.category) }}
        </span>
      </div>

      <NuxtLink :to="articleRoute" class="article-title-link" prefetch @click.prevent="handleArticleClick">
        <h3 class="article-title">{{ article.title }}</h3>
      </NuxtLink>

      <div class="article-excerpt">
        <div v-html="articleExcerpt" class="article-content-preview"></div>
      </div>

      <!-- 文章标签 -->
      <div v-if="article.tags && article.tags.length > 0" class="article-tags">
        <span v-for="tag in article.tags" :key="tag" class="article-tag">
          {{ tag }}
        </span>
      </div>

      <NuxtLink :to="articleRoute" class="learn-more learn-more-sm" prefetch @click.prevent="handleArticleClick">
        <span class="circle" aria-hidden="true">
          <span class="icon arrow"></span>
        </span>
        <span class="button-text">阅读全文</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import { getExcerpt } from '~/utils/excerpt'
import { useArticleNavigation } from '~/composables/useArticleNavigation'

const { navigateToArticle } = useArticleNavigation()

const props = defineProps({
  article: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
  isReverse: {
    type: Boolean,
    default: false
  },
  viewMode: {
    type: String,
    default: 'list'
  },
  routeQuery: {
    type: Object,
    default: () => ({})
  }
})

const isListView = computed(() => props.viewMode === 'list')
const isGridView = computed(() => props.viewMode === 'grid')
const isPriority = computed(() => props.index < 3)

const articleExcerpt = computed(() => getExcerpt(props.article.contentMarkdown || props.article.content))

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') {
    return '/'
  }
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}

const articleRoute = computed(() => ({
  path: getArticlePath(props.article),
  query: { ...props.routeQuery }
}))

let preloadTriggered = false

const handleMouseEnter = async () => {
  if (preloadTriggered) return
  preloadTriggered = true

  // 预加载路由组件（hover 时就开始）
  try {
    await preloadRouteComponents(getArticlePath(props.article)).catch(() => {})
  } catch (e) {
    // 预加载失败不影响用户体验
  }
}

// 🔥 拦截点击，使用无缝导航（Loading 动画 + 后台预加载 + 跳转）
const handleArticleClick = () => {
  navigateToArticle(props.article, { query: props.routeQuery })
}

const getCategoryName = (category) => {
  if (!category) return '其他'
  const lowerCategory = category.toLowerCase()
  const categoryMap = {
    'study': '学习笔记',
    'game': '游戏评测',
    'work': '个人作品',
    'resource': '资源分享'
  }
  return categoryMap[lowerCategory] || '其他/杂谈'
}

const getCategoryClass = (category) => {
  if (!category) return 'category-other'
  const lowerCategory = category.toLowerCase()
  const categoryClassMap = {
    'study': 'category-study',
    'game': 'category-game',
    'work': 'category-work',
    'resource': 'category-resource'
  }
  return categoryClassMap[lowerCategory] || 'category-other'
}

const handleImageError = (event) => {
  event.target.style.display = 'none'
}

const handleImageLoad = (event) => {
  event.target.classList.add('lazy-loaded')
}

function formatDate(dateString) {
  if (!dateString) return '未知日期'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>
<template>
  <div v-if="articles && articles.length > 0" class="related-articles-mdc my-12">
    <div class="related-articles-header">
      <Icon name="hand-thumb-up" size="30" class="text-blue-600 dark:text-blue-400" />
      <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100">相关推荐</h3>
    </div>

    <div class="related-articles-grid">
      <NuxtLink
        v-for="article in articles"
        :key="article.id"
        :to="getArticleUrl(article)"
        class="related-article-card group"
        @click.prevent="handleArticleClick(article)"
      >
        <div class="card-media">
          <template v-if="hasCoverImage(article)">
            <ImageLoadingPlaceholder
              :show="!isCardImageLoaded(article)"
              aria-label="推荐文章封面加载中"
            />
            <img
              :src="article.coverImage"
              :alt="article.title"
              class="card-image"
              loading="lazy"
              @load="handleCardImageLoad(article)"
              @error="handleCardImageError(article)"
            />
          </template>
          <div v-else class="card-fallback">
            <Icon name="image" size="3xl" class="text-gray-400 dark:text-gray-500" />
          </div>

          <div class="card-content-overlay">
            <h4 class="card-title line-clamp-2">
              {{ article.title }}
            </h4>
            <div class="card-meta">
              <Icon name="calendar" size="sm" />
              <time :datetime="article.createdAt">
                {{ formatDate(article.createdAt) }}
              </time>
            </div>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'

/**
 * RelatedArticles 相关推荐组件 - MDC 语法
 *
 * 在 Markdown 中使用：
 * ::related-articles{count="3"}
 * ::
 *
 * 或在文章详情页自动添加（无需手动添加）
 *
 * Props:
 * - count: 显示的文章数量（默认 3）
 * - excludeId: 排除的文章 ID（避免显示当前文章）
 */

const props = defineProps({
  count: {
    type: Number,
    default: 3
  },
  excludeId: {
    type: [Number, String],
    default: null
  }
})

const config = useRuntimeConfig()
const imageLoadedMap = ref({})
const imageErrorMap = ref({})

const getApiBase = () => {
  const apiBase = config.public.apiBase
  if (apiBase) {
    if (process.server && apiBase.startsWith('/')) {
      return `http://127.0.0.1:5000${apiBase}`
    }
    return apiBase
  }
  return process.env.NODE_ENV === 'production'
    ? '/api'
    : 'http://localhost:5000/api'
}

// 获取推荐文章
const { data: allArticles } = await useAsyncData(
  `related-articles-${props.count}`,
  async () => {
    try {
      const response = await $fetch(`${getApiBase()}/articles/featured`, {
        params: { limit: props.count + 1 } // 多获取一篇，以防需要排除当前文章
      })
      return response || []
    } catch (error) {
      console.error('获取推荐文章失败:', error)
      return []
    }
  },
  {
    lazy: false
  }
)

// 过滤并限制文章数量
const articles = computed(() => {
  if (!allArticles.value || allArticles.value.length === 0) {
    return []
  }

  let filtered = allArticles.value

  // 排除当前文章
  if (props.excludeId) {
    const excludeIdNum = typeof props.excludeId === 'string'
      ? parseInt(props.excludeId)
      : props.excludeId
    filtered = filtered.filter(article => article.id !== excludeIdNum)
  }

  // 限制数量
  return filtered.slice(0, props.count)
})

const getImageKey = (article) => String(article?.id ?? article?.slug ?? article?.title ?? '')
const hasCoverImage = (article) => {
  const coverImage = article?.coverImage
  if (!coverImage || coverImage === 'null') return false
  return !imageErrorMap.value[getImageKey(article)]
}
const isCardImageLoaded = (article) => Boolean(imageLoadedMap.value[getImageKey(article)])
const handleCardImageLoad = (article) => {
  imageLoadedMap.value[getImageKey(article)] = true
}
const handleCardImageError = (article) => {
  const imageKey = getImageKey(article)
  imageErrorMap.value[imageKey] = true
  imageLoadedMap.value[imageKey] = true
}

watch(
  () => articles.value.map(article => article.id),
  () => {
    imageLoadedMap.value = {}
    imageErrorMap.value = {}
  },
  { immediate: true }
)

// 获取文章 URL（包含 slug）
function getArticleUrl(article) {
  if (!article) return '#'
  if (article.slug) {
    return `/article/${article.id}-${article.slug}`
  }
  return `/article/${article.id}`
}

// 🔥 无缝导航
const { navigateToArticle } = useArticleNavigation()
function handleArticleClick(article) {
  navigateToArticle(article)
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''

  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays} 天前`
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} 周前`
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} 个月前`
  }

  // 超过一年显示具体日期
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.related-articles-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.related-articles-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem;
}

.related-article-card {
  text-decoration: none;
  display: block;
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
}

.related-article-card:hover {
  text-decoration: none;
  transform: translateY(-4px);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
  border-color: rgba(59, 130, 246, 0.5);
}

.card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: linear-gradient(145deg, rgba(148, 163, 184, 0.25), rgba(226, 232, 240, 0.35));
}

.card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.38s ease;
}

.related-article-card:hover .card-image {
  transform: scale(1.06);
}

.card-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(150deg, rgba(15, 23, 42, 0.12), rgba(30, 41, 59, 0.32));
}

.card-content-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.95rem;
  background: linear-gradient(180deg, rgba(2, 6, 23, 0.04) 35%, rgba(2, 6, 23, 0.86) 100%);
}

.card-title {
  margin: 0;
  font-size: 1rem;
  line-height: 1.35;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);
}

.card-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.83rem;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}

@media (min-width: 768px) {
  .related-articles-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .related-articles-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* 文本截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:global(.dark-theme) .related-article-card {
  border-color: rgba(71, 85, 105, 0.75);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.45);
}
</style>

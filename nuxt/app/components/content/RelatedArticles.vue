<template>
  <div v-if="articles && articles.length > 0" class="related-articles-mdc my-12">
    <!-- 标题 -->
    <div class="flex items-center gap-3 mb-6">
      <Icon name="hand-thumb-up" size="30" class="text-blue-600 dark:text-blue-400" />
      <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100">相关推荐</h3>
    </div>
    
    <!-- 文章卡片网格 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <NuxtLink
        v-for="article in articles"
        :key="article.id"
        :to="getArticleUrl(article)"
        class="related-article-card group block bg-white dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 no-underline"
        @click.prevent="handleArticleClick(article)"
      >
        <!-- 封面图片 -->
        <div class="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img
            v-if="article.coverImage && article.coverImage !== 'null'"
            :src="article.coverImage"
            :alt="article.title"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <Icon name="image" size="3xl" class="text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        
        <!-- 文章信息 -->
        <div class="p-4">
          <!-- 标题 -->
          <h4 class="text-base font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {{ article.title }}
          </h4>
          
          <!-- 日期 -->
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Icon name="calendar" size="sm" />
            <time :datetime="article.createdAt">
              {{ formatDate(article.createdAt) }}
            </time>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
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
.related-article-card {
  text-decoration: none;
}

.related-article-card:hover {
  text-decoration: none;
}

/* 文本截断 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

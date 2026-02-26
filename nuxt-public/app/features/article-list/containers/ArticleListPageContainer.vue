<template>
  <div class="article-list-page" ref="articleListContainer">
    <ArticleListCategoryBar :view-mode="effectiveViewMode" @update:view-mode="setViewMode" />

    <n-alert v-if="error" type="error" title="加载失败" class="mb-4">
      加载或操作文章失败：{{ error.message }}
    </n-alert>

    <n-alert v-if="route.query.search || route.query.category" type="info" class="mb-4" closable @close="clearSearch">
      <template #header>
        <div class="d-flex flex-wrap align-items-center gap-3">
          <span v-if="route.query.search">搜索结果："{{ route.query.search }}"</span>
          <span v-if="route.query.category">分类筛选：{{ getCategoryName(route.query.category) }}</span>
        </div>
      </template>
    </n-alert>

    <LazySkeletonLoader
      v-if="loading && useSkeletonLoader"
      :count="4"
    />
    <LazyLoadingSpinner
      v-else-if="loading"
      :text="loadingText"
      size="medium"
    />

    <TransitionGroup
      v-else-if="listContext.articles.length"
      tag="div"
      name="layout-fade"
      :class="articlesContainerClasses"
    >
      <ArticleListArticleCard
        v-for="(article, index) in listContext.articles"
        :key="article.id"
        v-memo="[article.id, article.title, article.coverImage, article.createdAt, article.category, listContext.currentPage, effectiveViewMode]"
        :article="article"
        :index="index"
        :is-reverse="isListView && (listContext.indexOffset + index + 1) % 2 === 0"
        :view-mode="effectiveViewMode"
        :route-query="currentRouteQuery"
      />
    </TransitionGroup>

    <n-empty v-else :description="listContext.emptyText" class="my-5">
      <template #icon>
        <Icon name="journal-text" size="3xl" />
      </template>
    </n-empty>

    <ArticleListArticlePagination
      :current-page="paginationPage"
      :total-pages="listContext.totalPages"
      :total-count="listContext.totalCount"
      @update:page="updatePaginationPage"
    />
  </div>
</template>

<script setup>
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'
import ArticleListCategoryBar from '~/features/article-list/components/CategoryBar.vue'
import ArticleListArticleCard from '~/features/article-list/components/ArticleCard.vue'
import ArticleListArticlePagination from '~/features/article-list/components/ArticlePagination.vue'
import { getCategoryName } from '~/features/article-list/utils/formatters'
import { buildPageNumbers, syncPageFromQuery } from '~/features/article-list/utils/pagination'
import { updatePageState, triggerViewSwitchAnimation } from '~/features/article-list/utils/navigation'

const route = useRoute()
const viewMode = ref('list')
const isSwitchingView = ref(false)
const isMobile = ref(false)
const viewSwitchTimer = { timer: null }

const checkMobile = () => {
  if (import.meta.client) {
    isMobile.value = window.innerWidth <= 768
  }
}

const effectiveViewMode = computed(() => {
  return isMobile.value ? 'grid' : viewMode.value
})

const articleListContainer = ref(null)
const error = ref(null)
const loading = ref(false)
const savedScrollPosition = ref(0)

const { getAllArticles, getArticlesByCategory, searchArticles, getFirstPageArticles } = useArticlesFeature()

// SSG 预取：构建期只将前 articlesPerPage 条文章 + total 嵌入 payload（轻量）；
// 客户端水化时直接从 payload 读取，首屏0延迟；后台静默加载全量供翻页/搜索使用。
const ssrResult = await getFirstPageArticles(articlesPerPage).catch(() => ({ articles: [], total: 0 }))
const ssrInitialArticles = ssrResult.articles

// 服务端返回的文章总数，用于首屏前分页组件能渲染正确总页数（无需等全量就绪）
const serverTotalCount = ref(ssrResult.total)
// 标记全量数据是否已加载完毕（影响翻页行为）
const isFullDataReady = ref(false)

// articles 直接用 SSG 预取数据初始化，水化时无需等待 onMounted
// 与服务端渲染的 HTML 完全一致，避免水化后再次赋值导致的闪烁/慢一拍
const articles = ref(ssrInitialArticles)
const currentPage = ref(1)
const currentFilteredPage = ref(1)
const articlesPerPage = 8
const useSkeletonLoader = ref(true)

const paginationPage = computed({
  get: () => isFilteredMode.value ? currentFilteredPage.value : currentPage.value,
  set: (val) => {
    if (isFilteredMode.value) {
      goToFilteredPage(val)
    } else {
      goToPage(val)
    }
  }
})

const currentRouteQuery = computed(() => {
  const query = {}
  if (route.query.search) {
    query.search = route.query.search
  }
  if (route.query.category) {
    query.category = route.query.category
  }
  return query
})

const updatePaginationPage = (page) => {
  paginationPage.value = page
}

const isFilteredMode = computed(() => Boolean(route.query.search || route.query.category))
const isListView = computed(() => effectiveViewMode.value === 'list')
const isGridView = computed(() => effectiveViewMode.value === 'grid')
const articlesContainerClasses = computed(() => [
  'articles-container',
  {
    'grid-mode': isGridView.value,
    'list-mode': isListView.value,
    'view-switching': isSwitchingView.value
  }
])

const loadingText = computed(() => {
  if (route.query.search) return '正在搜索文章...'
  if (route.query.category) return '正在筛选文章...'
  return '正在加载文章列表...'
})

const emptyMessage = computed(() => {
  if (route.query.search) return '没有找到匹配搜索条件的文章'
  if (route.query.category) return '该分类暂时没有文章'
  return '暂无文章'
})

const filteredArticles = computed(() => {
  if (route.query.search) {
    return articles.value
  }
  if (route.query.category) {
    const queryCategory = route.query.category.toLowerCase()
    return articles.value.filter(article =>
      article.category && article.category.toLowerCase() === queryCategory
    )
  }
  return articles.value
})

const totalPages = computed(() => {
  // 全量就绪后使用精确的数组长度；否则使用服务端返回的 total（避免只有8条时显示1页）
  const count = isFullDataReady.value ? articles.value.length : serverTotalCount.value
  return Math.ceil(count / articlesPerPage)
})
const totalFilteredPages = computed(() => Math.ceil(filteredArticles.value.length / articlesPerPage))

const currentIndex = computed(() => (currentPage.value - 1) * articlesPerPage)
const currentFilteredIndex = computed(() => (currentFilteredPage.value - 1) * articlesPerPage)

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * articlesPerPage
  return articles.value.slice(start, start + articlesPerPage)
})

const paginatedFilteredArticles = computed(() => {
  const start = (currentFilteredPage.value - 1) * articlesPerPage
  return filteredArticles.value.slice(start, start + articlesPerPage)
})

const goToPage = async (page) => {
  // 翻页到第2页以上时若全量还未就绪，先等待加载完成再切片
  if (!isFullDataReady.value && page > 1) {
    loading.value = true
    try {
      const fullData = await getAllArticles(false)
      if (fullData) {
        articles.value = fullData
        serverTotalCount.value = fullData.length
        isFullDataReady.value = true
      }
    } catch (e) {
      error.value = e
    } finally {
      loading.value = false
    }
  }
  updatePageState(page, totalPages, currentPage, articleListContainer)
}
const goToFilteredPage = (page) => updatePageState(page, totalFilteredPages, currentFilteredPage, articleListContainer)

const getPageNumbers = () => buildPageNumbers(totalPages.value, currentPage.value)
const getFilteredPageNumbers = () => buildPageNumbers(totalFilteredPages.value, currentFilteredPage.value)

const listContext = computed(() => {
  if (isFilteredMode.value) {
    return {
      articles: paginatedFilteredArticles.value,
      totalPages: totalFilteredPages.value,
      totalCount: filteredArticles.value.length,
      currentPage: currentFilteredPage.value,
      pageNumbers: getFilteredPageNumbers(),
      goToPage: goToFilteredPage,
      indexOffset: currentFilteredIndex.value,
      paginationLabel: '筛选结果分页',
      emptyText: emptyMessage.value
    }
  }

  return {
    articles: paginatedArticles.value,
    totalPages: totalPages.value,
    totalCount: articles.value.length,
    currentPage: currentPage.value,
    pageNumbers: getPageNumbers(),
    goToPage,
    indexOffset: currentIndex.value,
    paginationLabel: '文章分页',
    emptyText: emptyMessage.value
  }
})

const clearSearch = () => {
  navigateTo({ path: '/' })
}

const setViewMode = (mode) => {
  if (mode !== 'list' && mode !== 'grid') return
  if (viewMode.value === mode) return
  viewMode.value = mode
  triggerViewSwitchAnimation(isSwitchingView, viewSwitchTimer)
}

const handleSyncPageFromQuery = (pageParam) => {
  syncPageFromQuery(pageParam, isFilteredMode.value, {
    currentFilteredPage,
    totalFilteredPages,
    currentPage,
    totalPages
  })
}

watch(
  () => [route.query.search, route.query.category],
  async ([newSearch, newCategory], [oldSearch, oldCategory]) => {
    if (newSearch === oldSearch && newCategory === oldCategory) return
    currentPage.value = 1
    currentFilteredPage.value = 1
    await fetchArticles()
    handleSyncPageFromQuery(route.query.page)
  }
)

const fetchArticles = async () => {
  if (loading.value) return

  loading.value = true
  error.value = null

  try {
    if (route.query.search) {
      const searchResults = await searchArticles(route.query.search)
      articles.value = searchResults
    } else if (route.query.category) {
      const fetchedArticles = await getArticlesByCategory(route.query.category)
      articles.value = fetchedArticles.sort((a, b) => {
        const idA = parseInt(a.id) || 0
        const idB = parseInt(b.id) || 0
        return idB - idA
      })
    } else {
      const articlesData = await getAllArticles()
      articles.value = articlesData
      if (articlesData) {
        serverTotalCount.value = articlesData.length
        isFullDataReady.value = true
      }
    }
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  checkMobile()
  if (import.meta.client) {
    window.addEventListener('resize', checkMobile)
  }

  // articles 已由 SSG 数据初始化，onMounted 只需同步路由分页参数
  if (!isFilteredMode.value && ssrInitialArticles.length > 0) {
    handleSyncPageFromQuery(route.query.page)
    // 后台静默拉取全量数据：填充内存缓存供搜索/分类使用，并解锁翻页，不阻塞首屏渲染
    getAllArticles(false).then((fullData) => {
      if (fullData && fullData.length > 0) {
        articles.value = fullData
        serverTotalCount.value = fullData.length
        isFullDataReady.value = true
      }
    }).catch(() => {})
    return
  }

  // 降级路径：SSR 数据不可用，或当前有查询参数（搜索/分类），走原有客户端请求逻辑
  await fetchArticles()
  handleSyncPageFromQuery(route.query.page)
})

onDeactivated(() => {
  savedScrollPosition.value = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
})

onBeforeUnmount(() => {
  if (viewSwitchTimer.timer) {
    clearTimeout(viewSwitchTimer.timer)
  }
  if (import.meta.client) {
    window.removeEventListener('resize', checkMobile)
  }
})

const refreshData = async () => {
  await fetchArticles()
}

defineExpose({
  refreshData
})
</script>

<style>
@import '~/assets/css/components/ArticleList.styles.css';
</style>

<style scoped>
.view-toggle-btn {
  padding: 0.6rem;
  line-height: 0;
}
</style>

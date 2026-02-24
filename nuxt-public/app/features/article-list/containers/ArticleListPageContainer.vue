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
const articles = ref([])
const error = ref(null)
const loading = ref(false)
const savedScrollPosition = ref(0)

const { getAllArticles, getArticlesByCategory, searchArticles } = useArticlesFeature()

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

const totalPages = computed(() => Math.ceil(articles.value.length / articlesPerPage))
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

const goToPage = (page) => updatePageState(page, totalPages, currentPage, articleListContainer)
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

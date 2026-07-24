<template>
  <div class="space-y-6">
    <!-- 页面标题区 -->
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1.5">
        <p class="text-xs uppercase tracking-[0.18em] text-muted font-medium">内容</p>
        <h1 class="font-display text-2xl font-semibold text-highlighted tracking-tight">文章管理</h1>
        <p class="text-sm text-muted">
          <span v-if="!loading" class="font-mono text-highlighted">{{ totalCount }}</span>
          <span v-else>—</span>
          篇 · 第 {{ currentPage }} / {{ Math.max(1, totalPages) }} 页
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          to="/admin"
          variant="ghost"
          color="neutral"
          icon="heroicons:arrow-left"
          size="sm"
        >
          返回仪表板
        </UButton>
        <UButton
          color="primary"
          icon="heroicons:plus"
          @click="createArticle"
        >
          新建文章
        </UButton>
      </div>
    </header>

    <!-- 工具栏：搜索 / 筛选 / 分页大小 -->
    <UDashboardToolbar
      :ui="{ root: 'rounded-lg ring ring-default/40 bg-elevated/30' }"
    >
      <template #left>
        <UInput
          v-model="searchKeyword"
          icon="heroicons:magnifying-glass"
          placeholder="按标题搜索…"
          class="w-full sm:w-72"
          @keyup.enter="handleSearch"
        />
        <USelectMenu
          v-model="selectedCategory"
          :items="categoryOptions"
          value-key="value"
          placeholder="全部类别"
          class="w-full sm:w-44"
          @update:model-value="handleFilterChange"
        />
      </template>
      <template #right>
        <USelectMenu
          v-model="pageSize"
          :items="pageSizeOptions"
          value-key="value"
          class="w-32"
          @update:model-value="handlePageSizeChange"
        />
        <UButton
          variant="ghost"
          color="neutral"
          icon="heroicons:arrow-path"
          :disabled="!searchKeyword && !selectedCategory"
          @click="resetFilters"
        >
          重置
        </UButton>
      </template>
    </UDashboardToolbar>

    <!-- 列表区 -->
    <UCard
      variant="subtle"
      :ui="{ root: 'ring ring-default/40 overflow-hidden', body: 'p-0' }"
    >
      <div v-if="loading" class="flex items-center justify-center py-20">
        <UIcon name="heroicons:arrow-path" class="size-5 text-muted animate-spin" />
      </div>

      <div v-else-if="filteredArticles.length === 0" class="px-6 py-20 text-center">
        <div class="inline-flex items-center justify-center size-12 rounded-full bg-elevated/60 mb-3">
          <Icon name="heroicons:inbox" size="md" class="text-muted" />
        </div>
        <p class="text-sm text-muted">
          {{ searchKeyword || selectedCategory ? '没有找到符合条件的文章' : '暂无文章' }}
        </p>
        <UButton
          v-if="!searchKeyword && !selectedCategory"
          color="primary"
          variant="soft"
          size="sm"
          class="mt-4"
          icon="heroicons:plus"
          @click="createArticle"
        >
          创建第一篇
        </UButton>
      </div>

      <template v-else>
        <UTable
          :data="paginatedArticles"
          :columns="tableColumns"
          :ui="{
            tr: 'hover:bg-elevated/40 transition-colors'
          }"
        />

        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between px-4 py-3 border-t border-default"
        >
          <p class="text-xs text-muted font-mono">
            显示 {{ paginatedArticles.length }} / {{ totalCount }} 条
          </p>
          <UPagination
            v-model:page="currentPage"
            :total="totalCount"
            :items-per-page="pageSize"
            :sibling-count="1"
            show-edges
            size="sm"
            color="primary"
          />
        </div>
      </template>
    </UCard>

    <!-- 删除确认 -->
    <UModal
      v-model:open="showDeleteModal"
      :title="`确认删除《${articleToDelete?.title || ''}》`"
      :description="'此操作不可撤销，文章及其关联数据将永久丢失。'"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
            取消
          </UButton>
          <UButton color="error" :loading="deletingArticle" @click="handleDelete">
            确认删除
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ArticleSummary } from '~/types/api'
import { useAdminArticlesFeature } from '~/features/article-admin/composables/useAdminArticlesFeature'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const router = useRouter()
const toast = useToast()
const { getArticles, deleteArticle, getCategoryLabel } = useAdminArticlesFeature()

const articles = ref([])
const loading = ref(true)
const showDeleteModal = ref(false)
const articleToDelete = ref(null)
const deletingArticle = ref(false)

const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const selectedCategory = ref(null)

const categoryOptions = [
  { label: '学习', value: 'study' },
  { label: '游戏', value: 'game' },
  { label: '个人作品', value: 'work' },
  { label: '资源分享', value: 'resource' },
  { label: '其他', value: 'other' }
]

const pageSizeOptions = [
  { label: '10 条/页', value: 10 },
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 }
]

const categoryColorMap = {
  study: 'primary',
  game: 'success',
  work: 'warning',
  resource: 'info',
  other: 'neutral'
}

const formatDate = (dateString) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') return '/'
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}

const tableColumns = computed<TableColumn<ArticleSummary>[]>(() => [
  {
    id: 'id',
    header: '#',
    meta: { class: { th: 'w-16', td: 'w-16 font-mono text-xs text-muted' } },
    cell: ({ row }) => `#${row.original.id}`
  },
  {
    id: 'title',
    header: '标题',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2 max-w-md' }, [
        row.original.coverImage
          ? h('span', { class: 'inline-flex size-1.5 rounded-full bg-primary shrink-0' })
          : null,
        h('a', {
          href: getArticlePath(row.original),
          target: '_blank',
          rel: 'noopener',
          class: 'font-medium text-highlighted hover:text-primary truncate'
        }, row.original.title)
      ])
  },
  {
    id: 'category',
    header: '类别',
    cell: ({ row }) =>
      h(resolveComponent('UBadge'), {
        variant: 'subtle',
        size: 'sm',
        color: categoryColorMap[row.original.category] || 'neutral'
      }, () => getCategoryLabel(row.original.category))
  },
  {
    id: 'createdAt',
    header: '创建',
    meta: { class: { th: 'hidden md:table-cell', td: 'hidden md:table-cell font-mono text-xs text-muted' } },
    cell: ({ row }) => formatDate(row.original.createdAt)
  },
  {
    id: 'updatedAt',
    header: '更新',
    meta: { class: { th: 'hidden md:table-cell', td: 'hidden md:table-cell font-mono text-xs text-muted' } },
    cell: ({ row }) => formatDate(row.original.updatedAt)
  },
  {
    id: 'actions',
    header: '操作',
    meta: { class: { th: 'w-32 text-right', td: 'text-right' } },
    cell: ({ row }) =>
      h('div', { class: 'flex items-center justify-end gap-1' }, [
        h(resolveComponent('UButton'), {
          size: 'xs',
          variant: 'ghost',
          color: 'neutral',
          icon: 'heroicons:pencil-square',
          'aria-label': '编辑',
          onClick: () => goToEditPage(row.original)
        }),
        h(resolveComponent('UButton'), {
          size: 'xs',
          variant: 'ghost',
          color: 'neutral',
          icon: 'heroicons:arrow-top-right-on-square',
          'aria-label': '查看前台',
          to: getArticlePath(row.original),
          target: '_blank'
        }),
        h(resolveComponent('UButton'), {
          size: 'xs',
          variant: 'ghost',
          color: 'error',
          icon: 'heroicons:trash',
          'aria-label': '删除',
          onClick: () => confirmDelete(row.original)
        })
      ])
  }
])

const filteredArticles = computed(() => {
  let result = [...articles.value]
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase().trim()
    result = result.filter(article => article.title.toLowerCase().includes(keyword))
  }
  if (selectedCategory.value) {
    result = result.filter(article => article.category === selectedCategory.value)
  }
  return result
})

const totalCount = computed(() => filteredArticles.value.length)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredArticles.value.slice(start, end)
})

const handleSearch = () => { currentPage.value = 1 }
const handleFilterChange = () => { currentPage.value = 1 }
const handlePageSizeChange = () => { currentPage.value = 1 }

const resetFilters = () => {
  searchKeyword.value = ''
  selectedCategory.value = null
  currentPage.value = 1
}

watch([searchKeyword, selectedCategory], () => {
  currentPage.value = 1
})

const fetchArticles = async () => {
  loading.value = true
  try {
    const result = await getArticles({ summary: false, limit: 1000 })
    articles.value = Array.isArray(result) ? result : result.data
  } catch (error) {
    console.error('获取文章列表失败:', error)
    toast.add({ title: '获取文章列表失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

const createArticle = () => router.push('/admin/articles/create')
const goToEditPage = (article) => router.push(`/admin/articles/${article.id}`)

const confirmDelete = (article) => {
  articleToDelete.value = article
  showDeleteModal.value = true
}

const handleDelete = async () => {
  deletingArticle.value = true
  try {
    await deleteArticle(articleToDelete.value.id)
    showDeleteModal.value = false
    articleToDelete.value = null
    fetchArticles()
    toast.add({ title: '文章已成功删除', color: 'success' })
  } catch (error) {
    console.error('删除文章失败:', error)
    toast.add({ title: '删除文章失败', color: 'error' })
  } finally {
    deletingArticle.value = false
  }
}

onMounted(() => {
  fetchArticles()
})
</script>

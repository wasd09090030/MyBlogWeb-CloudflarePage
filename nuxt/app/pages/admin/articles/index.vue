<template>
  <div class="article-manager">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">文章管理</h2>
      <UButton color="primary" @click="createArticle">
        <template #leading>
          <Icon name="plus-circle" size="sm" />
        </template>
        新建文章
      </UButton>
    </div>

    <!-- 搜索和筛选区域 -->
    <UCard class="mb-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <UInput
            v-model="searchKeyword"
            placeholder="输入标题关键词..."
            :ui="{ base: 'w-full', leading: 'pl-9' }"
            @keyup.enter="handleSearch"
          >
            <template #leading>
              <Icon name="search" size="sm" class="text-gray-400" />
            </template>
          </UInput>
        </div>
        <div>
          <USelect
            v-model="selectedCategory"
            placeholder="全部类别"
            :items="categoryOptions"
            value-key="value"
            @update:model-value="handleFilterChange"
          />
        </div>
        <div>
          <USelect
            v-model="pageSize"
            :items="pageSizeOptions"
            value-key="value"
            @update:model-value="handlePageSizeChange"
          />
        </div>
        <div class="text-right">
          <UButton variant="ghost" color="neutral" @click="resetFilters">
            <template #leading>
              <Icon name="arrow-path" size="sm" />
            </template>
            重置筛选
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- 文章列表 -->
    <UCard>
      <div v-if="loading" class="flex justify-center py-12">
        <USpinner />
      </div>
      <div v-else-if="filteredArticles.length === 0" class="text-center py-12 text-gray-400">
        <Icon name="inbox" size="3xl" class="mb-3 opacity-50" />
        <p>{{ searchKeyword || selectedCategory ? '没有找到符合条件的文章' : '暂无文章' }}</p>
      </div>

      <template v-else>
        <!-- 统计信息 -->
        <div class="flex justify-between items-center mb-4 text-sm text-gray-500">
          <span>共 {{ totalCount }} 篇文章，当前显示第 {{ currentPage }} 页</span>
          <span>显示 {{ paginatedArticles.length }} 条</span>
        </div>

        <UTable :data="paginatedArticles" :columns="tableColumns" />

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="flex justify-center mt-4">
          <UPagination
            v-model:page="currentPage"
            :total="totalCount"
            :items-per-page="pageSize"
            :sibling-count="2"
            show-controls
          />
        </div>
      </template>
    </UCard>

    <!-- 删除确认对话框 -->
    <UModal v-model:open="showDeleteModal" :title="`确认删除《${articleToDelete?.title}》`" :description="'此操作不可恢复，请谨慎操作'">
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">取消</UButton>
          <UButton color="error" :loading="deletingArticle" @click="handleDelete">确认删除</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
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

// 分页和筛选状态
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
  { label: '10条/页', value: 10 },
  { label: '20条/页', value: 20 },
  { label: '50条/页', value: 50 }
]

const categoryColorMap = {
  study: 'primary',
  game: 'success',
  work: 'warning',
  resource: 'info',
  other: 'neutral'
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') {
    return '/'
  }
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}

// 表格列配置（UTable 语法）
const tableColumns = [
  {
    id: 'id',
    header: 'ID',
    cell: ({ row }) => h(resolveComponent('UBadge'), { variant: 'subtle', size: 'sm' }, () => row.original.id)
  },
  {
    id: 'title',
    header: '标题',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2' }, [
      h('span', row.original.title),
      row.original.coverImage ? h(resolveComponent('Icon'), { name: 'image', size: 'sm', class: 'text-green-500' }) : null
    ])
  },
  {
    id: 'category',
    header: '类别',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      variant: 'subtle',
      color: categoryColorMap[row.original.category] || 'neutral'
    }, () => getCategoryLabel(row.original.category))
  },
  {
    id: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => h('span', { class: 'text-sm text-gray-500' }, formatDate(row.original.createdAt))
  },
  {
    id: 'updatedAt',
    header: '更新时间',
    cell: ({ row }) => h('span', { class: 'text-sm text-gray-500' }, formatDate(row.original.updatedAt))
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-1' }, [
      h(resolveComponent('UButton'), {
        size: 'sm',
        variant: 'ghost',
        color: 'primary',
        onClick: () => goToEditPage(row.original)
      }, {
        default: () => h(resolveComponent('Icon'), { name: 'pencil-square', size: 'sm' })
      }),
      h(resolveComponent('UButton'), {
        size: 'sm',
        variant: 'ghost',
        color: 'error',
        onClick: () => confirmDelete(row.original)
      }, {
        default: () => h(resolveComponent('Icon'), { name: 'trash', size: 'sm' })
      }),
      h('a', { href: getArticlePath(row.original), target: '_blank' }, [
        h(resolveComponent('UButton'), {
          size: 'sm',
          variant: 'ghost',
          color: 'info'
        }, {
          default: () => h(resolveComponent('Icon'), { name: 'eye', size: 'sm' })
        })
      ])
    ])
  }
]

// 筛选后的文章列表
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

const handleSearch = () => {
  currentPage.value = 1
}

const handleFilterChange = () => {
  currentPage.value = 1
}

const handlePageSizeChange = () => {
  currentPage.value = 1
}

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
    articles.value = result.data || result
  } catch (error) {
    console.error('获取文章列表失败:', error)
    toast.add({ title: '获取文章列表失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

const createArticle = () => {
  router.push('/admin/articles/create')
}

const goToEditPage = (article) => {
  router.push(`/admin/articles/${article.id}`)
}

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

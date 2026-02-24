<template>
  <div class="article-manager">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">文章管理</h2>
        <n-button type="primary" @click="createArticle">
          <template #icon>
            <Icon name="plus-circle" size="sm" />
          </template>
          新建文章
        </n-button>
      </div>

      <!-- 搜索和筛选区域 -->
      <n-card class="mb-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <n-input
              v-model:value="searchKeyword"
              placeholder="输入标题关键词..."
              clearable
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <Icon name="search" size="sm" class="text-gray-400" />
              </template>
            </n-input>
          </div>
          <div>
            <n-select
              v-model:value="selectedCategory"
              placeholder="全部类别"
              :options="categoryOptions"
              clearable
              @update:value="handleFilterChange"
            />
          </div>
          <div>
            <n-select
              v-model:value="pageSize"
              :options="pageSizeOptions"
              @update:value="handlePageSizeChange"
            />
          </div>
          <div class="text-right">
            <n-button quaternary @click="resetFilters">
              <template #icon>
                <Icon name="arrow-path" size="sm" />
              </template>
              重置筛选
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 文章列表 -->
      <n-card>
        <n-spin :show="loading">
          <div v-if="!loading && filteredArticles.length === 0" class="text-center py-12 text-gray-400">
            <Icon name="inbox" size="3xl" class="mb-3 opacity-50" />
            <p>{{ searchKeyword || selectedCategory ? '没有找到符合条件的文章' : '暂无文章' }}</p>
          </div>

          <template v-else>
            <!-- 统计信息 -->
            <div class="flex justify-between items-center mb-4 text-sm text-gray-500">
              <span>共 {{ totalCount }} 篇文章，当前显示第 {{ currentPage }} 页</span>
              <span>显示 {{ paginatedArticles.length }} 条</span>
            </div>

            <n-data-table
              :columns="tableColumns"
              :data="paginatedArticles"
              :bordered="false"
              size="small"
            />

            <!-- 分页 -->
            <div v-if="totalPages > 1" class="flex justify-center mt-4">
              <n-pagination
                v-model:page="currentPage"
                :page-count="totalPages"
                :page-slot="5"
                show-quick-jumper
              />
            </div>
          </template>
        </n-spin>
      </n-card>

      <!-- 删除确认对话框 -->
      <n-modal v-model:show="showDeleteModal" preset="dialog" type="warning" title="确认删除">
        <template #default>
          <p>确定要删除文章《{{ articleToDelete?.title }}》吗？此操作不可恢复。</p>
        </template>
        <template #action>
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" :loading="deletingArticle" @click="handleDelete">确认删除</n-button>
        </template>
      </n-modal>
    </div>
</template>

<script setup>
import { NButton, NTag, NSpace } from 'naive-ui'
import { useAdminArticlesFeature } from '~/features/article-admin/composables/useAdminArticlesFeature'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const router = useRouter()
const message = useMessage()
const { getArticles, deleteArticle, getCategoryLabel, getCategoryType } = useAdminArticlesFeature()

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

// 表格列配置
const tableColumns = [
  {
    title: 'ID',
    key: 'id',
    width: 60,
    render: (row) => h(NTag, { size: 'small' }, () => row.id)
  },
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render: (row) => h('div', { class: 'flex items-center gap-2' }, [
      h('span', row.title),
      row.coverImage ? h(Icon, { name: 'image', size: 'sm', class: 'text-green-500' }) : null
    ])
  },
  {
    title: '类别',
    key: 'category',
    width: 100,
    render: (row) => h(NTag, { type: getCategoryType(row.category), size: 'small' }, () => getCategoryLabel(row.category))
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 120,
    render: (row) => h('span', { class: 'text-sm text-gray-500' }, formatDate(row.createdAt))
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: 120,
    render: (row) => h('span', { class: 'text-sm text-gray-500' }, formatDate(row.updatedAt))
  },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render: (row) => h(NSpace, { size: 'small' }, () => [
      h(NButton, { size: 'small', quaternary: true, type: 'primary', onClick: () => goToEditPage(row) }, {
        icon: () => h(resolveComponent('Icon'), { name: 'pencil-square', size: 'sm' })
      }),
      h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: () => confirmDelete(row) }, {
        icon: () => h(resolveComponent('Icon'), { name: 'trash', size: 'sm' })
      }),
      h('a', { href: getArticlePath(row), target: '_blank', class: 'inline-flex' }, [
        h(NButton, { size: 'small', quaternary: true, type: 'info' }, {
          icon: () => h(resolveComponent('Icon'), { name: 'eye', size: 'sm' })
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
    message.error('获取文章列表失败')
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
    message.success('文章已成功删除')
  } catch (error) {
    console.error('删除文章失败:', error)
    message.error('删除文章失败')
  } finally {
    deletingArticle.value = false
  }
}

onMounted(() => {
  fetchArticles()
})
</script>

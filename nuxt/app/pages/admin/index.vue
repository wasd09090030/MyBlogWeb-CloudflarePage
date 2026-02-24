<template>
  <div class="admin-dashboard">
      <!-- 欢迎标题 -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white">仪表板</h2>
          <p class="text-gray-500 dark:text-gray-400">欢迎回来！以下是您博客的概览。</p>
        </div>
        <n-button type="primary" @click="createArticle">
          <template #icon>
            <Icon name="plus-circle" size="sm" />
          </template>
          新建文章
        </n-button>
      </div>

      <!-- 统计卡片区域 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- 文章统计卡片 -->
        <NuxtLink to="/admin/articles" class="stat-card">
          <n-card hoverable>
            <div class="flex items-center">
              <div class="stat-icon bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                <Icon name="file-earmark-text" size="lg" />
              </div>
              <div class="ml-4">
                <p class="text-gray-500 dark:text-gray-400 text-sm">文章总数</p>
                <n-skeleton v-if="loading" text :width="60" />
                <p v-else class="text-2xl font-bold text-gray-800 dark:text-white">{{ articleCount }}</p>
              </div>
            </div>
          </n-card>
        </NuxtLink>

        <!-- 评论统计卡片 -->
        <NuxtLink to="/admin/comments" class="stat-card">
          <n-card hoverable>
            <div class="flex items-center">
              <div class="stat-icon bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
                <Icon name="chat-dots" size="lg" />
              </div>
              <div class="ml-4">
                <p class="text-gray-500 dark:text-gray-400 text-sm">评论总数</p>
                <n-skeleton v-if="loading" text :width="60" />
                <p v-else class="text-2xl font-bold text-gray-800 dark:text-white">{{ commentStats.total }}</p>
              </div>
            </div>
          </n-card>
        </NuxtLink>

        <!-- 待审核评论卡片 -->
        <NuxtLink to="/admin/comments" class="stat-card">
          <n-card hoverable :class="{ 'border-yellow-400': commentStats.pending > 0 }">
            <div class="flex items-center">
              <div class="stat-icon" :class="commentStats.pending > 0 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'">
                <Icon name="exclamation-circle" size="lg" />
              </div>
              <div class="ml-4">
                <p class="text-gray-500 dark:text-gray-400 text-sm">待审核</p>
                <n-skeleton v-if="loading" text :width="60" />
                <p v-else class="text-2xl font-bold" :class="commentStats.pending > 0 ? 'text-yellow-600' : 'text-gray-800 dark:text-white'">
                  {{ commentStats.pending }}
                </p>
              </div>
            </div>
          </n-card>
        </NuxtLink>

        <!-- 画廊管理卡片 -->
        <NuxtLink to="/admin/gallery" class="stat-card">
          <n-card hoverable>
            <div class="flex items-center">
              <div class="stat-icon bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400">
                <Icon name="images" size="lg" />
              </div>
              <div class="ml-4">
                <p class="text-gray-500 dark:text-gray-400 text-sm">画廊管理</p>
                <p class="text-sm text-gray-400">管理图片</p>
              </div>
            </div>
          </n-card>
        </NuxtLink>
      </div>

      <!-- 内容区域 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 最近文章 -->
        <div class="lg:col-span-2">
          <n-card title="最近文章">
            <template #header-extra>
              <NuxtLink to="/admin/articles">
                <n-button size="small" quaternary type="primary">查看全部</n-button>
              </NuxtLink>
            </template>

            <n-spin :show="loading">
              <div v-if="!loading && latestArticles.length === 0" class="text-center py-8 text-gray-400">
                <Icon name="inbox" size="3xl" class="mb-3 opacity-50" />
                <p>暂无文章，点击上方按钮创建第一篇文章吧！</p>
              </div>

              <n-data-table
                v-else
                :columns="tableColumns"
                :data="latestArticles"
                :bordered="false"
                size="small"
              />
            </n-spin>
          </n-card>
        </div>

        <!-- 快捷操作 -->
        <div>
          <n-card title="快捷操作">
            <div class="flex flex-col gap-2">
              <n-button block quaternary class="justify-start" @click="createArticle">
                <template #icon>
                  <Icon name="plus-circle" size="md" class="text-blue-500" />
                </template>
                创建新文章
              </n-button>
              <n-button block quaternary class="justify-start" @click="$router.push('/admin/articles')">
                <template #icon>
                  <Icon name="list-bullet" size="md" class="text-green-500" />
                </template>
                管理所有文章
              </n-button>
              <n-button block quaternary class="justify-start" @click="$router.push('/admin/comments')">
                <template #icon>
                  <Icon name="chat-left-text" size="md" class="text-cyan-500" />
                </template>
                审核评论
              </n-button>
              <n-button block quaternary class="justify-start" @click="$router.push('/admin/gallery')">
                <template #icon>
                  <Icon name="images" size="md" class="text-gray-500" />
                </template>
                管理画廊
              </n-button>
              <n-button block quaternary class="justify-start" @click="$router.push('/admin/beatmaps')">
                <template #icon>
                  <Icon name="musical-note" size="md" class="text-purple-500" />
                </template>
                管理谱面
              </n-button>
              <n-button block quaternary class="justify-start" @click="$router.push('/admin/imagebed')">
                <template #icon>
                  <Icon name="images" size="md" class="text-gray-500" />
                </template>
                管理图床
              </n-button>
              <n-button block quaternary class="justify-start" @click="$router.push('/admin/password')">
                <template #icon>
                  <Icon name="key" size="md" class="text-red-500" />
                </template>
                修改密码
              </n-button>
            </div>
          </n-card>
        </div>
      </div>
    </div>
</template>

<script setup>
import { NButton, NTag } from 'naive-ui'
import { useAdminArticlesFeature } from '~/features/article-admin/composables/useAdminArticlesFeature'
import { useAdminCommentsFeature } from '~/features/article-admin/composables/useAdminCommentsFeature'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const router = useRouter()
const config = useRuntimeConfig()
const baseURL = config.public.apiBase
const authStore = useAuthStore()
const { getArticles, getCategoryLabel, getCategoryType } = useAdminArticlesFeature()
const { getAllComments, getPendingComments } = useAdminCommentsFeature()

const loading = ref(true)
const articleCount = ref(0)
const latestArticles = ref([])
const commentStats = ref({ total: 0, pending: 0 })

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') {
    return '/'
  }
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}

// 表格列配置
const tableColumns = [
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render: (row) => h(
      'a',
      {
        href: getArticlePath(row),
        target: '_blank',
        class: 'text-primary hover:underline'
      },
      row.title
    )
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
    render: (row) => formatDate(row.createdAt)
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render: (row) => h(
      NButton,
      {
        size: 'small',
        quaternary: true,
        type: 'primary',
        onClick: () => editArticle(row.id)
      },
      { 
        icon: () => h(resolveComponent('Icon'), { name: 'pencil-square', size: 'sm' })
      }
    )
  }
]

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const createArticle = () => {
  router.push('/admin/articles/create')
}

const editArticle = (id) => {
  router.push(`/admin/articles/${id}`)
}

const fetchDashboardData = async () => {
  loading.value = true
  try {
    // 获取文章统计
    const articlesResponse = await getArticles({ summary: false, page: 1, limit: 10 })
    
    if (articlesResponse) {
      if (articlesResponse.data) {
        articleCount.value = articlesResponse.total || 0
        latestArticles.value = articlesResponse.data.slice(0, 5) || []
      } else if (Array.isArray(articlesResponse)) {
        articleCount.value = articlesResponse.length
        latestArticles.value = articlesResponse.slice(0, 5)
      }
    }

    // 获取评论统计
    await fetchCommentStats()
  } catch (error) {
    console.error('获取仪表板数据失败:', error)
    articleCount.value = 0
    latestArticles.value = []
  } finally {
    loading.value = false
  }
}

const fetchCommentStats = async () => {
  try {
    const allComments = await getAllComments()
    commentStats.value.total = Array.isArray(allComments) ? allComments.length : 0

    const pendingComments = await getPendingComments()
    commentStats.value.pending = Array.isArray(pendingComments) ? pendingComments.length : 0
  } catch (error) {
    console.error('获取评论统计失败:', error)
    commentStats.value = { total: 0, pending: 0 }
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script>

<style scoped>
.stat-card {
  display: block;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

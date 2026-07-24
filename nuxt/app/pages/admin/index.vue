<template>
  <div class="admin-dashboard">
    <!-- 欢迎标题 -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">仪表板</h2>
        <p class="text-gray-500 dark:text-gray-400">欢迎回来！以下是您博客的概览。</p>
      </div>
      <UButton color="primary" @click="createArticle">
        <template #leading>
          <Icon name="plus-circle" size="sm" />
        </template>
        新建文章
      </UButton>
    </div>

    <!-- 统计卡片区域 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <!-- 文章统计卡片 -->
      <NuxtLink to="/admin/articles" class="stat-card">
        <UCard>
          <div class="flex items-center">
            <div class="stat-icon bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              <Icon name="file-earmark-text" size="lg" />
            </div>
            <div class="ml-4">
              <p class="text-gray-500 dark:text-gray-400 text-sm">文章总数</p>
              <USkeleton v-if="loading" class="h-6 w-16 mt-1" />
              <p v-else class="text-2xl font-bold text-gray-800 dark:text-white">{{ articleCount }}</p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <!-- 评论统计卡片 -->
      <NuxtLink to="/admin/comments" class="stat-card">
        <UCard>
          <div class="flex items-center">
            <div class="stat-icon bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
              <Icon name="chat-dots" size="lg" />
            </div>
            <div class="ml-4">
              <p class="text-gray-500 dark:text-gray-400 text-sm">评论总数</p>
              <USkeleton v-if="loading" class="h-6 w-16 mt-1" />
              <p v-else class="text-2xl font-bold text-gray-800 dark:text-white">{{ commentStats.total }}</p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <!-- 待审核评论卡片 -->
      <NuxtLink to="/admin/comments" class="stat-card">
        <UCard :class="{ 'border-yellow-400': commentStats.pending > 0 }">
          <div class="flex items-center">
            <div class="stat-icon" :class="commentStats.pending > 0 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'">
              <Icon name="exclamation-circle" size="lg" />
            </div>
            <div class="ml-4">
              <p class="text-gray-500 dark:text-gray-400 text-sm">待审核</p>
              <USkeleton v-if="loading" class="h-6 w-16 mt-1" />
              <p v-else class="text-2xl font-bold" :class="commentStats.pending > 0 ? 'text-yellow-600' : 'text-gray-800 dark:text-white'">
                {{ commentStats.pending }}
              </p>
            </div>
          </div>
        </UCard>
      </NuxtLink>

      <!-- 画廊管理卡片 -->
      <NuxtLink to="/admin/gallery" class="stat-card">
        <UCard>
          <div class="flex items-center">
            <div class="stat-icon bg-cyan-100 dark:bg-cyan-900 text-cyan-600 dark:text-cyan-400">
              <Icon name="images" size="lg" />
            </div>
            <div class="ml-4">
              <p class="text-gray-500 dark:text-gray-400 text-sm">画廊管理</p>
              <p class="text-sm text-gray-400">管理图片</p>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>

    <!-- 内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 最近文章 -->
      <div class="lg:col-span-2">
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold">最近文章</h3>
              <NuxtLink to="/admin/articles">
                <UButton size="sm" variant="ghost" color="primary">查看全部</UButton>
              </NuxtLink>
            </div>
          </template>

          <div v-if="loading" class="flex justify-center py-8">
            <USpinner />
          </div>
          <div v-else-if="latestArticles.length === 0" class="text-center py-8 text-gray-400">
            <Icon name="inbox" size="3xl" class="mb-3 opacity-50" />
            <p>暂无文章，点击上方按钮创建第一篇文章吧！</p>
          </div>
          <UTable v-else :data="latestArticles" :columns="tableColumns" />
        </UCard>
      </div>

      <!-- 快捷操作 -->
      <div>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">快捷操作</h3>
          </template>
          <div class="flex flex-col gap-2">
            <UButton block variant="ghost" color="primary" class="justify-start" @click="createArticle">
              <template #leading>
                <Icon name="plus-circle" size="md" class="text-blue-500" />
              </template>
              创建新文章
            </UButton>
            <UButton block variant="ghost" color="primary" class="justify-start" @click="$router.push('/admin/articles')">
              <template #leading>
                <Icon name="list-bullet" size="md" class="text-green-500" />
              </template>
              管理所有文章
            </UButton>
            <UButton block variant="ghost" color="primary" class="justify-start" @click="$router.push('/admin/comments')">
              <template #leading>
                <Icon name="chat-left-text" size="md" class="text-cyan-500" />
              </template>
              审核评论
            </UButton>
            <UButton block variant="ghost" color="primary" class="justify-start" @click="$router.push('/admin/gallery')">
              <template #leading>
                <Icon name="images" size="md" class="text-gray-500" />
              </template>
              管理画廊
            </UButton>
            <UButton
              block
              variant="ghost"
              color="primary"
              class="justify-start"
              :loading="isTriggeringPagesDeploy"
              @click="triggerPagesDeployHook"
            >
              <template #leading>
                <Icon name="cloud-arrow-down" size="md" class="text-orange-500" />
              </template>
              触发 Pages 重构发布
            </UButton>
            <UButton block variant="ghost" color="primary" class="justify-start" @click="$router.push('/admin/imagebed')">
              <template #leading>
                <Icon name="images" size="md" class="text-gray-500" />
              </template>
              管理图床
            </UButton>
            <UButton block variant="ghost" color="primary" class="justify-start" @click="$router.push('/admin/password')">
              <template #leading>
                <Icon name="key" size="md" class="text-red-500" />
              </template>
              修改密码
            </UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup>
import { UButton, UBadge } from '#components'
import { useAdminArticlesFeature } from '~/features/article-admin/composables/useAdminArticlesFeature'
import { useAdminCommentsFeature } from '~/features/article-admin/composables/useAdminCommentsFeature'
import { API_ENDPOINTS } from '~/shared/api/endpoints'
import { mapErrorToUserMessage } from '~/shared/errors'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()
const { getArticles, getCategoryLabel, getCategoryType } = useAdminArticlesFeature()
const { getAllComments, getPendingComments } = useAdminCommentsFeature()

const loading = ref(true)
const isTriggeringPagesDeploy = ref(false)
const articleCount = ref(0)
const latestArticles = ref([])
const commentStats = ref({ total: 0, pending: 0 })

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') {
    return '/'
  }
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}

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

// 表格列配置（UTable 语法）
const tableColumns = [
  {
    id: 'title',
    header: '标题',
    cell: ({ row }) => h(
      'a',
      {
        href: getArticlePath(row.original),
        target: '_blank',
        class: 'text-primary hover:underline'
      },
      row.original.title
    )
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
    cell: ({ row }) => formatDate(row.original.createdAt)
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => h(resolveComponent('UButton'), {
      size: 'sm',
      variant: 'ghost',
      color: 'primary',
      onClick: () => editArticle(row.original.id)
    }, {
      default: () => '编辑',
      leading: () => h(resolveComponent('Icon'), { name: 'pencil-square', size: 'sm' })
    })
  }
]

const createArticle = () => {
  router.push('/admin/articles/create')
}

const editArticle = (id) => {
  router.push(`/admin/articles/${id}`)
}

const triggerPagesDeployHook = async () => {
  isTriggeringPagesDeploy.value = true
  try {
    const result = await authStore.authFetch(
      API_ENDPOINTS.ops.triggerPagesDeployHook,
      { method: 'POST' }
    )

    if (result?.success === false) {
      toast.add({ title: result.message || '触发 Cloudflare Pages 重构失败', color: 'error' })
      return
    }

    toast.add({ title: result?.message || '已触发 Cloudflare Pages 重构发布', color: 'success' })
  } catch (error) {
    console.error('触发 Cloudflare Pages Deploy Hook 失败:', error)
    toast.add({ title: mapErrorToUserMessage(error, '触发 Cloudflare Pages 重构失败'), color: 'error' })
  } finally {
    isTriggeringPagesDeploy.value = false
  }
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

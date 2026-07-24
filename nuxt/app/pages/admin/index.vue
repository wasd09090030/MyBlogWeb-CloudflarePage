<template>
  <div class="space-y-8">
    <!-- 顶部欢迎区 / 系统状态 -->
    <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-1.5">
        <p class="text-xs uppercase tracking-[0.18em] text-muted font-medium">
          {{ greetingEyebrow }}
        </p>
        <h1 class="font-display text-2xl sm:text-3xl font-semibold text-highlighted tracking-tight">
          {{ greeting }}，管理员
        </h1>
        <p class="text-sm text-muted max-w-xl">
          这是 {{ formattedDate }} 的后台快照。下面是您博客当前的健康度与待处理事项。
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <UButton
          variant="soft"
          color="neutral"
          icon="heroicons:cloud-arrow-down"
          :loading="isTriggeringPagesDeploy"
          @click="triggerPagesDeployHook"
        >
          触发 Pages 重构
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

    <!-- 统计卡片：4 个一组 + 渐变底线作为 signature -->
    <section
      class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      aria-label="站点统计"
    >
      <NuxtLink
        v-for="(stat, index) in stats"
        :key="stat.label"
        :to="stat.to"
        class="group block focus:outline-none"
      >
        <UCard
          variant="subtle"
          :ui="{ root: 'relative overflow-hidden ring ring-default/40 hover:ring-primary/40 transition-colors', body: 'p-5' }"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="space-y-2 min-w-0 flex-1">
              <p class="text-[11px] uppercase tracking-wider text-muted font-medium">
                {{ stat.label }}
              </p>
              <USkeleton v-if="loading" class="h-8 w-20" />
              <p
                v-else
                class="font-display text-3xl font-semibold tabular-nums text-highlighted leading-none"
              >
                {{ stat.value }}
              </p>
              <p class="text-xs text-muted truncate">
                {{ stat.hint }}
              </p>
            </div>
            <span
              class="flex shrink-0 items-center justify-center size-10 rounded-lg"
              :class="stat.iconBg"
            >
              <Icon :name="stat.icon" size="md" :class="stat.iconColor" />
            </span>
          </div>
          <!-- 签名细节：底部渐变条 -->
          <span
            class="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary/60 via-primary to-primary/60 origin-left scale-x-50 group-hover:scale-x-100 transition-transform duration-300 ease-out"
            :style="{ animationDelay: `${index * 60}ms` }"
          />
        </UCard>
      </NuxtLink>
    </section>

    <!-- 主内容区：最近文章 + 快捷操作 -->
    <section class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- 最近文章 -->
      <UCard
        variant="subtle"
        :ui="{ root: 'xl:col-span-2 ring ring-default/40', header: 'flex items-center justify-between gap-2 px-5 pt-5', body: 'p-0' }"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <span class="flex size-1.5 rounded-full bg-primary" />
            <h2 class="font-display text-base font-semibold text-highlighted">最近文章</h2>
            <span class="text-xs text-muted font-mono">
              {{ loading ? '—' : `共 ${articleCount}` }}
            </span>
          </div>
          <UButton
            to="/admin/articles"
            variant="ghost"
            color="neutral"
            size="sm"
            trailing-icon="heroicons:arrow-right"
          >
            查看全部
          </UButton>
        </template>

        <div v-if="loading" class="flex items-center justify-center py-16">
          <UIcon name="heroicons:arrow-path" class="size-5 text-muted animate-spin" />
        </div>

        <div v-else-if="latestArticles.length === 0" class="px-5 py-16 text-center">
          <div class="inline-flex items-center justify-center size-12 rounded-full bg-elevated/60 mb-3">
            <Icon name="heroicons:inbox" size="md" class="text-muted" />
          </div>
          <p class="text-sm text-muted">还没有任何文章。</p>
          <UButton
            color="primary"
            variant="soft"
            size="sm"
            class="mt-4"
            icon="heroicons:plus"
            @click="createArticle"
          >
            创建第一篇文章
          </UButton>
        </div>

        <UTable
          v-else
          :data="latestArticles"
          :columns="tableColumns"
          :ui="{ tr: 'hover:bg-elevated/40 transition-colors' }"
        />
      </UCard>

      <!-- 快捷操作 / 系统信息 -->
      <div class="space-y-6">
        <UCard
          variant="subtle"
          :ui="{ root: 'ring ring-default/40', header: 'px-5 pt-5', body: 'p-3' }"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <span class="flex size-1.5 rounded-full bg-primary" />
              <h2 class="font-display text-base font-semibold text-highlighted">快捷操作</h2>
            </div>
          </template>

          <div class="flex flex-col">
            <UButton
              v-for="action in quickActions"
              :key="action.label"
              variant="ghost"
              color="neutral"
              block
              class="!justify-between !px-3 !py-2.5 rounded-md"
              :to="action.to"
              :loading="action.loading"
              @click="action.onClick"
            >
              <span class="flex items-center gap-2.5 min-w-0">
                <span
                  class="flex shrink-0 items-center justify-center size-7 rounded-md"
                  :class="action.iconBg"
                >
                  <Icon :name="action.icon" size="sm" :class="action.iconColor" />
                </span>
                <span class="text-sm font-medium text-highlighted truncate">{{ action.label }}</span>
              </span>
              <Icon name="heroicons:chevron-right" size="sm" class="text-muted shrink-0" />
            </UButton>
          </div>
        </UCard>

        <UCard
          variant="subtle"
          :ui="{ root: 'ring ring-default/40', header: 'px-5 pt-5', body: 'p-5 space-y-3' }"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <span class="flex size-1.5 rounded-full bg-primary" />
              <h2 class="font-display text-base font-semibold text-highlighted">站点状态</h2>
            </div>
          </template>

          <dl class="space-y-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted">站点 URL</dt>
              <dd class="font-mono text-xs text-highlighted truncate max-w-[12rem]">
                {{ siteUrl }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted">SSR 模式</dt>
              <UBadge variant="subtle" color="success" size="sm">CSR · 后台</UBadge>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted">图床</dt>
              <UBadge
                :variant="'subtle'"
                :color="isConfigured ? 'success' : 'warning'"
                size="sm"
              >
                {{ isConfigured ? '已配置' : '未配置' }}
              </UBadge>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-muted">当前时间</dt>
              <dd class="font-mono text-xs text-highlighted">{{ sessionInfo }}</dd>
            </div>
          </dl>
        </UCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ArticleSummary, PagedArticleResult } from '~/types/api'
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
const { public: publicConfig } = useRuntimeConfig()
const siteUrl = publicConfig.siteUrl || '/'

const { getArticles, getCategoryLabel } = useAdminArticlesFeature()
const { getAllComments, getPendingComments } = useAdminCommentsFeature()

const loading = ref(true)
const isTriggeringPagesDeploy = ref(false)
const isConfigured = ref(true)
const articleCount = ref(0)
const latestArticles = ref<ArticleSummary[]>([])
const commentStats = ref({ total: 0, pending: 0 })

const formattedDate = computed(() => {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  })
})

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const greetingEyebrow = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
})

const sessionInfo = ref('—')
let sessionTimer = null

onMounted(() => {
  const tick = () => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    sessionInfo.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  }
  tick()
  sessionTimer = setInterval(tick, 1000)
})

onBeforeUnmount(() => {
  if (sessionTimer) clearInterval(sessionTimer)
})

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') return '/'
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
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const stats = computed(() => [
  {
    label: '文章总数',
    value: loading.value ? '—' : articleCount.value,
    hint: '管理所有已发布的文章',
    icon: 'heroicons:document-text',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    to: '/admin/articles'
  },
  {
    label: '评论总数',
    value: loading.value ? '—' : commentStats.value.total,
    hint: '历史所有评论',
    icon: 'heroicons:chat-bubble-oval-left',
    iconBg: 'bg-cyan-500/10 dark:bg-cyan-400/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    to: '/admin/comments'
  },
  {
    label: '待审核',
    value: loading.value ? '—' : commentStats.value.pending,
    hint: commentStats.value.pending > 0 ? '需要您处理' : '没有待处理项',
    icon: 'heroicons:exclamation-circle',
    iconBg: commentStats.value.pending > 0
      ? 'bg-amber-500/10 dark:bg-amber-400/10'
      : 'bg-elevated/60',
    iconColor: commentStats.value.pending > 0
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-muted',
    to: '/admin/comments'
  },
  {
    label: '图床',
    value: isConfigured.value ? '在线' : '未配置',
    hint: isConfigured.value ? 'Cloudflare R2 已就绪' : '前往图床管理配置',
    icon: 'heroicons:circle-stack',
    iconBg: isConfigured.value
      ? 'bg-emerald-500/10 dark:bg-emerald-400/10'
      : 'bg-amber-500/10 dark:bg-amber-400/10',
    iconColor: isConfigured.value
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400',
    to: '/admin/imagebed'
  }
])

type QuickAction = {
  label: string
  icon: string
  iconBg: string
  iconColor: string
  loading?: boolean
  to?: string
  onClick?: () => Promise<unknown>
}

const quickActions = computed<QuickAction[]>(() => [
  {
    label: '写一篇新文章',
    icon: 'heroicons:pencil-square',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    onClick: createArticle
  },
  {
    label: '审核评论',
    icon: 'heroicons:chat-bubble-left-right',
    iconBg: 'bg-amber-500/10 dark:bg-amber-400/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    to: '/admin/comments'
  },
  {
    label: '管理图床',
    icon: 'heroicons:circle-stack',
    iconBg: 'bg-cyan-500/10 dark:bg-cyan-400/10',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    to: '/admin/imagebed'
  },
  {
    label: '修改密码',
    icon: 'heroicons:key',
    iconBg: 'bg-rose-500/10 dark:bg-rose-400/10',
    iconColor: 'text-rose-600 dark:text-rose-400',
    to: '/admin/password'
  }
])

const tableColumns = computed<TableColumn<ArticleSummary>[]>(() => [
  {
    id: 'title',
    header: '标题',
    cell: ({ row }) =>
      h('a', {
        href: getArticlePath(row.original),
        target: '_blank',
        rel: 'noopener',
        class: 'flex items-center gap-2 text-primary hover:underline truncate max-w-md'
      }, [
        row.original.coverImage
          ? h('span', { class: 'inline-flex size-1.5 rounded-full bg-primary shrink-0' })
          : null,
        h('span', { class: 'truncate font-medium text-highlighted' }, row.original.title)
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
    header: '创建时间',
    meta: { class: { th: 'hidden sm:table-cell', td: 'hidden sm:table-cell' } },
    cell: ({ row }) =>
      h('span', { class: 'font-mono text-xs text-muted' }, formatDate(row.original.createdAt))
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h(resolveComponent('UButton'), {
        size: 'xs',
        variant: 'ghost',
        color: 'neutral',
        icon: 'heroicons:pencil-square',
        onClick: () => editArticle(row.original.id)
      })
  }
])

const createArticle = () => router.push('/admin/articles/create')
const editArticle = (id) => router.push(`/admin/articles/${id}`)

const triggerPagesDeployHook = async () => {
  isTriggeringPagesDeploy.value = true
  try {
    const result = await authStore.authFetch(API_ENDPOINTS.ops.triggerPagesDeployHook, { method: 'POST' }) as { success?: boolean, message?: string }
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
    const articlesResponse = await getArticles({ summary: false, page: 1, limit: 10 })
    const normalizedArticles: { data: ArticleSummary[], total: number } = Array.isArray(articlesResponse)
      ? { data: articlesResponse, total: articlesResponse.length }
      : { data: (articlesResponse as PagedArticleResult).data, total: (articlesResponse as PagedArticleResult).total }
    articleCount.value = normalizedArticles.total
    latestArticles.value = normalizedArticles.data.slice(0, 5)
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

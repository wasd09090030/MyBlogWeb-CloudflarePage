<template>
  <div class="space-y-6">
    <!-- 页面标题 + 标签 -->
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="space-y-1.5">
        <p class="text-xs uppercase tracking-[0.18em] text-muted font-medium">互动</p>
        <h1 class="font-display text-2xl font-semibold text-highlighted tracking-tight">评论管理</h1>
        <p class="text-sm text-muted">
          <span v-if="!loading" class="font-mono text-highlighted">{{ comments.length }}</span>
          <span v-else>—</span>
          条 · 当前查看
          <span class="text-highlighted">{{ currentTab === 'pending' ? '待审核' : '全部' }}</span>
        </p>
      </div>

      <UTabs
        v-model="currentTab"
        :items="tabItems"
        color="primary"
        variant="pill"
        size="sm"
        :ui="{ list: 'bg-elevated/40 ring ring-default/40' }"
      />
    </header>

    <!-- 列表 -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="heroicons:arrow-path" class="size-5 text-muted animate-spin" />
    </div>

    <div v-else-if="comments.length === 0" class="px-6 py-20 text-center ring ring-default/40 rounded-xl bg-elevated/20">
      <div class="inline-flex items-center justify-center size-12 rounded-full bg-elevated/60 mb-3">
        <Icon name="heroicons:chat-bubble-oval-left" size="md" class="text-muted" />
      </div>
      <p class="text-sm text-muted">
        {{ currentTab === 'pending' ? '暂无待审核评论' : '暂无评论' }}
      </p>
    </div>

    <div v-else class="space-y-3">
      <UCard
        v-for="comment in comments"
        :key="comment.id"
        variant="subtle"
        :ui="{ root: 'ring ring-default/40 hover:ring-primary/30 transition-colors', body: 'p-5' }"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <!-- 评论主体 -->
          <div class="flex-1 min-w-0 space-y-3">
            <!-- 作者行 -->
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="flex shrink-0 items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-bold">
                {{ comment.author?.charAt(0)?.toUpperCase() || '?' }}
              </span>
              <span class="font-medium text-highlighted">{{ comment.author }}</span>
              <UBadge :color="getStatusType(comment.status)" variant="subtle" size="sm">
                {{ getStatusText(comment.status) }}
              </UBadge>
              <span class="text-xs text-muted font-mono">#{{ comment.id }}</span>
            </div>

            <!-- 评论内容 -->
            <blockquote class="border-l-2 border-primary/40 pl-4 text-sm text-toned leading-relaxed">
              {{ comment.content }}
            </blockquote>

            <!-- 元信息 -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span class="inline-flex items-center gap-1">
                <Icon name="heroicons:clock" size="xs" />
                {{ formatDate(comment.createdAt) }}
              </span>
              <span v-if="comment.email" class="inline-flex items-center gap-1">
                <Icon name="heroicons:envelope" size="xs" />
                <span class="font-mono">{{ comment.email }}</span>
              </span>
              <span v-if="comment.website" class="inline-flex items-center gap-1">
                <Icon name="heroicons:link" size="xs" />
                <a :href="comment.website" target="_blank" rel="noopener" class="hover:text-primary truncate max-w-[16rem]">
                  {{ comment.website }}
                </a>
              </span>
              <span v-if="comment.userIp" class="inline-flex items-center gap-1">
                <Icon name="heroicons:map-pin" size="xs" />
                <span class="font-mono">IP · {{ comment.userIp }}</span>
              </span>
              <span class="inline-flex items-center gap-1">
                <Icon name="heroicons:heart" size="xs" class="text-rose-500" />
                {{ comment.likes }}
              </span>
            </div>

            <UBadge v-if="comment.article" color="info" variant="subtle" size="sm">
              <Icon name="heroicons:document-text" size="xs" class="mr-1" />
              {{ comment.article.title }}
            </UBadge>
          </div>

          <!-- 操作 -->
          <div class="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-stretch lg:w-32">
            <UButton
              v-if="comment.status === 'pending'"
              color="success"
              variant="soft"
              size="sm"
              icon="heroicons:check"
              :disabled="updating"
              block
              @click="handleUpdateStatus(comment.id, 'approved')"
            >
              通过
            </UButton>
            <UButton
              v-else-if="comment.status === 'approved'"
              color="warning"
              variant="soft"
              size="sm"
              icon="heroicons:eye-slash"
              :disabled="updating"
              block
              @click="handleUpdateStatus(comment.id, 'rejected')"
            >
              隐藏
            </UButton>
            <UButton
              v-else
              color="primary"
              variant="soft"
              size="sm"
              icon="heroicons:eye"
              :disabled="updating"
              block
              @click="handleUpdateStatus(comment.id, 'approved')"
            >
              显示
            </UButton>
            <UButton
              color="error"
              variant="ghost"
              size="sm"
              icon="heroicons:trash"
              :disabled="updating"
              block
              @click="confirmDelete(comment)"
            >
              删除
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- 删除确认 -->
    <UModal
      v-model:open="showDeleteModal"
      :title="'确认删除评论'"
      :description="'此操作不可撤销。'"
    >
      <template #body>
        <p class="mb-3 text-sm text-muted">确定要删除这条评论吗？</p>
        <div v-if="commentToDelete" class="rounded-lg border border-default bg-elevated/40 p-3 text-sm">
          <p class="font-medium text-highlighted">{{ commentToDelete.author }}</p>
          <p class="mt-1 text-toned">{{ commentToDelete.content }}</p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">取消</UButton>
          <UButton color="error" :loading="deleting" @click="handleDelete">确认删除</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useAdminCommentsFeature } from '~/features/article-admin/composables/useAdminCommentsFeature'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const toast = useToast()
const {
  getAllComments,
  getPendingComments,
  updateCommentStatus,
  deleteComment,
  getStatusType,
  getStatusText
} = useAdminCommentsFeature()

const comments = ref([])
const loading = ref(true)
const updating = ref(false)
const deleting = ref(false)
const currentTab = ref('pending')
const commentToDelete = ref(null)
const showDeleteModal = ref(false)

const tabItems = [
  { label: '待审核', value: 'pending' },
  { label: '全部评论', value: 'all' }
]

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const fetchComments = async () => {
  loading.value = true
  try {
    comments.value = currentTab.value === 'pending'
      ? await getPendingComments()
      : await getAllComments()
  } catch (error) {
    console.error('获取评论失败:', error)
    toast.add({ title: '获取评论失败', color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleUpdateStatus = async (commentId, status) => {
  updating.value = true
  try {
    await updateCommentStatus(commentId, status)
    await fetchComments()
    toast.add({ title: '评论状态已更新', color: 'success' })
  } catch (error) {
    console.error('更新评论状态失败:', error)
    toast.add({ title: '更新评论状态失败', color: 'error' })
  } finally {
    updating.value = false
  }
}

const confirmDelete = (comment) => {
  commentToDelete.value = comment
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!commentToDelete.value) return
  deleting.value = true
  try {
    await deleteComment(commentToDelete.value.id)
    showDeleteModal.value = false
    commentToDelete.value = null
    await fetchComments()
    toast.add({ title: '评论已删除', color: 'success' })
  } catch (error) {
    console.error('删除评论失败:', error)
    toast.add({ title: '删除评论失败', color: 'error' })
  } finally {
    deleting.value = false
  }
}

watch(currentTab, () => fetchComments())

onMounted(() => fetchComments())
</script>
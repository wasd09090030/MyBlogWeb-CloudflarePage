<template>
  <div class="comment-manager">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">评论管理</h2>
      <div class="flex gap-1">
        <UButton
          :color="currentTab === 'pending' ? 'primary' : 'neutral'"
          :variant="currentTab === 'pending' ? 'solid' : 'ghost'"
          @click="currentTab = 'pending'"
        >
          待审核
          <UBadge :value="pendingCount" :max="99" class="ml-2" color="warning" />
        </UButton>
        <UButton
          :color="currentTab === 'all' ? 'primary' : 'neutral'"
          :variant="currentTab === 'all' ? 'solid' : 'ghost'"
          @click="currentTab = 'all'"
        >
          全部评论
        </UButton>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-12">
      <USpinner />
    </div>
    <div v-else-if="comments.length === 0" class="text-center py-16 text-gray-400">
      <Icon name="chat-dots" size="3xl" class="mb-3 opacity-50" />
      <p>{{ currentTab === 'pending' ? '暂无待审核评论' : '暂无评论' }}</p>
    </div>

    <!-- 评论列表 -->
    <div v-else class="space-y-4">
      <UCard v-for="comment in comments" :key="comment.id" class="comment-card">
        <div class="flex flex-col lg:flex-row lg:justify-between gap-4">
          <!-- 评论信息 -->
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <Icon name="person-circle" size="md" class="text-gray-400" />
              <span class="font-semibold text-gray-800 dark:text-white">{{ comment.author }}</span>
              <UBadge :color="getStatusType(comment.status)" size="sm" variant="subtle">
                {{ getStatusText(comment.status) }}
              </UBadge>
            </div>

            <p class="text-gray-700 dark:text-gray-300 mb-3">{{ comment.content }}</p>

            <div class="flex flex-wrap gap-4 text-sm text-gray-500">
              <span class="flex items-center gap-1">
                <Icon name="calendar" size="xs" />
                {{ formatDate(comment.createdAt) }}
              </span>
              <span v-if="comment.email" class="flex items-center gap-1">
                <Icon name="mail" size="xs" />
                {{ comment.email }}
              </span>
              <span v-if="comment.website" class="flex items-center gap-1">
                <Icon name="link" size="xs" />
                <a :href="comment.website" target="_blank" class="hover:text-primary">
                  {{ comment.website }}
                </a>
              </span>
              <span v-if="comment.userIp" class="flex items-center gap-1">
                <Icon name="map-pin" size="xs" />
                IP: {{ comment.userIp }}
              </span>
            </div>

            <div v-if="comment.article" class="mt-2">
              <UBadge color="info" size="sm" variant="subtle">
                <Icon name="file-earmark-text" size="xs" class="mr-1" />
                文章: {{ comment.article.title }}
              </UBadge>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex flex-col gap-2 lg:items-end">
            <div v-if="comment.status === 'pending'" class="flex gap-1">
              <UButton
                color="success"
                size="sm"
                :disabled="updating"
                @click="handleUpdateStatus(comment.id, 'approved')"
              >
                <template #leading>
                  <Icon name="check-circle" size="sm" />
                </template>
                通过
              </UButton>
              <UButton
                color="warning"
                size="sm"
                :disabled="updating"
                @click="handleUpdateStatus(comment.id, 'rejected')"
              >
                <template #leading>
                  <Icon name="x-mark" size="sm" />
                </template>
                拒绝
              </UButton>
            </div>

            <div v-else class="flex gap-1">
              <UButton
                v-if="comment.status === 'approved'"
                color="warning"
                size="sm"
                :disabled="updating"
                @click="handleUpdateStatus(comment.id, 'rejected')"
              >
                <template #leading>
                  <Icon name="eye" size="sm" />
                </template>
                隐藏
              </UButton>
              <UButton
                v-if="comment.status === 'rejected'"
                color="success"
                size="sm"
                :disabled="updating"
                @click="handleUpdateStatus(comment.id, 'approved')"
              >
                <template #leading>
                  <Icon name="eye" size="sm" />
                </template>
                显示
              </UButton>
            </div>

            <UButton
              color="error"
              size="sm"
              :disabled="updating"
              @click="confirmDelete(comment)"
            >
              <template #leading>
                <Icon name="trash" size="sm" />
              </template>
              删除
            </UButton>

            <div class="text-sm text-gray-400 flex items-center gap-1">
              <Icon name="heart" size="xs" class="text-red-400" :solid="true" />
              {{ comment.likes }} 个赞
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- 删除确认对话框 -->
    <UModal v-model:open="showDeleteModal" :title="'确认删除评论'" :description="'此操作不可撤销'">
      <template #body>
        <p class="mb-3">确定要删除这条评论吗？</p>
        <UCard v-if="commentToDelete" size="sm">
          <strong>{{ commentToDelete.author }}</strong>: {{ commentToDelete.content }}
        </UCard>
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

<script setup>
import { useAdminCommentsFeature } from '~/features/article-admin/composables/useAdminCommentsFeature'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const toast = useToast()
const { getAllComments, getPendingComments, updateCommentStatus, deleteComment, getStatusType, getStatusText } = useAdminCommentsFeature()

const comments = ref([])
const loading = ref(true)
const updating = ref(false)
const deleting = ref(false)
const currentTab = ref('pending')
const commentToDelete = ref(null)
const showDeleteModal = ref(false)

const pendingCount = computed(() => {
  return comments.value.filter(comment => comment.status === 'pending').length
})

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const fetchComments = async () => {
  loading.value = true
  try {
    if (currentTab.value === 'pending') {
      comments.value = await getPendingComments()
    } else {
      comments.value = await getAllComments()
    }
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

watch(currentTab, () => {
  fetchComments()
})

onMounted(() => {
  fetchComments()
})
</script>

<style scoped>
.comment-card {
  transition: transform 0.2s ease;
}

.comment-card:hover {
  transform: translateY(-2px);
}
</style>

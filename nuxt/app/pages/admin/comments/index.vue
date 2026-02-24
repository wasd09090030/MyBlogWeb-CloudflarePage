<template>
  <div class="comment-manager">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">评论管理</h2>
        <n-button-group>
          <n-button
            :type="currentTab === 'pending' ? 'primary' : 'default'"
            @click="currentTab = 'pending'"
          >
            待审核
            <n-badge :value="pendingCount" :max="99" class="ml-2" type="warning" />
          </n-button>
          <n-button
            :type="currentTab === 'all' ? 'primary' : 'default'"
            @click="currentTab = 'all'"
          >
            全部评论
          </n-button>
        </n-button-group>
      </div>

      <!-- 加载状态 -->
      <n-spin :show="loading">
        <div v-if="!loading && comments.length === 0" class="text-center py-16 text-gray-400">
          <Icon name="chat-dots" size="3xl" class="mb-3 opacity-50" />
          <p>{{ currentTab === 'pending' ? '暂无待审核评论' : '暂无评论' }}</p>
        </div>

        <!-- 评论列表 -->
        <div v-else class="space-y-4">
          <n-card v-for="comment in comments" :key="comment.id" class="comment-card">
            <div class="flex flex-col lg:flex-row lg:justify-between gap-4">
              <!-- 评论信息 -->
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <Icon name="person-circle" size="md" class="text-gray-400" />
                  <span class="font-semibold text-gray-800 dark:text-white">{{ comment.author }}</span>
                  <n-tag :type="getStatusType(comment.status)" size="small">
                    {{ getStatusText(comment.status) }}
                  </n-tag>
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
                  <n-tag type="info" size="small">
                    <Icon name="file-earmark-text" size="xs" class="mr-1" />
                    文章: {{ comment.article.title }}
                  </n-tag>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="flex flex-col gap-2 lg:items-end">
                <n-button-group v-if="comment.status === 'pending'">
                  <n-button
                    type="success"
                    size="small"
                    :disabled="updating"
                    @click="handleUpdateStatus(comment.id, 'approved')"
                  >
                    <template #icon>
                      <Icon name="check-circle" size="sm" />
                    </template>
                    通过
                  </n-button>
                  <n-button
                    type="warning"
                    size="small"
                    :disabled="updating"
                    @click="handleUpdateStatus(comment.id, 'rejected')"
                  >
                    <template #icon>
                      <Icon name="x-mark" size="sm" />
                    </template>
                    拒绝
                  </n-button>
                </n-button-group>

                <n-button-group v-else>
                  <n-button
                    v-if="comment.status === 'approved'"
                    type="warning"
                    size="small"
                    :disabled="updating"
                    @click="handleUpdateStatus(comment.id, 'rejected')"
                  >
                    <template #icon>
                      <Icon name="eye" size="sm" />
                    </template>
                    隐藏
                  </n-button>
                  <n-button
                    v-if="comment.status === 'rejected'"
                    type="success"
                    size="small"
                    :disabled="updating"
                    @click="handleUpdateStatus(comment.id, 'approved')"
                  >
                    <template #icon>
                      <Icon name="eye" size="sm" />
                    </template>
                    显示
                  </n-button>
                </n-button-group>

                <n-button
                  type="error"
                  size="small"
                  :disabled="updating"
                  @click="confirmDelete(comment)"
                >
                  <template #icon>
                    <Icon name="trash" size="sm" />
                  </template>
                  删除
                </n-button>

                <div class="text-sm text-gray-400 flex items-center gap-1">
                  <Icon name="heart" size="xs" class="text-red-400" :solid="true" />
                  {{ comment.likes }} 个赞
                </div>
              </div>
            </div>
          </n-card>
        </div>
      </n-spin>

      <!-- 删除确认对话框 -->
      <n-modal v-model:show="showDeleteModal" preset="dialog" type="warning" title="确认删除">
        <template #default>
          <p>确定要删除这条评论吗？此操作不可撤销。</p>
          <n-card v-if="commentToDelete" size="small" class="mt-3">
            <strong>{{ commentToDelete.author }}</strong>: {{ commentToDelete.content }}
          </n-card>
        </template>
        <template #action>
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" :loading="deleting" @click="handleDelete">确认删除</n-button>
        </template>
      </n-modal>
    </div>
</template>

<script setup>
import { useAdminCommentsFeature } from '~/features/article-admin/composables/useAdminCommentsFeature'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const message = useMessage()
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
    message.error('获取评论失败')
  } finally {
    loading.value = false
  }
}

const handleUpdateStatus = async (commentId, status) => {
  updating.value = true
  try {
    await updateCommentStatus(commentId, status)
    await fetchComments()
    message.success('评论状态已更新')
  } catch (error) {
    console.error('更新评论状态失败:', error)
    message.error('更新评论状态失败')
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
    message.success('评论已删除')
  } catch (error) {
    console.error('删除评论失败:', error)
    message.error('删除评论失败')
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

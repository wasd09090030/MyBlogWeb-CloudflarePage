<template>
  <div class="comment-section-container w-full mx-auto py-10 px-4">
    <!-- 点赞区域 -->
    <div class="flex justify-center mb-10">
      <n-button
        class="like-btn px-6 h-12 text-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 dark:border-gray-700 bg-gray-50"
        :type="isLiked ? 'error' : 'default'"
        quaternary
        circle
        size="large"
        @click="toggleLike"
        :loading="likingInProgress"
      >
        <template #icon>
          <Icon v-if="isHydrated" :name="isLiked ? 'heart-fill' : 'heart'" :class="isLiked ? 'text-red-500' : 'text-gray-400'" size="2xl" />
          <Icon v-else name="heart" class="text-gray-400" size="2xl" />
        </template>
      </n-button>
      <div class="flex flex-col justify-center ml-3">
         <span class="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-none">{{ likeCount }}</span>
      </div>
    </div>

    <!-- 分割线 -->
    <div class="h-px bg-gray-100 dark:bg-gray-800 w-full mb-10"></div>

    <!-- 评论表单 -->
    <div class="mb-12 max-w-3xl mx-auto">
      <h3 class="text-xl font-medium text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <Icon name="chat-dots" class="text-gray-400" />
        <span>评论</span>
      </h3>
      
      <n-alert v-if="submitSuccess" type="success" class="mb-6 rounded-lg" closable>
        评论提交成功！正在等待审核...
      </n-alert>

      <div class="bg-white dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-shadow hover:shadow-md">
        <n-form ref="formRef" :model="newComment" :rules="rules" :show-label="false">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <n-form-item path="author">
              <n-input 
                v-model:value="newComment.author" 
                placeholder="Name *" 
                size="large" 
                class="rounded-lg !bg-gray-50 dark:!bg-gray-800/50 !border !border-gray-200 dark:!border-gray-700 focus:!bg-white dark:focus:!bg-gray-900 focus:!border-gray-300 dark:focus:!border-gray-600" 
              />
            </n-form-item>
            <n-form-item path="email">
              <n-input 
                v-model:value="newComment.email" 
                placeholder="Email (Optional)" 
                size="large" 
                class="rounded-lg !bg-gray-50 dark:!bg-gray-800/50 !border !border-gray-200 dark:!border-gray-700 focus:!bg-white dark:focus:!bg-gray-900 focus:!border-gray-300 dark:focus:!border-gray-600" 
              />
            </n-form-item>
          </div>
          
          <n-form-item path="content">
            <n-input
              v-model:value="newComment.content"
              type="textarea"
              placeholder="Write your thoughts..."
              :autosize="{ minRows: 4, maxRows: 8 }"
              size="large"
              class="rounded-lg !bg-gray-50 dark:!bg-gray-800/50 !border !border-gray-200 dark:!border-gray-700 focus:!bg-white dark:focus:!bg-gray-900 focus:!border-gray-300 dark:focus:!border-gray-600"
              :maxlength="1000"
            />
          </n-form-item>

          <div class="flex justify-end mt-2">
            <n-button
              type="primary"
              size="large"
              :loading="submitting"
              @click="submitComment"
              class="px-8 rounded-lg font-medium shadow-none hover:shadow-lg transition-all dark:shadow-none dark:bg-blue-600 dark:hover:bg-blue-700"
              color="#000"
            >
            发表评论
              <template #icon>
                <Icon name="send" size="sm" class="ml-1" />
              </template>
            </n-button>
          </div>
        </n-form>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="max-w-3xl mx-auto">
      <div class="mb-8 flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
          评论列表 <span class="text-gray-400 font-normal ml-1">({{ comments.length }})</span>
        </h3>
      </div>

      <div v-if="loadingComments" class="py-12 flex justify-center">
        <n-spin size="small" />
      </div>

      <div v-else-if="comments.length === 0" class="py-12 text-center text-gray-400">
        <Icon name="chat-square-dots" size="2xl" class="mb-2 opacity-50" />
        <p class="text-sm">Be the first to comment.</p>
      </div>

      <div v-else class="space-y-8">
        <div
          v-for="comment in comments"
          :key="comment.id"
          class="group"
        >
          <div class="flex gap-4">
            <div class="flex-shrink-0">
               <n-avatar
                round
                :size="42"
                :src="getAvatarUrl(comment.author)"
                class="border border-gray-100 dark:border-gray-700 bg-gray-50"
              />
            </div>
            <div class="flex-grow">
              <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-900 dark:text-gray-100">{{ comment.author }}</span>
                  <span v-if="comment.isAdmin" class="px-1.5 py-0.5 bg-black text-white text-[10px] font-bold rounded uppercase tracking-wider">Author</span>
                </div>
                <span class="text-xs text-gray-400">{{ formatDate(comment.createdAt) }}</span>
              </div>
              
              <div class="text-gray-600 dark:text-gray-300 leading-relaxed text-[15px] mb-3">
                {{ comment.content }}
              </div>
              
              <div class="flex items-center gap-4">
                <button 
                  class="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-red-500"
                  :class="comment.isLiked ? 'text-red-500' : 'text-gray-400'"
                  @click="likeComment(comment.id)"
                >
                  <Icon :name="comment.isLiked ? 'heart-fill' : 'heart'" size="sm" />
                  <span>{{ comment.likes || 0 }}</span>
                </button>
                
                <a 
                  v-if="comment.website" 
                  :href="comment.website" 
                  target="_blank"
                  class="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-blue-500 transition-colors"
                >
                   <Icon name="link-45deg" size="sm" />
                   <span>Website</span>
                </a>
              </div>
            </div>
          </div>
          <!-- 分隔线，最后一项不显示 -->
          <div v-if="comment.id !== comments[comments.length - 1].id" class="h-px bg-gray-50 dark:bg-gray-800/50 w-full ml-[58px] mt-8"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useComments } from '~/composables/useComments'
import { useMessage } from 'naive-ui'

const props = defineProps({
  articleId: {
    type: [Number, String],
    required: true
  }
})

const message = useMessage()

// 响应式数据
const comments = ref([])
const likeCount = ref(0)
const isLiked = ref(false)
const likingInProgress = ref(false)
const submitting = ref(false)
const submitSuccess = ref(false)
const loadingComments = ref(true)
const isHydrated = ref(false)

const newComment = ref({
  author: '',
  email: '',
  content: ''
})

const rules = {
  author: {
    required: true,
    message: 'Name is required',
    trigger: 'blur'
  },
  content: {
    required: true,
    message: 'Content is required',
    trigger: 'blur'
  }
}

// API composable
const { getCommentsByArticle, submitComment: submitCommentApi, likeComment: likeCommentApi } = useComments()

// 获取头像
const getAvatarUrl = (name) => {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${name}&backgroundColor=transparent`
}

// 获取评论列表
const fetchComments = async () => {
  try {
    loadingComments.value = true
    const data = await getCommentsByArticle(props.articleId)
    comments.value = data || []
  } catch (error) {
    console.error('获取评论失败:', error)
  } finally {
    loadingComments.value = false
  }
}

// 获取点赞状态
const fetchLikeStatus = async () => {
  try {
    const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '{}')
    isLiked.value = likedArticles[props.articleId] || false
    // 模拟点赞数
    likeCount.value = Math.floor(Math.random() * 10) + (isLiked.value ? 1 : 0)
  } catch (error) {
    console.error('获取点赞状态失败:', error)
  }
}

// 切换点赞
const toggleLike = async () => {
  if (likingInProgress.value) return

  likingInProgress.value = true
  try {
    isLiked.value = !isLiked.value
    const likedArticles = JSON.parse(localStorage.getItem('likedArticles') || '{}')
    
    if (isLiked.value) {
      likedArticles[props.articleId] = true
      likeCount.value++
      message.success('感谢点赞')
    } else {
      delete likedArticles[props.articleId]
      likeCount.value = Math.max(0, likeCount.value - 1)
    }
    localStorage.setItem('likedArticles', JSON.stringify(likedArticles))
  } catch (error) {
    console.error('点赞操作失败:', error)
    isLiked.value = !isLiked.value
  } finally {
    likingInProgress.value = false
  }
}

// 提交评论
const submitComment = async () => {
  if (!newComment.value.author || !newComment.value.content) {
    message.warning('请填写必填项')
    return
  }

  if (submitting.value) return

  submitting.value = true
  submitSuccess.value = false

  try {
    const commentData = {
      articleId: props.articleId,
      author: newComment.value.author.trim(),
      email: newComment.value.email.trim(),
      content: newComment.value.content.trim()
    }

    await submitCommentApi(commentData)

    newComment.value = {
      author: '',
      email: '',
      content: ''
    }
    submitSuccess.value = true
    message.success('评论发布成功！')
    
    await fetchComments()
  } catch (error) {
    console.error('提交评论失败:', error)
    message.error('评论发布失败')
  } finally {
    submitting.value = false
  }
}

// 点赞评论
const likeComment = async (commentId) => {
  try {
    await likeCommentApi(commentId)
    const comment = comments.value.find(c => c.id === commentId)
    if (comment) {
      comment.likes = (comment.likes || 0) + 1
      comment.isLiked = true
    }
  } catch (error) {
    console.error('点赞评论失败:', error)
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  // 如果是今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    if (diff < 60 * 60 * 1000) {
      const mins = Math.max(1, Math.floor(diff / (60 * 1000)))
      return `${mins}m ago`
    }
    return `${Math.floor(diff / (60 * 60 * 1000))}h ago`
  }
  
  // 否则显示日期
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

watch(() => props.articleId, (newId, oldId) => {
  if (newId !== oldId) {
    fetchComments()
    fetchLikeStatus()
  }
})

onMounted(() => {
  isHydrated.value = true
  fetchComments()
  fetchLikeStatus()
})
</script>

<style scoped>
/* 移除默认的边框和阴影，使用更轻盈的设计 */
.n-input {
  background-color: transparent !important;
}
</style>

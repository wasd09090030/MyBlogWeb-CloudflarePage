<template>
  <section class="comment-section">
    <div class="comment-shell">
      <UAlert
        v-if="submitSuccess"
        color="success"
        variant="soft"
        title="评论提交成功！正在等待审核..."
        class="comment-success-alert"
        close
        @close="submitSuccess = false"
      />

      <div class="comment-composer">
        <UForm :schema="schema" :state="newComment" :validate-on="['blur']" class="composer-form" @submit="handleSubmit">
          <div class="composer-grid">
            <UFormField name="author" class="composer-name-field">
              <UInput
                v-model="newComment.author"
                placeholder="怎么称呼你"
                size="lg"
                class="composer-input"
                :ui="inputClass"
              />
            </UFormField>
            <UFormField name="email" class="composer-email-field">
              <UInput
                v-model="newComment.email"
                placeholder="可选，用于头像"
                size="lg"
                class="composer-input"
                :ui="inputClass"
              />
            </UFormField>

            <UFormField name="content" class="composer-content-field">
              <UTextarea
                v-model="newComment.content"
                placeholder="写下你的想法..."
                :rows="8"
                size="lg"
                class="composer-textarea"
                :ui="textareaClass"
                :maxlength="1000"
              />
            </UFormField>

            <UFormField name="website" class="composer-website-field">
              <UInput
                v-model="newComment.website"
                placeholder="网站（可选）"
                size="md"
                class="composer-input"
                :ui="websiteInputClass"
              />
            </UFormField>

            <div class="composer-actions">
              <span class="comment-char-count" :class="charCountClass">
                {{ newComment.content.length }} / 1000
              </span>
              <UButton
                type="submit"
                size="lg"
                :loading="submitting"
                class="comment-submit-button"
                trailing-icon="heroicons:paper-airplane"
              >
                发布评论
              </UButton>
            </div>
          </div>
        </UForm>
      </div>

      <div class="comment-list-head">
        <div>
          <p class="comment-kicker">Comments</p>
          <h4 class="comment-list-title">全部留言</h4>
        </div>
        <button
          type="button"
          class="comment-refresh-button"
          :disabled="loadingComments"
          aria-label="刷新评论"
          @click="fetchComments"
        >
          <Icon name="heroicons:arrow-path" />
        </button>
      </div>

      <div v-if="loadError" class="comment-state comment-state-danger">
        <Icon name="heroicons:exclamation-triangle" />
        <p>加载评论失败</p>
        <UButton color="primary" variant="solid" size="sm" @click="fetchComments">重试</UButton>
      </div>

      <div v-else-if="loadingComments" class="comment-skeleton-list" aria-busy="true" aria-label="正在加载评论">
        <div v-for="i in 3" :key="i" class="comment-skeleton-item">
          <div class="comment-skeleton-avatar" />
          <div class="comment-skeleton-content">
            <div class="comment-skeleton-line comment-skeleton-line-short" />
            <div class="comment-skeleton-line" />
            <div class="comment-skeleton-line comment-skeleton-line-medium" />
          </div>
        </div>
      </div>

      <div v-else-if="comments.length === 0" class="comment-empty">
        <StateEmpty
          icon="heroicons:chat-bubble-oval-left-ellipsis"
          description="还没有评论，来留下第一条吧"
        />
      </div>

      <ol v-else class="comment-timeline">
        <li v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-item-rail">
            <UAvatar
              :src="currentAvatarSrc(comment)"
              :alt="comment.author"
              size="lg"
              class="comment-avatar"
              @error="onAvatarError(comment.id, $event)"
            />
          </div>

          <article class="comment-card">
            <header class="comment-card-header">
              <div class="comment-author-block">
                <span class="comment-author-name">{{ comment.author }}</span>
                <span v-if="comment.isAdmin" class="comment-author-badge">Author</span>
              </div>
              <time class="comment-meta-time" :datetime="comment.createdAt">
                {{ formatDate(comment.createdAt) }}
              </time>
            </header>

            <p class="comment-body-text">{{ comment.content }}</p>

            <footer class="comment-actions">
              <button
                type="button"
                class="comment-like-toggle"
                :class="comment.isLiked ? 'comment-like-toggle-active' : 'comment-like-toggle-inactive'"
                :aria-label="`点赞 ${comment.author} 的评论`"
                @click="likeComment(comment.id)"
              >
                <Icon
                  :name="comment.isLiked ? 'heroicons:heart-solid' : 'heroicons:heart'"
                  size="sm"
                />
                <span>{{ comment.likes || 0 }}</span>
              </button>

              <a
                v-if="comment.website"
                :href="comment.website"
                target="_blank"
                rel="noopener noreferrer"
                class="comment-website-link"
              >
                <Icon name="heroicons:link" size="sm" />
                <span>Website</span>
              </a>
            </footer>
          </article>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup>
import { useComments } from '~/composables/useComments'
import { getAvatarUrl, getDiceBearUrl } from '~/utils/avatar'
// `shared/ui/` 不在 components.dirs 自动导入范围内（见 nuxt.config.ts 的 components 配置），
// 所以显式 import 三个共享状态组件。参考 Content.vue:46 的同款用法。
import StateEmpty from '~/shared/ui/StateEmpty.vue'
import * as v from 'valibot'

const props = defineProps({
  articleId: {
    type: [Number, String],
    required: true
  }
})

const toast = useToast()

// 表单 schema：author/content 必填，email/website 可选
const schema = v.object({
  author: v.pipe(v.string(), v.trim(), v.minLength(1, 'Name is required')),
  email: v.optional(v.string()),
  website: v.optional(v.string()),
  content: v.pipe(v.string(), v.trim(), v.minLength(1, 'Content is required'))
})

// 状态
const comments = ref([])
const submitting = ref(false)
const submitSuccess = ref(false)
const loadingComments = ref(true)
const loadError = ref(false)
const avatarFallbackIds = ref(new Set()) // 已经回退到 DiceBear 的评论 id

const newComment = ref({
  author: '',
  email: '',
  website: '',
  content: ''
})

// 字符计数颜色：>800 警告，>950 危险
const charCountClass = computed(() => {
  const len = newComment.value.content.length
  if (len > 950) return 'text-[var(--accent-danger)]'
  if (len > 800) return 'text-[var(--accent-warning)]'
  return 'text-[var(--text-muted)]'
})

// 沿用项目主题令牌
const inputClass = {
  root: 'w-full',
  base: 'w-full rounded-lg bg-[var(--input-bg)]! border! border-[var(--input-border)]! focus:border-[var(--input-focus-border)]! transition-colors px-4! py-2.5! text-sm!'
}
const textareaClass = {
  root: 'w-full',
  base: 'w-full rounded-lg bg-[var(--input-bg)]! border! border-[var(--input-border)]! focus:border-[var(--input-focus-border)]! transition-colors px-4! py-2.5! text-sm! leading-relaxed!'
}
const websiteInputClass = {
  root: 'w-full',
  base: 'w-full rounded-lg bg-transparent! border! border-[var(--input-border)]! focus:border-[var(--input-focus-border)]! transition-colors px-3! py-2! text-sm!'
}

// 头像策略：优先 Gravatar（精确 md5 匹配），404 切 DiceBear
const currentAvatarSrc = (comment) => {
  if (avatarFallbackIds.value.has(comment.id)) {
    return getDiceBearUrl(comment.author)
  }
  return getAvatarUrl(comment.email, comment.author)
}

const onAvatarError = (commentId, event) => {
  if (avatarFallbackIds.value.has(commentId)) return
  avatarFallbackIds.value.add(commentId)
  // 触发响应式更新：把新的 Set 替换（Vue 不会监听 Set 内部变更）
  avatarFallbackIds.value = new Set(avatarFallbackIds.value)
  // 强制 UAvatar 重新拉取新 src
  if (event?.target) {
    event.target.src = getDiceBearUrl(comments.value.find(c => c.id === commentId)?.author ?? '')
  }
}

// API
const { getCommentsByArticle, submitComment: submitCommentApi, likeComment: likeCommentApi } = useComments()

const fetchComments = async () => {
  loadingComments.value = true
  loadError.value = false
  try {
    const data = await getCommentsByArticle(props.articleId)
    comments.value = data || []
    avatarFallbackIds.value = new Set()
  } catch (error) {
    console.error('获取评论失败:', error)
    loadError.value = true
  } finally {
    loadingComments.value = false
  }
}
const handleSubmit = async (event) => {
  const commentData = {
    articleId: props.articleId,
    author: event.data.author,
    email: event.data.email?.trim() || '',
    website: event.data.website?.trim() || '',
    content: event.data.content
  }
  submitting.value = true
  submitSuccess.value = false
  try {
    await submitCommentApi(commentData)
    newComment.value = { author: '', email: '', website: '', content: '' }
    submitSuccess.value = true
    toast.add({ title: '评论发布成功！', color: 'success' })
    await fetchComments()
  } catch (error) {
    console.error('提交评论失败:', error)
    toast.add({ title: '评论发布失败', color: 'error' })
  } finally {
    submitting.value = false
  }
}
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

// 相对时间格式化
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diff = now - date
  if (diff < 0) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const mins = Math.floor(diff / (60 * 1000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 24 && date.getDate() === now.getDate()) return `${hours}h ago`
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

watch(() => props.articleId, (newId, oldId) => {
  if (newId !== oldId) fetchComments()
})

onMounted(() => {
  fetchComments()
})
</script>

<style scoped>
.comment-section {
  width: 100%;
  padding: 3.5rem 1rem 2rem;
}

.comment-shell {
  width: min(100%, 880px);
  margin: 0 auto;
}

.comment-list-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.comment-kicker {
  margin: 0 0 0.35rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.comment-list-title {
  margin: 0;
  color: var(--text-primary);
  font-weight: 750;
  letter-spacing: 0;
}

.comment-list-title {
  font-size: 1.1rem;
}

.comment-success-alert {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
}

.comment-composer {
  margin-bottom: 2.75rem;
  padding: 1.5rem 1.65rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent-primary) 4%, transparent), transparent 42%),
    var(--card-bg);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--text-muted) 10%, transparent);
}

.composer-form {
  min-width: 0;
}

.composer-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-areas:
    "name email"
    "content content"
    "website actions";
  align-items: end;
  gap: 0.9rem 1rem;
}

.composer-name-field {
  grid-area: name;
}

.composer-email-field {
  grid-area: email;
}

.composer-content-field {
  grid-area: content;
}

.composer-website-field {
  grid-area: website;
  width: min(100%, 18rem);
}

.composer-input,
.composer-textarea {
  display: block;
  width: 100%;
}

.composer-textarea :deep(textarea) {
  min-height: 13rem;
  resize: vertical;
}

.composer-input :deep(input),
.composer-textarea :deep(textarea) {
  width: 100%;
}

.composer-actions {
  grid-area: actions;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.85rem;
}

.comment-char-count {
  margin-right: auto;
  font-size: 0.78rem;
  transition: color 0.15s ease;
}

.comment-submit-button {
  border-radius: 0.5rem;
  font-weight: 700;
  box-shadow: none;
}

.comment-list-head {
  margin-bottom: 1rem;
  padding-top: 0.25rem;
}

.comment-refresh-button {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card-bg);
  color: var(--text-muted);
  transition: border-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.comment-refresh-button:hover:not(:disabled) {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
  transform: rotate(18deg);
}

.comment-refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.comment-state,
.comment-empty {
  display: grid;
  min-height: 12rem;
  place-items: center;
  border: 1px dashed var(--border-color);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--card-bg) 80%, transparent);
  color: var(--text-muted);
  text-align: center;
}

.comment-state {
  align-content: center;
  gap: 0.75rem;
}

.comment-state svg {
  color: var(--accent-danger);
  font-size: 1.75rem;
}

.comment-state p {
  margin: 0;
  font-size: 0.92rem;
}

.comment-skeleton-list {
  display: grid;
  gap: 1rem;
}

.comment-skeleton-item {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem 0;
}

.comment-skeleton-avatar,
.comment-skeleton-line {
  background: color-mix(in srgb, var(--text-muted) 14%, transparent);
  animation: comment-skeleton-pulse 1.5s ease-in-out infinite;
}

.comment-skeleton-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
}

.comment-skeleton-content {
  display: grid;
  align-content: start;
  gap: 0.7rem;
  padding-top: 0.25rem;
}

.comment-skeleton-line {
  height: 0.75rem;
  border-radius: 999px;
}

.comment-skeleton-line-short {
  width: 32%;
}

.comment-skeleton-line-medium {
  width: 62%;
}

@keyframes comment-skeleton-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.comment-timeline {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment-item {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  gap: 1rem;
  position: relative;
}

.comment-item:not(:last-child) {
  padding-bottom: 1.25rem;
}

.comment-item:not(:last-child)::before {
  content: "";
  position: absolute;
  top: 3.35rem;
  bottom: 0.25rem;
  left: 1.5rem;
  width: 1px;
  background: var(--border-color-light);
}

.comment-item-rail {
  position: relative;
  z-index: 1;
}

.comment-avatar {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  box-shadow: 0 0 0 4px var(--card-bg);
}

.comment-card {
  min-width: 0;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border-color-light);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--card-bg) 92%, transparent);
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.comment-card:hover {
  border-color: color-mix(in srgb, var(--accent-primary) 35%, var(--border-color));
  background: var(--card-bg);
  transform: translateY(-1px);
}

.comment-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.65rem;
}

.comment-author-block {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.comment-author-name {
  color: var(--text-primary);
  font-size: 0.95rem;
  font-weight: 750;
}

.comment-author-badge {
  padding: 0.16rem 0.42rem;
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--accent-primary) 12%, transparent);
  color: var(--accent-primary);
  font-size: 0.68rem;
  font-weight: 800;
}

.comment-meta-time {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.comment-body-text {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.8;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.9rem;
}

.comment-like-toggle,
.comment-website-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 1.8rem;
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 650;
  transition: color 0.15s ease, background 0.15s ease;
}

.comment-like-toggle {
  padding: 0 0.35rem 0 0;
}

.comment-like-toggle-inactive:hover {
  color: var(--accent-danger);
}

.comment-like-toggle-active {
  color: var(--accent-danger);
}

.comment-website-link:hover {
  color: var(--accent-primary);
}

@media (max-width: 768px) {
  .comment-section {
    padding: 2.5rem 0.5rem 1.5rem;
  }

  .comment-list-head {
    align-items: flex-start;
  }

  .comment-composer {
    margin-bottom: 2rem;
    padding: 1rem;
  }

  .composer-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "name"
      "email"
      "content"
      "website"
      "actions";
    gap: 0.85rem;
  }

  .composer-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .composer-website-field {
    width: 100%;
  }

  .comment-char-count {
    margin-right: 0;
  }

  .comment-submit-button {
    justify-content: center;
    width: 100%;
  }

  .comment-item {
    grid-template-columns: 2.65rem minmax(0, 1fr);
    gap: 0.75rem;
  }

  .comment-item:not(:last-child)::before {
    left: 1.325rem;
  }

  .comment-card {
    padding: 0.9rem;
  }

  .comment-card-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.25rem;
  }
}

</style>

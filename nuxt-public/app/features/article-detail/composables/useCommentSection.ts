import * as v from 'valibot'
import { getAvatarUrl, getDiceBearUrl } from '~/utils/avatar'
import { useComments } from '~/composables/useComments'
import type { AdminComment, CreateCommentPayload } from '~/types/api'

type DisplayComment = AdminComment & {
  isLiked?: boolean
  isAdmin?: boolean
}

const commentSchema = v.object({
  author: v.pipe(v.string(), v.trim(), v.minLength(1, 'Name is required')),
  email: v.optional(v.string()),
  website: v.optional(v.string()),
  content: v.pipe(v.string(), v.trim(), v.minLength(1, 'Content is required'))
})

export function useCommentSection(articleId: Ref<string | number>, toast: ReturnType<typeof useToast>) {
  const comments = ref<DisplayComment[]>([])
  const submitting = ref(false)
  const submitSuccess = ref(false)
  const loadingComments = ref(true)
  const loadError = ref(false)
  const avatarFallbackIds = ref(new Set<number>())
  const newComment = ref({ author: '', email: '', website: '', content: '' })
  const charCountClass = computed(() => {
    const length = newComment.value.content.length
    if (length > 950) return 'text-[var(--accent-danger)]'
    if (length > 800) return 'text-[var(--accent-warning)]'
    return 'text-[var(--text-muted)]'
  })

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

  const { getCommentsByArticle, submitComment: submitCommentApi, likeComment: likeCommentApi } = useComments()

  const fetchComments = async () => {
    loadingComments.value = true
    loadError.value = false
    try {
      comments.value = (await getCommentsByArticle(articleId.value) || []) as DisplayComment[]
      avatarFallbackIds.value = new Set()
    } catch (error) {
      console.error('获取评论失败:', error)
      loadError.value = true
    } finally {
      loadingComments.value = false
    }
  }

  const handleSubmit = async (event: { data: { author: string; email?: string; website?: string; content: string } }) => {
    const commentData: CreateCommentPayload = {
      articleId: Number(articleId.value),
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

  const likeComment = async (commentId: number) => {
    try {
      await likeCommentApi(commentId)
      const comment = comments.value.find(item => item.id === commentId)
      if (comment) {
        comment.likes = (comment.likes || 0) + 1
        comment.isLiked = true
      }
    } catch (error) {
      console.error('点赞评论失败:', error)
    }
  }

  const currentAvatarSrc = (comment: DisplayComment) => avatarFallbackIds.value.has(comment.id)
    ? getDiceBearUrl(comment.author)
    : getAvatarUrl(comment.email, comment.author)

  const onAvatarError = (commentId: number, event: Event) => {
    if (avatarFallbackIds.value.has(commentId)) return
    avatarFallbackIds.value = new Set(avatarFallbackIds.value).add(commentId)
    const target = event.target as HTMLImageElement | null
    const comment = comments.value.find(item => item.id === commentId)
    if (target && comment) target.src = getDiceBearUrl(comment.author)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return ''
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    if (diff < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(diff / 3600000)
    if (hours < 24 && date.getDate() === now.getDate()) return `${hours}h ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  watch(articleId, (newId, oldId) => {
    if (newId !== oldId) fetchComments()
  })
  onMounted(fetchComments)

  return {
    schema: commentSchema,
    comments,
    submitting,
    submitSuccess,
    loadingComments,
    loadError,
    newComment,
    charCountClass,
    inputClass,
    textareaClass,
    websiteInputClass,
    fetchComments,
    handleSubmit,
    likeComment,
    currentAvatarSrc,
    onAvatarError,
    formatDate
  }
}

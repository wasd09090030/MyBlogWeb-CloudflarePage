import type { AdminComment, CreateCommentPayload } from '~/types/api'

export const useComments = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  const getCommentsByArticle = async (articleId: string | number): Promise<AdminComment[]> => {
    return await $fetch<AdminComment[]>(`${baseURL}/comments/article/${articleId}`)
  }

  const submitComment = async (commentData: CreateCommentPayload): Promise<AdminComment> => {
    return await $fetch<AdminComment>(`${baseURL}/comments`, {
      method: 'POST',
      body: commentData
    })
  }

  const likeComment = async (commentId: string | number): Promise<AdminComment> => {
    return await $fetch<AdminComment>(`${baseURL}/comments/${commentId}/like`, {
      method: 'POST'
    })
  }

  return {
    getCommentsByArticle,
    submitComment,
    likeComment
  }
}

import type { AdminComment, AuthFetchLike, CommentStatus } from '~/types/api'
import { withApiError } from '~/shared/api/client'
import { toAppResult } from '~/shared/types/result'
import type { AppResult } from '~/shared/types/result'

export const useAdminCommentsFeature = () => {
  const authStore = useAuthStore() as AuthFetchLike

  const getAllComments = async (): Promise<AdminComment[]> => {
    return await withApiError('AdminComments', '获取评论', async () => {
      return await authStore.authFetch<AdminComment[]>('/comments/admin/all')
    })
  }

  const getPendingComments = async (): Promise<AdminComment[]> => {
    return await withApiError('AdminComments', '获取待审核评论', async () => {
      return await authStore.authFetch<AdminComment[]>('/comments/admin/pending')
    })
  }

  const updateCommentStatus = async (
    commentId: string | number,
    status: CommentStatus | string
  ): Promise<AdminComment> => {
    return await withApiError('AdminComments', '更新评论状态', async () => {
      return await authStore.authFetch<AdminComment>(`/comments/${commentId}/status`, {
        method: 'PATCH',
        body: { status }
      })
    })
  }

  const deleteComment = async (commentId: string | number): Promise<void> => {
    return await withApiError('AdminComments', '删除评论', async () => {
      await authStore.authFetch<void>(`/comments/${commentId}`, {
        method: 'DELETE'
      })
    })
  }

  const getStatusType = (status: CommentStatus | string): string => {
    const types: Record<string, string> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error'
    }
    return types[status] || 'default'
  }

  const getStatusText = (status: CommentStatus | string): string => {
    const texts: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已拒绝'
    }
    return texts[status] || '未知'
  }

  const getAllCommentsResult = async (): Promise<AppResult<AdminComment[]>> => {
    return await toAppResult(() => getAllComments(), '获取评论失败')
  }

  const getPendingCommentsResult = async (): Promise<AppResult<AdminComment[]>> => {
    return await toAppResult(() => getPendingComments(), '获取待审核评论失败')
  }

  return {
    getAllComments,
    getAllCommentsResult,
    getPendingComments,
    getPendingCommentsResult,
    updateCommentStatus,
    deleteComment,
    getStatusType,
    getStatusText
  }
}
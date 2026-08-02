import { likeComment } from '~~/server/domain/comments'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  return await likeComment(event, getRouterParam(event, 'id'))
})

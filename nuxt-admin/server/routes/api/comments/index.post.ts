import { createPublicComment } from '~~/server/domain/comments'
import { assertSafeMutation } from '~~/server/utils/request-security'

export default defineEventHandler(async (event) => {
  assertSafeMutation(event)
  const result = await createPublicComment(event, await readBody(event))
  setResponseStatus(event, 201)
  return result
})

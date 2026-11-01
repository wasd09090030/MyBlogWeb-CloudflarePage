import { requireAdminSession } from '~~/server/domain/auth'
import { listRatings, listRatingLibrary, RATING_COMMENT_MAX } from '~~/server/domain/steam/ratings'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const [ratings, library] = await Promise.all([listRatings(event), listRatingLibrary(event)])
  return {
    ratings,
    library,
    commentMax: RATING_COMMENT_MAX
  }
})

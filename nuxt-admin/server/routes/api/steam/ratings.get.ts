import { ratingDetail } from '~~/server/domain/steam/showcases'

/**
 * 公开只读：完整评分列表，供 /games/ratings 详情页使用。
 * 首页只取封顶的预览条数，这里返回全部已评游戏（上限 60，见 RATING_MAX_ITEMS）。
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')
  return await ratingDetail(event)
})

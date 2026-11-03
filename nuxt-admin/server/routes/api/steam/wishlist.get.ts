import { wishlistPage } from '~~/server/domain/steam/showcases'
import { parseNonNegativeInt, parsePositiveInt } from '~~/server/utils/d1'

/**
 * 公开只读：完整愿望单，供 /games/wishlist 详情页分页加载。
 * 只返回已解析出名字的条目，避免详情页出现空封面占位。
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')
  const query = getQuery(event)
  return await wishlistPage(event, {
    offset: parseNonNegativeInt(query.offset, 0, 100_000),
    limit: parsePositiveInt(query.limit, 24, 60)
  })
})

import { playtimePage } from '~~/server/domain/steam/showcases'
import { parseNonNegativeInt, parsePositiveInt } from '~~/server/utils/d1'

/**
 * 公开只读：完整游玩时长榜单，供 /games/playtime 详情页分页加载。
 * 首页的预览条数由展柜配置决定，这里不接受前端任意放大。
 */
export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')
  const query = getQuery(event)
  return await playtimePage(event, {
    offset: parseNonNegativeInt(query.offset, 0, 100_000),
    limit: parsePositiveInt(query.limit, 24, 60),
    sort: query.sort === 'recent' ? 'recent' : 'total'
  })
})

import { listPublicArticlesByCategory } from '~~/server/domain/articles'

export default defineEventHandler(async (event) => await listPublicArticlesByCategory(event, getRouterParam(event, 'category')))

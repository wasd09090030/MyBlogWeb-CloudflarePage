import { getPublicArticle } from '~~/server/domain/articles'

export default defineEventHandler(async (event) => await getPublicArticle(event, getRouterParam(event, 'id')))

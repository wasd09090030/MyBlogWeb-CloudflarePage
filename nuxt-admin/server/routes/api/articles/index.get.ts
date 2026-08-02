import { listPublicArticles } from '~~/server/domain/articles'

export default defineEventHandler(async (event) => await listPublicArticles(event, getQuery(event)))

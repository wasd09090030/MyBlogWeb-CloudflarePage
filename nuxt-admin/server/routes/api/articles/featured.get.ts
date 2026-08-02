import { listFeaturedArticles } from '~~/server/domain/articles'

export default defineEventHandler(async (event) => await listFeaturedArticles(event, getQuery(event).limit))

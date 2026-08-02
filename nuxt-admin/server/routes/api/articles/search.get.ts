import { searchPublicArticles } from '~~/server/domain/articles'

export default defineEventHandler(async (event) => await searchPublicArticles(event, getQuery(event).keyword))

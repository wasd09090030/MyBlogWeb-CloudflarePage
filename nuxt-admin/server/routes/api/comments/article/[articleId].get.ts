import { listPublicComments } from '~~/server/domain/comments'

export default defineEventHandler(async (event) => await listPublicComments(event, getRouterParam(event, 'articleId')))

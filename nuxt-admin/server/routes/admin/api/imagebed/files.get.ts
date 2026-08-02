import { listMedia } from '~~/server/domain/media'
import { requireAdminSession } from '~~/server/domain/auth'
export default defineEventHandler(async (event) => { await requireAdminSession(event); return await listMedia(event, getQuery(event)) })

import { getImagebedConfig } from '~~/server/domain/config'
import { requireAdminSession } from '~~/server/domain/auth'
export default defineEventHandler(async (event) => { await requireAdminSession(event); return await getImagebedConfig(event) })

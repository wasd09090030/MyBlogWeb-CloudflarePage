import { verifySession } from '~~/server/utils/backend'

export default defineEventHandler(async (event) => ({ authenticated: await verifySession(event) }))

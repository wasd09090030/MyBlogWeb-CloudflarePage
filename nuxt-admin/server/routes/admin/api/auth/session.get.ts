import { getCurrentSession } from '~~/server/domain/auth'

export default defineEventHandler(async (event) => {
  const session = await getCurrentSession(event)
  return {
    authenticated: Boolean(session && !session.mustReset),
    username: session?.username,
    expiresAt: session?.expiresAt,
    mustReset: session?.mustReset === true
  }
})

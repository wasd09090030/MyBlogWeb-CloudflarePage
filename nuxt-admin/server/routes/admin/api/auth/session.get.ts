import { getCurrentSession } from '~~/server/domain/auth'

export default defineEventHandler(async (event) => {
  // Session state is user-specific and must never be served from an edge cache.
  setResponseHeader(event, 'cache-control', 'no-store, no-cache, must-revalidate, private')
  const session = await getCurrentSession(event)
  return {
    authenticated: Boolean(session && !session.mustReset),
    username: session?.username,
    expiresAt: session?.expiresAt,
    mustReset: session?.mustReset === true
  }
})

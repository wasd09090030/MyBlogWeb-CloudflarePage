export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch()
  const session = await requestFetch<{ authenticated: boolean }>('/admin/api/auth/session').catch(() => ({ authenticated: false }))
  if (!session.authenticated && to.path !== '/admin/login') return navigateTo('/admin/login')
  if (session.authenticated && to.path === '/admin/login') return navigateTo('/admin')
})

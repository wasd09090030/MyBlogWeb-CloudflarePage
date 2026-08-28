export default defineNuxtRouteMiddleware(async (to) => {
  const session = await $fetch<{ authenticated: boolean }>('/admin/api/auth/session', { credentials: 'include', cache: 'no-store' }).catch(() => ({ authenticated: false }))
  if (!session.authenticated && to.path !== '/admin/login') return navigateTo('/admin/login')
  if (session.authenticated && to.path === '/admin/login') return navigateTo('/admin')
})

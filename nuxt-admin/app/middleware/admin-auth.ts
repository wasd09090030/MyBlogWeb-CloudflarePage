export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAdminAuthState()
  if (!auth.isFresh()) {
    const session = await $fetch<{ authenticated: boolean }>('/admin/api/auth/session', { credentials: 'include', cache: 'no-store' }).catch(() => ({ authenticated: false }))
    auth.state.value = { authenticated: session.authenticated, checkedAt: Date.now() }
  }
  if (!auth.state.value.authenticated && to.path !== '/admin/login') return navigateTo('/admin/login')
  if (auth.state.value.authenticated && to.path === '/admin/login') return navigateTo('/admin')
})

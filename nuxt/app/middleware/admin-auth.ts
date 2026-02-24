export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const authStore = useAuthStore()

  if (!authStore.isAuthenticated || !authStore.token) {
    await authStore.initialize()
  }

  if (!authStore.isAdmin && to.path !== '/admin/login') {
    console.log('[Admin Auth] 未认证，重定向到登录页')
    return navigateTo('/admin/login')
  }

  if (authStore.isAdmin && to.path === '/admin/login') {
    console.log('[Admin Auth] 已认证，重定向到管理后台')
    return navigateTo('/admin')
  }
})

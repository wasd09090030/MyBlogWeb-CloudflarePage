<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const toast = useToast()
const open = ref(false)
const colorMode = useColorMode()
const links = [
  { label: '概览', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: '文章', icon: 'i-lucide-file-text', to: '/admin/articles' },
  { label: '评论', icon: 'i-lucide-messages-square', to: '/admin/comments' },
  { label: '画廊', icon: 'i-lucide-images', to: '/admin/gallery' },
  { label: '图床', icon: 'i-lucide-folder-up', to: '/admin/imagebed' },
  { label: '账户', icon: 'i-lucide-user-cog', to: '/admin/password' }
]
const title = computed(() => links.find(link => route.path === link.to)?.label || '内容工作台')
async function logout() {
  await $fetch('/admin/api/auth/logout', { method: 'POST', credentials: 'include' })
  toast.add({ title: '已退出登录', color: 'success' })
  await router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <aside class="fixed inset-y-0 start-0 z-30 hidden w-64 border-e border-default bg-elevated lg:block">
      <div class="flex h-16 items-center gap-3 border-b border-default px-5 font-semibold">
        <span class="grid size-8 place-items-center bg-primary text-inverted"><UIcon name="i-lucide-command" /></span>
        WyrmKk Admin
      </div>
      <UNavigationMenu :items="links" orientation="vertical" class="p-3" />
    </aside>
    <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-default bg-default/95 px-4 backdrop-blur lg:ps-72">
      <div class="flex items-center gap-3"><UButton class="lg:hidden" icon="i-lucide-menu" color="neutral" variant="ghost" @click="open = true" /><h1 class="font-semibold">{{ title }}</h1></div>
      <div class="flex items-center gap-1">
        <UButton :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" color="neutral" variant="ghost" aria-label="切换主题" @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'" />
        <UButton icon="i-lucide-log-out" color="neutral" variant="ghost" aria-label="退出登录" @click="logout" />
      </div>
    </header>
    <main class="mx-auto max-w-[1600px] p-4 lg:ps-72 lg:p-8"><slot /></main>
    <USlideover v-model:open="open" side="left" title="导航"><template #body><UNavigationMenu :items="links" orientation="vertical" @update:model-value="open = false" /></template></USlideover>
  </div>
</template>

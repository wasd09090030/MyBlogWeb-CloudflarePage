<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const mobileOpen = ref(false)
const collapsed = useCookie('admin-sidebar-collapsed', { default: () => false })
const colorMode = useColorMode()

const workspaceLinks: NavigationMenuItem[] = [
  { label: '概览', icon: 'i-lucide-layout-dashboard', to: '/admin' },
  { label: '文章', icon: 'i-lucide-file-text', to: '/admin/articles' },
  { label: '评论', icon: 'i-lucide-messages-square', to: '/admin/comments' }
]
const assetLinks: NavigationMenuItem[] = [
  { label: '画廊', icon: 'i-lucide-images', to: '/admin/gallery' },
  { label: '图床', icon: 'i-lucide-folder-up', to: '/admin/imagebed' }
]
const accountLinks: NavigationMenuItem[] = [
  { label: '账户安全', icon: 'i-lucide-shield-check', to: '/admin/password' }
]
const sections = [
  { label: '工作台', links: workspaceLinks },
  { label: '媒体资产', links: assetLinks },
  { label: '系统', links: accountLinks }
]
const allLinks = [...workspaceLinks, ...assetLinks, ...accountLinks]
const title = computed(() => allLinks.find(link => route.path === link.to)?.label || '内容工作台')

function closeMobileNavigation() { mobileOpen.value = false }
async function logout() {
  await $fetch('/admin/api/auth/logout', { method: 'POST', credentials: 'include' })
  toast.add({ title: '已退出登录', color: 'success' })
  await router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen bg-default">
    <aside :class="['fixed inset-y-0 start-0 z-30 hidden border-e border-default bg-elevated transition-[width] duration-200 lg:flex lg:flex-col', collapsed ? 'w-[76px]' : 'w-64']">
      <div class="flex h-16 items-center gap-3 border-b border-default px-4">
        <span class="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-inverted shadow-sm"><UIcon name="i-lucide-command" /></span>
        <div v-if="!collapsed" class="min-w-0 flex-1"><p class="truncate text-sm font-semibold">WyrmKk Admin</p><p class="text-xs text-muted">Content workspace</p></div>
        <UTooltip :text="collapsed ? '展开侧栏' : '收起侧栏'"><UButton class="ms-auto" size="xs" color="neutral" variant="ghost" :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" @click="collapsed = !collapsed" /></UTooltip>
      </div>

      <nav class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
        <section v-for="section in sections" :key="section.label">
          <p v-if="!collapsed" class="mb-2 px-2 text-[11px] font-semibold tracking-wide text-dimmed">{{ section.label }}</p>
          <UNavigationMenu :items="section.links" orientation="vertical" :collapsed="collapsed" :ui="{ link: 'rounded-md px-2.5 py-2 text-sm' }" />
        </section>
      </nav>

      <div class="border-t border-default p-3">
        <UNavigationMenu :items="accountLinks" orientation="vertical" :collapsed="collapsed" :ui="{ link: 'rounded-md px-2.5 py-2 text-sm' }" />
        <div class="mt-2 flex items-center gap-1" :class="collapsed ? 'flex-col' : 'justify-between'">
          <UTooltip text="切换主题"><UButton size="sm" color="neutral" variant="ghost" :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'" :aria-label="colorMode.value === 'dark' ? '切换为浅色模式' : '切换为深色模式'" @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'" /></UTooltip>
          <UTooltip text="退出登录"><UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-log-out" aria-label="退出登录" @click="logout" /></UTooltip>
        </div>
      </div>
    </aside>

    <header :class="['sticky top-0 z-20 flex h-16 items-center justify-between border-b border-default bg-default/95 px-4 backdrop-blur transition-[padding] duration-200', collapsed ? 'lg:ps-24' : 'lg:ps-72']">
      <div class="flex items-center gap-3"><UButton class="lg:hidden" icon="i-lucide-menu" color="neutral" variant="ghost" aria-label="打开导航" @click="mobileOpen = true" /><div><p class="text-xs text-muted">管理后台</p><h1 class="font-semibold leading-5">{{ title }}</h1></div></div>
      <UButton to="/admin/articles/create" icon="i-lucide-plus" size="sm">新建文章</UButton>
    </header>
    <main :class="['mx-auto max-w-[1600px] p-4 transition-[padding] duration-200 lg:py-8 lg:pe-8', collapsed ? 'lg:ps-24' : 'lg:ps-72']"><slot /></main>

    <USlideover v-model:open="mobileOpen" side="left" title="WyrmKk Admin">
      <template #body><div class="flex h-full flex-col"><nav class="space-y-5"><section v-for="section in sections" :key="section.label"><p class="mb-2 px-2 text-[11px] font-semibold tracking-wide text-dimmed">{{ section.label }}</p><UNavigationMenu :items="section.links" orientation="vertical" @update:model-value="closeMobileNavigation" /></section></nav><div class="mt-auto border-t border-default pt-3"><UButton block color="neutral" variant="soft" icon="i-lucide-log-out" @click="logout">退出登录</UButton></div></div></template>
    </USlideover>
  </div>
</template>

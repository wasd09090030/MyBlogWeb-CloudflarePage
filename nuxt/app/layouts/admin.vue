<template>
  <UDashboardGroup>
    <!-- 左侧导航栏 -->
    <UDashboardSidebar
      collapsible
      resizable
      :ui="{ root: 'bg-elevated/40', footer: 'border-t border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink
          to="/admin"
          class="flex items-center gap-2 group min-w-0"
          :aria-label="collapsed ? 'WyrmKk 管理后台' : undefined"
        >
          <span
            class="flex shrink-0 items-center justify-center size-9 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20 group-hover:bg-primary/15 transition-colors"
          >
            <span class="font-display font-bold text-lg leading-none tracking-tight">W</span>
          </span>
          <span v-if="!collapsed" class="flex flex-col leading-tight min-w-0">
            <span class="font-display font-semibold text-sm text-highlighted truncate">WyrmKk</span>
            <span class="text-[11px] text-muted uppercase tracking-wider">Admin Console</span>
          </span>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <!-- 主导航 -->
        <UNavigationMenu
          :collapsed="collapsed"
          :items="primaryLinks"
          orientation="vertical"
        />

        <!-- 账号 / 危险操作分组 -->
        <UNavigationMenu
          :collapsed="collapsed"
          :items="secondaryLinks"
          orientation="vertical"
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div
          v-if="!collapsed"
          class="flex items-center gap-2.5 w-full min-w-0 px-1 py-1"
        >
          <span class="relative flex shrink-0 size-2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span class="relative inline-flex rounded-full size-2 bg-emerald-500" />
          </span>
          <div class="flex flex-col min-w-0 leading-tight">
            <span class="text-xs font-medium text-highlighted truncate">在线 · 管理员</span>
            <span class="text-[10px] text-muted font-mono truncate">{{ sessionInfo }}</span>
          </div>
        </div>
        <UTooltip v-else text="管理员在线">
          <span class="relative flex shrink-0 size-2.5 mx-auto">
            <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span class="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>
        </UTooltip>
      </template>
    </UDashboardSidebar>

    <!-- 主面板 -->
    <UDashboardPanel :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <UDashboardNavbar
          :title="pageTitle"
          :ui="{ root: 'border-b border-default bg-default/80 backdrop-blur-sm' }"
        >
          <template #leading>
            <UDashboardSidebarCollapse variant="subtle" color="neutral" />
          </template>

          <template #right>
            <UTooltip :text="colorMode.value === 'dark' ? '切换为浅色模式' : '切换为深色模式'">
              <UButton
                :icon="colorMode.value === 'dark' ? 'heroicons:sun' : 'heroicons:moon'"
                color="neutral"
                variant="ghost"
                aria-label="切换主题"
                @click="toggleColorMode"
              />
            </UTooltip>

            <UTooltip text="访问博客前台">
              <UButton
                to="/"
                target="_blank"
                icon="heroicons:arrow-top-right-on-square"
                color="neutral"
                variant="ghost"
                aria-label="访问前台"
              />
            </UTooltip>

            <UDropdownMenu
              :items="userMenuItems"
              :ui="{ content: 'min-w-56' }"
            >
              <UButton
                color="neutral"
                variant="ghost"
                class="!px-2"
                aria-label="账号菜单"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="flex shrink-0 items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-bold">A</span>
                  <span class="hidden sm:flex flex-col leading-tight min-w-0 text-left">
                    <span class="text-xs font-medium text-highlighted truncate">Admin</span>
                    <span class="text-[10px] text-muted">管理员</span>
                  </span>
                  <Icon name="heroicons:chevron-down" size="xs" class="text-muted shrink-0" />
                </span>
              </UButton>
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-[1400px] mx-auto w-full">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const colorMode = useColorMode()

// admin 后台默认深色模式（设计本就是为深色调优）
onMounted(() => {
  if (colorMode.preference === 'system') {
    colorMode.preference = 'dark'
  }
})

const pageTitle = computed(() => {
  const matched = pageTitleMap[route.path]
  if (matched) return matched
  // 兼容动态路由 /admin/articles/:id
  if (route.path.startsWith('/admin/articles/')) {
    if (route.path.endsWith('/create')) return '新建文章'
    return '编辑文章'
  }
  return '管理后台'
})

const pageTitleMap: Record<string, string> = {
  '/admin': '仪表板',
  '/admin/articles': '文章管理',
  '/admin/comments': '评论管理',
  '/admin/gallery': '画廊管理',
  '/admin/imagebed': '图床管理',
  '/admin/password': '账号安全'
}

const primaryLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: '仪表板',
    icon: 'heroicons:squares-2x2',
    to: '/admin',
    active: route.path === '/admin'
  },
  {
    label: '文章管理',
    icon: 'heroicons:document-text',
    to: '/admin/articles',
    active: route.path.startsWith('/admin/articles')
  },
  {
    label: '评论管理',
    icon: 'heroicons:chat-bubble-oval-left',
    to: '/admin/comments',
    active: route.path.startsWith('/admin/comments')
  },
  {
    label: '画廊管理',
    icon: 'heroicons:photo',
    to: '/admin/gallery',
    active: route.path.startsWith('/admin/gallery')
  },
  {
    label: '图床管理',
    icon: 'heroicons:circle-stack',
    to: '/admin/imagebed',
    active: route.path.startsWith('/admin/imagebed')
  }
])

const secondaryLinks = computed<NavigationMenuItem[]>(() => [
  {
    label: '修改密码',
    icon: 'heroicons:key',
    to: '/admin/password',
    active: route.path.startsWith('/admin/password')
  }
])

const sessionInfo = computed(() => {
  if (!import.meta.client) return '— · —'
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
})

const userMenuItems = computed(() => [
  [
    {
      label: '修改密码',
      icon: 'heroicons:key',
      onSelect: () => router.push('/admin/password')
    }
  ],
  [
    {
      label: '返回前台',
      icon: 'heroicons:arrow-top-right-on-square',
      onSelect: () => {
        const link = document.createElement('a')
        link.href = '/'
        link.target = '_blank'
        link.rel = 'noopener'
        link.click()
      }
    }
  ],
  [
    {
      label: '退出登录',
      icon: 'heroicons:arrow-left-on-rectangle',
      color: 'error' as const,
      onSelect: () => handleLogout()
    }
  ]
])

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <n-config-provider :theme="isDarkMode ? darkTheme : null">
    <n-message-provider>
      <n-dialog-provider>
        <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
        <!-- 顶部导航栏 -->
        <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo 和标题 -->
          <div class="flex items-center gap-4">
            <NuxtLink to="/admin" class="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
              <Icon name="squares-2x2" size="lg" class="text-primary" />
              <span>管理后台</span>
            </NuxtLink>
          </div>

          <!-- 导航菜单 -->
          <nav class="hidden md:flex items-center gap-1">
            <NuxtLink
              v-for="item in menuItems"
              :key="item.path"
              :to="item.path"
              class="nav-link px-3 py-2 rounded-md text-sm font-medium transition-colors"
              :class="[
                isActive(item.path) 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              <Icon :name="item.icon" size="sm" class="mr-1.5" />
              {{ item.label }}
            </NuxtLink>
          </nav>

          <!-- 右侧操作 -->
          <div class="flex items-center gap-3">
            <NuxtLink to="/" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              <Icon name="home" size="md" />
            </NuxtLink>
            <n-button quaternary circle @click="handleLogout">
              <template #icon>
                <Icon name="arrow-left" size="md" />
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <!-- 移动端菜单 -->
      <div class="md:hidden border-t dark:border-gray-700">
        <div class="flex overflow-x-auto px-2 py-2 gap-1">
          <NuxtLink
            v-for="item in menuItems"
            :key="item.path"
            :to="item.path"
            class="flex-shrink-0 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
            :class="[
              isActive(item.path) 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-600 dark:text-gray-300'
            ]"
          >
            <Icon :name="item.icon" size="sm" class="mr-1" />
            {{ item.label }}
          </NuxtLink>
        </div>
      </div>
    </header>

        <!-- 主内容区 -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <slot />
        </main>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { darkTheme } from 'naive-ui'

// 主题状态
const isDarkMode = useState('isDarkMode', () => false)

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems = [
  { path: '/admin', label: '仪表板', icon: 'squares-2x2' },
  { path: '/admin/articles', label: '文章管理', icon: 'file-earmark-text' },
  { path: '/admin/comments', label: '评论管理', icon: 'chat-dots' },
  { path: '/admin/beatmaps', label: '谱面管理', icon: 'musical-note' },
  { path: '/admin/gallery', label: '画廊管理', icon: 'images' },
  { path: '/admin/imagebed', label: '图床管理', icon: 'images' },
  { path: '/admin/password', label: '修改密码', icon: 'key' }
]

const isActive = (path) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/admin/login')
}
</script>

<style scoped>
.nav-link {
  display: inline-flex;
  align-items: center;
}
</style>

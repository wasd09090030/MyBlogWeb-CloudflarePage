
<template>
  <div id="app" :class="['min-h-screen', colorMode.value === 'dark' ? 'dark' : 'light']">
    <!-- 根据主题切换动画效果 -->
    <ClientOnly>
      <Teleport to="body">
        <LazyEffectsSakuraFalling v-if="showBackgroundAnimation && colorMode.value !== 'dark'" />
        <LazyEffectsStarryNight v-else-if="showBackgroundAnimation" />
      </Teleport>
    </ClientOnly>
    <UHeader
      v-if="!isGalleryRoute"
      title="WyrmKk"
      mode="drawer"
      class="site-header"
      :class="{ 'site-header--hidden': isNavbarHidden, 'site-header--scrolled': hasScrolled }"
      :ui="{ container: 'max-w-[1400px]' }"
    >
      <template #title>
        <img
          src="/icon/logo.webp"
          alt="WyrmKk"
          class="h-9 w-auto"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
      </template>

      <UNavigationMenu :items="navigationItems" class="hidden lg:flex" />

      <template #right>
        <div class="hidden items-center gap-2 lg:flex">
          <LazyEffectsSearchBar />
          <UColorModeButton />
        </div>
      </template>

      <template #body>
        <UNavigationMenu :items="navigationItems" orientation="vertical" class="-mx-2.5" />
        <div class="mt-4 flex items-center justify-between border-t border-default pt-4">
          <span class="text-sm text-muted">外观</span>
          <UColorModeButton />
        </div>
      </template>
    </UHeader>

    <div v-if="shouldShowWelcomeSection" class="welcome-section-container"><HomeWelcomeSection /></div>
    <div class="main-container">
      <div class="main-content">
        <div class="site-layout" :class="{ 'site-layout--with-sidebar': showSidebar }">
          <main class="site-layout__content"><slot /></main>
          <aside v-if="showSidebar" class="site-layout__sidebar sidebar-animate">
            <div class="sidebar-content"><LazySideBar /></div>
          </aside>
        </div>
      </div>
    </div>
    <footer v-if="!isGalleryRoute" class="blog-footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="https://nuxt.com/" target="_blank" rel="noopener noreferrer" class="footer-link" title="Nuxt">
            <svg class="footer-icon" viewBox="0 0 400 400" fill="currentColor">
              <path d="M227.92 376H387.24C392.398 375.997 397.44 374.58 401.802 371.908C406.163 369.236 409.678 365.413 412 360.87C414.35 356.29 415.472 351.153 415.252 345.988C415.033 340.824 413.48 335.806 410.75 331.45L316.36 170.55C314.053 166.039 310.57 162.249 306.258 159.59C301.946 156.931 297.001 155.511 291.95 155.511C286.899 155.511 281.954 156.931 277.642 159.59C273.33 162.249 269.847 166.039 267.54 170.55L227.92 239.63L150.4 105.13C148.062 100.633 144.557 96.8614 140.232 94.2179C135.906 91.5743 130.929 90.1584 125.85 90.1584C120.77 90.1584 115.794 91.5743 111.468 94.2179C107.143 96.8614 103.638 100.633 101.3 105.13L4.25002 331.45C1.52009 335.806 -0.0328073 340.824 -0.25222 345.988C-0.471633 351.153 0.650403 356.29 3.00002 360.87C5.32166 365.413 8.83682 369.236 13.1982 371.908C17.5596 374.58 22.6025 375.997 27.76 376H116.68C152.24 376 178.57 359.4 196.97 327.17L266.71 205.71L291.92 163.75L365.71 289.5H266.71L227.92 376ZM115.2 289.44L49.75 289.5L125.86 156.32L164.06 223.83L115.2 289.44Z"/>
            </svg>
            <span class="footer-link-text">Nuxt</span>
          </a>
          <span class="footer-divider">·</span>
          <a href="https://github.com/wasd09090030" target="_blank" rel="noopener noreferrer" class="footer-link" title="GitHub">
            <svg class="footer-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
        <div class="footer-copyright">
          © {{ new Date().getFullYear() }} WyrmKk · Built with ❤️
        </div>
      </div>
    </footer>
    <Teleport to="body">
      <ClientOnly>
        <FloatingQuickActions
          :is-home-route="isHomeRoute"
          :is-dark-mode="colorMode.value === 'dark'"
          :is-hydrated="isHydrated"
          :show-background-animation="showBackgroundAnimation"
          @go-home="goHome"
          @scroll-top="scrollToTop"
          @toggle-theme="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
          @toggle-background="toggleBackgroundAnimation"
        />
      </ClientOnly>
    </Teleport>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue'
import FloatingQuickActions from '~/shared/ui/FloatingQuickActions.vue'

const HomeWelcomeSection = defineAsyncComponent(() => import('~/features/home/components/HomeWelcomeSection.vue'))

const route = useRoute()
const router = useRouter()

// 主题控制由 @nuxtjs/color-mode 接管（Nuxt UI 自动注册）
// - colorMode.value 当前实际值（'light' | 'dark'，system 已解析）
// - colorMode.preference 用户偏好（'light' | 'dark' | 'system'）
// 写入 preference 即可触发 localStorage 持久化 + DOM class 同步
const colorMode = useColorMode()

const isHydrated = ref(false)

const isNavbarHidden = ref(false)
const hasScrolled = ref(false)
const lastScrollY = ref(0)
const scrollThreshold = 60
const showBackgroundAnimation = ref(true)

const navigationItems = computed(() => [
  { label: '首页', icon: 'i-heroicons-home', to: '/', active: route.path === '/' },
  { label: '画廊', icon: 'i-heroicons-photo', to: '/gallery', active: route.path === '/gallery' },
  { label: '归档', icon: 'i-heroicons-book-open', to: '/archive', active: route.path === '/archive' },
  { label: '关于站长', icon: 'i-heroicons-user-circle', to: '/about', active: route.path === '/about' }
])

// 原 themeOverrides（n-config-provider）已迁移到 app.config.ts 的 ui.colors
// 与 main.css 的 @theme 块；Nuxt UI 直接消费，无需在此维护

const handleScroll = () => {
  const currentScrollY = window.scrollY
  hasScrolled.value = currentScrollY > 10
  if (currentScrollY < scrollThreshold) {
    isNavbarHidden.value = false
    lastScrollY.value = currentScrollY
    return
  }
  const scrollDiff = currentScrollY - lastScrollY.value
  if (scrollDiff > 5) isNavbarHidden.value = true
  else if (scrollDiff < -5) isNavbarHidden.value = false
  lastScrollY.value = currentScrollY
}

const goHome = () => router.push('/')

const scrollToTop = () => {
  if (import.meta.client) {
    const galleryContainer = document.querySelector('.gallery-fullscreen')
    if (galleryContainer && typeof galleryContainer.scrollTo === 'function') {
      galleryContainer.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const toggleBackgroundAnimation = () => {
  showBackgroundAnimation.value = !showBackgroundAnimation.value
}

const shouldShowWelcomeSection = computed(() => route.path === '/' && !route.query.search && !route.query.category)
const isHomeRoute = computed(() => route.path === '/')
const isGalleryRoute = computed(() => route.path === '/gallery')
const isArticleDetailRoute = computed(() => route.path.startsWith('/article/'))
const isAboutRoute = computed(() => route.path === '/about')
const isArchiveRoute = computed(() => route.path === '/archive')
const showSidebar = computed(() => !isGalleryRoute.value && !isArticleDetailRoute.value && !isAboutRoute.value && !isArchiveRoute.value)

onMounted(() => {
  isHydrated.value = true
  // 主题初始化由 @nuxtjs/color-mode 自动处理（SSG 阶段 useColorMode 即可读取，无须手动挂载钩子）
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
:global(.dark),
.dark {
  background-color: transparent;
  color: var(--text-primary);
}
#app {
  transition: background-color 0.3s ease, color 0.3s ease;
}
.site-header {
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
}
.site-header--hidden {
  transform: translateY(-100%);
}
.site-header--scrolled {
  box-shadow: var(--shadow-sm);
}

/* Main Container */
.welcome-section-container {
  padding-top: 20px;
}
.main-container {
  width: 100%;
  margin: 0 auto 3rem;
}
.main-content {
  position: relative;
  z-index: 10;
  min-height: 100vh;
  max-width: 80%;
  margin: 10px auto 0;
  padding: 1.5rem 0 0;
}
.site-layout {
  width: 100%;
  padding: 0 1rem;
}
.site-layout__content {
  min-width: 0;
  margin: 0;
  padding: 0 0 20px;
}
.site-layout__sidebar {
  display: none;
}
.sidebar-content {
  position: sticky;
  top: 80px;
  height: fit-content;
}
@media (min-width: 992px) {
  .site-layout--with-sidebar {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(15rem, 1fr);
    column-gap: 1.5rem;
  }
  .site-layout__sidebar {
    display: block;
  }
}
@media (max-width: 768px) {
  .main-content {
    width: 100%;
    max-width: 100%;
    margin-top: 0;
    padding: 1rem 12px 20px;
  }
  .site-layout {
    padding: 0;
  }
}
@media (min-width: 768px) and (max-width: 992px) {
  .main-content {
    max-width: 85%;
  }
}
.main-container {
  margin-bottom: 3rem;
}

/* Footer */
.blog-footer {
  margin-top: auto;
  padding: 1.5rem 1rem;
  border-top: 1px solid var(--border-color);
  background: var(--footer-bg);
  backdrop-filter: blur(8px);
  position: relative;
  z-index: 10;
}
:global(.dark) .blog-footer,
.dark .blog-footer {
  border-top-color: var(--border-color-dark);
  background: var(--footer-bg);
}
.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.footer-links {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  transition: color 0.2s ease, background-color 0.2s ease;
}
.footer-link:hover {
  color: var(--primary-color);
  background-color: var(--footer-link-hover-bg);
}
.footer-icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
}
:global(.dark) .footer-link,
.dark .footer-link {
  color: var(--text-secondary);
}
:global(.dark) .footer-link:hover,
.dark .footer-link:hover {
  color: var(--primary-color);
  background-color: var(--footer-link-hover-bg);
}
.footer-divider {
  color: var(--text-tertiary);
  font-size: 0.875rem;
  user-select: none;
}
:global(.dark) .footer-divider,
.dark .footer-divider {
  color: var(--text-tertiary);
}
.footer-copyright {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  letter-spacing: 0.01em;
}
:global(.dark) .footer-copyright,
.dark .footer-copyright {
  color: var(--text-tertiary);
}
@media (max-width: 576px) {
  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>

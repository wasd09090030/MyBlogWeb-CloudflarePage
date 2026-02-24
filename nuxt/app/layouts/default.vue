<template>
  <n-config-provider :theme="isDarkMode ? darkTheme : null" :theme-overrides="themeOverrides">
    <n-message-provider>
      <div id="app" :class="['min-vh-100', isDarkMode ? 'dark-theme' : 'light-theme']">
        <!-- 根据主题切换动画效果 - 使用懒加载减少首屏 JS -->
        <Teleport to="body">
          <LazyEffectsSakuraFalling v-if="showBackgroundAnimation && !isDarkMode" />
          <LazyEffectsStarryNight v-else-if="showBackgroundAnimation" />
        </Teleport>
        <header v-if="!isGalleryRoute" class="app-navbar" :class="{ 'navbar-hidden': isNavbarHidden, 'navbar-scrolled': hasScrolled }">
          <div class="navbar-container">
            <NuxtLink to="/" class="navbar-brand">
              <img src="/icon/logo.webp" alt="Logo" class="navbar-logo" loading="eager" fetchpriority="high" decoding="async" />
            </NuxtLink>
            <nav class="navbar-center-nav d-none d-lg-flex">
              <NuxtLink to="/" class="nav-link">
                <Icon name="house" size="sm" class="me-1" />首页
              </NuxtLink>
              <NuxtLink to="/gallery" class="nav-link">
                <Icon name="images" size="sm" class="me-1" />画廊
              </NuxtLink>
              <NuxtLink to="/tools" class="nav-link">
                <Icon name="wrench-screwdriver" size="sm" class="me-1" />工具箱
              </NuxtLink>
              <div 
                class="nav-more-wrapper"
                @mouseenter="showMoreMenu = true" 
                @mouseleave="showMoreMenu = false"
              >
                <button type="button" class="nav-link nav-more-trigger" aria-label="其他导航">
                  <Icon name="grid-3x3-gap" size="sm" class="me-1" />其他
                  <Icon name="chevron-down" size="xs" class="ms-1" />
                </button>
                <Transition name="dropdown-fade">
                  <div v-show="showMoreMenu" class="nav-more-panel" role="menu" aria-label="其他">
                    <NuxtLink to="/tutorials" class="nav-more-item" role="menuitem">
                      <Icon name="book" size="xs" class="me-1" />教程
                    </NuxtLink>
                    <NuxtLink to="/mania" class="nav-more-item" role="menuitem">
                      <Icon name="musical-note" size="xs" class="me-1" />音游
                    </NuxtLink>
                    <NuxtLink to="/about" class="nav-more-item" role="menuitem">
                      <Icon name="person-circle" size="xs" class="me-1" />关于站长
                    </NuxtLink>
                  </div>
                </Transition>
              </div>
            </nav>
            <n-button 
              quaternary 
              circle 
              class="mobile-menu-btn d-lg-none" 
              @click="showMobileMenu = true"
              aria-label="打开导航菜单"
            >
              <template #icon>
                <Icon name="list" size="lg" />
              </template>
            </n-button>
            <div class="navbar-right-buttons d-none d-lg-flex">
              <LazyEffectsSearchBar />
            </div>
          </div>
        </header>
        <n-drawer v-if="!isGalleryRoute" v-model:show="showMobileMenu" :width="280" placement="left">
          <n-drawer-content title="导航菜单" closable>
            <n-menu :options="mobileMenuOptions" @update:value="handleMobileMenuSelect" />
            <template #footer>
              <div class="mobile-drawer-footer">
                <n-button block @click="toggleTheme">
                <template #icon>
                  <Icon v-if="isHydrated" :name="isDarkMode ? 'sun-fill' : 'moon-fill'" size="md" :solid="true" />
                  <Icon v-else name="moon-fill" size="md" :solid="true" />
                </template>
                  {{ isDarkMode ? '浅色模式' : '深色模式' }}
                </n-button>
              </div>
            </template>
          </n-drawer-content>
        </n-drawer>
        <div v-if="shouldShowWelcomeSection" class="welcome-section-container"><HomeWelcomeSection /></div>
        <div class="main-container">
          <div class="main-content">
            <div class="container-fluid">
              <div class="row">
                <div class="col-12" :class="{ 'col-lg-8 col-xl-9': showSidebar, 'col-lg-12 col-xl-12': !showSidebar }">
                  <main><slot /></main>
                </div>
                <div v-if="showSidebar" class="col-lg-4 col-xl-3 d-none d-lg-block sidebar-animate">
                  <div class="sidebar-content"><LazySideBar /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer v-if="!isGalleryRoute" class="blog-footer">
          <div class="footer-content">
            <div class="footer-links">
              <a href="https://www.naiveui.com/" target="_blank" rel="noopener noreferrer" class="footer-link" title="Naive UI">
                <!-- Naive UI Logo -->
                <svg class="footer-icon" viewBox="0 0 128 128" fill="currentColor">
                  <path d="M64 0C28.7 0 0 28.7 0 64s28.7 64 64 64 64-28.7 64-64S99.3 0 64 0zm0 16c26.5 0 48 21.5 48 48S90.5 112 64 112 16 90.5 16 64 37.5 16 64 16zm0 16c-17.7 0-32 14.3-32 32s14.3 32 32 32 32-14.3 32-32-14.3-32-32-32zm0 16c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16z"/>
                </svg>
                <span class="footer-link-text">Naive UI</span>
              </a>
              <span class="footer-divider">·</span>
              <a href="https://nuxt.com/" target="_blank" rel="noopener noreferrer" class="footer-link" title="Nuxt">
                <!-- Nuxt Logo -->
                <svg class="footer-icon" viewBox="0 0 400 400" fill="currentColor">
                  <path d="M227.92 376H387.24C392.398 375.997 397.44 374.58 401.802 371.908C406.163 369.236 409.678 365.413 412 360.87C414.35 356.29 415.472 351.153 415.252 345.988C415.033 340.824 413.48 335.806 410.75 331.45L316.36 170.55C314.053 166.039 310.57 162.249 306.258 159.59C301.946 156.931 297.001 155.511 291.95 155.511C286.899 155.511 281.954 156.931 277.642 159.59C273.33 162.249 269.847 166.039 267.54 170.55L227.92 239.63L150.4 105.13C148.062 100.633 144.557 96.8614 140.232 94.2179C135.906 91.5743 130.929 90.1584 125.85 90.1584C120.77 90.1584 115.794 91.5743 111.468 94.2179C107.143 96.8614 103.638 100.633 101.3 105.13L4.25002 331.45C1.52009 335.806 -0.0328073 340.824 -0.25222 345.988C-0.471633 351.153 0.650403 356.29 3.00002 360.87C5.32166 365.413 8.83682 369.236 13.1982 371.908C17.5596 374.58 22.6025 375.997 27.76 376H116.68C152.24 376 178.57 359.4 196.97 327.17L266.71 205.71L291.92 163.75L365.71 289.5H266.71L227.92 376ZM115.2 289.44L49.75 289.5L125.86 156.32L164.06 223.83L115.2 289.44Z"/>
                </svg>
                <span class="footer-link-text">Nuxt</span>
              </a>
              <span class="footer-divider">·</span>
              <a href="https://github.com/wasd09090030" target="_blank" rel="noopener noreferrer" class="footer-link" title="GitHub">
                <!-- GitHub Logo -->
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
        <div class="floating-action-buttons" aria-label="Quick actions">
          <button
            v-if="!isHomeRoute"
            type="button"
            class="fab-btn"
            @click="goHome"
            aria-label="回主页"
          >
            <Icon name="house" size="16" />
          </button>
          <button
            type="button"
            class="fab-btn"
            @click="scrollToTop"
            aria-label="回到顶部"
          >
            <Icon name="arrow-up" size="16" />
          </button>
          <button
            type="button"
            class="fab-btn"
            @click="toggleTheme"
            :aria-label="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
          >
            <Icon v-if="isHydrated" :name="isDarkMode ? 'sun-fill' : 'moon-fill'" size="16" :solid="true" />
            <Icon v-else name="moon-fill" size="16" :solid="true" />
          </button>
          <button
            type="button"
            class="fab-btn"
            :class="{ 'is-muted': !showBackgroundAnimation }"
            @click="toggleBackgroundAnimation"
            :aria-pressed="!showBackgroundAnimation"
            aria-label="背景动画开关"
          >
            <Icon name="sparkles" size="16" />
          </button>
        </div>
        </ClientOnly>
        </Teleport>
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { darkTheme } from 'naive-ui'
import { defineAsyncComponent } from 'vue'
// Effects 相关组件（SakuraFalling 和 StarryNight）改用 Lazy 前缀动态加载，减少首屏 JS

const HomeWelcomeSection = defineAsyncComponent(() => import('~/features/home/components/HomeWelcomeSection.vue'))

const route = useRoute()
const router = useRouter()
const { isDarkMode, initTheme, toggleTheme } = useTheme()

const showMobileMenu = ref(false)
const isHydrated = ref(false)
const showMoreMenu = ref(false)

// 导航栏滚动隐藏/显示逻辑
const isNavbarHidden = ref(false)
const hasScrolled = ref(false)
const lastScrollY = ref(0)
const scrollThreshold = 60 // 滚动超过此值才触发隐藏
const showBackgroundAnimation = ref(true)

const handleScroll = () => {
  const currentScrollY = window.scrollY
  
  // 是否已滚动（用于添加阴影效果）
  hasScrolled.value = currentScrollY > 10
  
  // 在页面顶部时始终显示
  if (currentScrollY < scrollThreshold) {
    isNavbarHidden.value = false
    lastScrollY.value = currentScrollY
    return
  }
  
  // 计算滚动差值
  const scrollDiff = currentScrollY - lastScrollY.value
  
  // 向下滚动超过阈值时隐藏
  if (scrollDiff > 5) {
    isNavbarHidden.value = true
  }
  // 向上滚动时显示
  else if (scrollDiff < -5) {
    isNavbarHidden.value = false
  }
  
  lastScrollY.value = currentScrollY
}

const themeOverrides = computed(() => ({
  common: {
    primaryColor: '#0d6efd',
    primaryColorHover: '#0b5ed7',
    primaryColorPressed: '#0a58ca'
  },
  Dropdown: {
    borderRadius: '12px',
    padding: '6px',
    optionBorderRadius: '8px'
  }
}))

const categoryOptions = [
  { label: '全部', key: 'all' },
  { label: '学习', key: 'study' },
  { label: '游戏', key: 'game' },
  { label: '个人作品', key: 'work' },
  { label: '资源分享', key: 'resource' }
]

const mobileMenuOptions = computed(() => [
  {
    label: '首页',
    key: 'home',
    icon: () => h(resolveComponent('Icon'), { name: 'house', size: 'sm' })
  },
  {
    label: '画廊',
    key: 'gallery',
    icon: () => h(resolveComponent('Icon'), { name: 'images', size: 'sm' })
  },
  {
    label: '工具箱',
    key: 'tools',
    icon: () => h(resolveComponent('Icon'), { name: 'puzzle-piece', size: 'sm' })
  },
  {
    label: '其他',
    key: 'other',
    icon: () => h(resolveComponent('Icon'), { name: 'grid-3x3-gap', size: 'sm' }),
    children: [
      {
        label: '教程',
        key: 'tutorials',
        icon: () => h(resolveComponent('Icon'), { name: 'book', size: 'sm' })
      },
      {
        label: '音游',
        key: 'mania',
        icon: () => h(resolveComponent('Icon'), { name: 'musical-note', size: 'sm' })
      },
      {
        label: '关于站长',
        key: 'about',
        icon: () => h(resolveComponent('Icon'), { name: 'person-circle', size: 'sm' })
      }
    ]
  }
])

const handleCategorySelect = (key) => {
  if (key === 'all') {
    router.push({ path: '/' })
  } else {
    router.push({ path: '/', query: { category: key } })
  }
}

const handleMobileMenuSelect = (key) => {
  showMobileMenu.value = false
  if (key === 'home') {
    router.push('/')
  } else if (key === 'gallery') {
    router.push('/gallery')
  } else if (key === 'tutorials') {
    router.push('/tutorials')
  } else if (key === 'tools') {
    router.push('/tools')
  } else if (key === 'mania') {
    router.push('/mania')
  } else if (key === 'about') {
    router.push('/about')
  }
}

const goHome = () => {
  router.push('/')
}

const scrollToTop = () => {
  if (process.client) {
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
const isTutorialsRoute = computed(() => route.path === '/tutorials')
const isToolsRoute = computed(() => route.path.startsWith('/tools'))
const isManiaRoute = computed(() => route.path.startsWith('/mania'))
const showSidebar = computed(() => !isGalleryRoute.value && !isArticleDetailRoute.value && !isAboutRoute.value && !isToolsRoute.value && !isTutorialsRoute.value && !isManiaRoute.value)

onMounted(() => {
  isHydrated.value = true
  initTheme()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
<style scoped>

:global(.dark),
.dark-theme {
  background-color: transparent;
  color: var(--text-primary);
}
#app {
  transition: background-color 0.3s ease, color 0.3s ease;
}
.app-navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: transparent;
  backdrop-filter: none;
  border-bottom: 1px solid transparent;
  padding: 1rem;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
              background-color 0.3s ease, 
              border-color 0.3s ease,
              padding 0.3s ease,
              box-shadow 0.3s ease;
}

.app-navbar.navbar-scrolled {
  background: var(--navbar-scrolled-bg);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--navbar-scrolled-border);
  box-shadow: var(--navbar-scrolled-shadow);
  padding: 0.6rem 1rem; /* 滚动后变窄 */
}

.app-navbar.navbar-hidden {
  transform: translateY(-100%);
}

:global(.dark) .app-navbar,
.dark-theme .app-navbar {
  background: transparent;
  border-bottom-color: transparent;
}

:global(.dark) .app-navbar.navbar-scrolled,
.dark-theme .app-navbar.navbar-scrolled {
  background: var(--navbar-scrolled-bg);
  border-bottom-color: var(--navbar-scrolled-border);
  box-shadow: var(--navbar-scrolled-shadow);
}
.navbar-container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.navbar-center-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.nav-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  color: var(--text-primary);
  text-decoration: none;
  border-radius: 0.625rem;
  font-weight: 500;
  font-size: 1.1rem;
  background: transparent;
  border: none;
  font-family: inherit;
  line-height: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-link:hover {
  background: var(--nav-link-hover-bg);
  color: var(--primary-color);
}

.nav-link:active {
  background: var(--nav-link-active-bg);
}

/* 焦点样式 */
.nav-link:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 3px;
  border-radius: 0.625rem;
}

.nav-more-wrapper {
  position: relative;
  display: inline-flex;
}

.nav-more-trigger {
  appearance: none;
}

.nav-more-panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
  z-index: 1000;
}

/* Dropdown fade transition */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}

.dropdown-fade-enter-to,
.dropdown-fade-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.nav-more-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.42rem 0.78rem;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  text-decoration: none;
  color: var(--text-primary);
  font-size: 0.92rem;
  transition: all 0.2s ease;
}

.nav-more-item:hover {
  background: var(--nav-link-hover-bg);
  border-color: var(--accent-primary);
  color: var(--primary-color);
}

.nav-more-item:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 深色主题 */
:global(.dark) .nav-link,
.dark-theme .nav-link {
  color: var(--text-primary);
}

:global(.dark) .nav-link:hover,
.dark-theme .nav-link:hover {
  background: var(--nav-link-hover-bg);
  color: var(--primary-color-hover);
}

:global(.dark) .nav-link:active,
.dark-theme .nav-link:active {
  background: var(--nav-link-active-bg);
}

:global(.dark) .nav-more-panel,
.dark-theme .nav-more-panel {
  border-color: var(--border-color-dark);
  background: var(--bg-secondary);
}

:global(.dark) .nav-more-item,
.dark-theme .nav-more-item {
  border-color: var(--border-color-dark);
  background: var(--bg-primary);
}

.navbar-right-buttons {
  display: flex;
  align-items: center;
}
.theme-toggle-btn {
  font-size: 1.1rem;
}
.mobile-menu-btn {
  font-size: 1.5rem;
}
.mobile-drawer-footer {
  padding: 1rem;
}
@media (min-width: 992px) {
  .d-lg-none {
    display: none !important;
  }
}
@media (max-width: 991.98px) {
  .d-none.d-lg-flex {
    display: none !important;
  }
}

/* Main Container */
.main-container {
  margin-bottom: 3rem;
}

/* Footer Styles */
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
.dark-theme .blog-footer {
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
.dark-theme .footer-link {
  color: var(--text-secondary);
}

:global(.dark) .footer-link:hover,
.dark-theme .footer-link:hover {
  color: var(--primary-color);
  background-color: var(--footer-link-hover-bg);
}

.footer-link-icon {
  font-size: 1.125rem;
}

.footer-divider {
  color: var(--text-tertiary);
  font-size: 0.875rem;
  user-select: none;
}

:global(.dark) .footer-divider,
.dark-theme .footer-divider {
  color: var(--text-tertiary);
}

.footer-copyright {
  font-size: 0.8125rem;
  color: var(--text-tertiary);
  letter-spacing: 0.01em;
}

:global(.dark) .footer-copyright,
.dark-theme .footer-copyright {
  color: var(--text-tertiary);
}

@media (max-width: 576px) {
  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>

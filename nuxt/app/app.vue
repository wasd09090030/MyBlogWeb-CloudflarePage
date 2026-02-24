<template>
  <NuxtLoadingIndicator color="var(--accent-success)" :height="3" :duration="2000" :throttle="200" />
  <NuxtLayout>
    <NuxtPage :keepalive="shouldKeepAlive" :page-key="getPageKey" :transition="{
      name: 'page',
      mode: 'out-in'
    }" />
  </NuxtLayout>
</template>

<script setup>

const route = useRoute()

// 判断是否启用 keepalive - admin 页面禁用以避免布局切换冲突
const shouldKeepAlive = computed(() => {
  return !route.path.startsWith('/admin')
})

// 获取页面 key - 对于首页使用固定 key 以启用缓存
const getPageKey = (route) => {
  // admin 页面不需要缓存 key
  if (route.path.startsWith('/admin')) {
    return route.fullPath
  }

  // 对于首页（index 页面），使用固定的 key 以便缓存
  if (route.name === 'index') {
    return 'index-page'
  }

  // 对于其他页面，使用完整路径作为 key
  return route.fullPath
}

const defaultDescription = '分享技术、生活与创作的个人博客'

useSeoMeta({
  title: 'WyrmKk',
  titleTemplate: '%s · WyrmKk',
  description: defaultDescription,
  keywords: '博客,技术,前端,后端,Vue,JavaScript,Python,动漫资源',
  author: 'WASD09090030',
  ogType: 'website',
  ogSiteName: 'WyrmKk',
  ogTitle: 'WyrmKk - 个人网站',
  ogDescription: defaultDescription,
  ogImage: '/og-default.svg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'WyrmKk - 个人技术博客',
  twitterDescription: defaultDescription,
  twitterImage: '/og-default.svg'
})

// 应用全局配置
useHead({
  htmlAttrs: {
    lang: 'zh-CN'
  },
  meta: [
    { name: 'format-detection', content: 'telephone=no' }
  ]
})

// 初始化认证状态（立即执行，不等待挂载）
const authStore = useAuthStore()
if (import.meta.client) {
  // 立即初始化，不等待 onMounted
  authStore.initialize()
}

// 添加路由守卫，处理从 gallery 页面离开时恢复滚动
const router = useRouter()
router.afterEach((to, from) => {
  // 当从 gallery 路由离开时，确保恢复 body 滚动
  if (from.name === 'gallery' && to.name !== 'gallery') {
    document.body.style.overflow = ''
    document.body.style.removeProperty('overflow')
    // 清理可能遗留的标记
    if (window.__galleryOriginalOverflow !== undefined) {
      delete window.__galleryOriginalOverflow
    }
  }
})
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--bg-secondary);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 全局动画类 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 页面过渡动画 - 平滑的淡入淡出 + 轻微缩放 */
.page-enter-active,
.page-leave-active {
  transition: all 0.25s ease-out;
}

.page-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: scale(1.02) translateY(-10px);
}

/* 确保过渡期间元素定位正确 */
.page-enter-active,
.page-leave-active {
  position: relative;
  z-index: 1;
}

.page-leave-active {
  position: absolute;
  width: 100%;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/* 自定义选择文本颜色 */
::selection {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

::-moz-selection {
  background: var(--accent-primary);
  color: var(--text-inverse);
}

/* 焦点样式 */
:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* 图片优化 */
img {
  max-width: 100%;
  height: auto;
}

/* 链接样式 */
a {
  color: var(--accent-primary);
  text-decoration: none;
  transition: color 0.3s ease;
}

a:hover {
  color: var(--accent-primary-hover);
}

/* 按钮基础样式 */
.btn {
  transition: all 0.3s ease;
}

.btn:active {
  transform: scale(0.98);
}

/* 卡片阴影效果 */
.card {
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* 表单样式 */
.form-control:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 0.2rem var(--focus-ring-color);
}

/* 工具类 */
.text-gradient {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bg-gradient-primary {
  background: var(--gradient-primary) !important;
}

.shadow-custom {
  box-shadow: var(--shadow-lg) !important;
}

/* 响应式隐藏类 */
@media (max-width: 576px) {
  .hide-mobile {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .hide-tablet {
    display: none !important;
  }
}

@media (max-width: 992px) {
  .hide-desktop {
    display: none !important;
  }
}

/* 加载状态 */
.loading {
  pointer-events: none;
  opacity: 0.6;
}

/* 错误状态 */
.error {
  color: var(--accent-danger);
}

/* 成功状态 */
.success {
  color: var(--accent-success);
}

/* 警告状态 */
.warning {
  color: var(--accent-warning);
}

/* 信息状态 */
.info {
  color: var(--accent-info);
}

/* 打印样式 */
@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
  }

  a {
    color: black !important;
    text-decoration: underline !important;
  }
}

/* 无障碍支持 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .btn {
    border-width: 2px !important;
  }

  .card {
    border-width: 2px !important;
  }
}
</style>

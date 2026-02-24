<template>
  <div class="welcome-section">
    <!-- 左侧图片区域 -->
    <div class="carousel-wrapper welcome-image-wrapper">
      <div class="welcome-image-container">
        <img
          src="/icon/20251214_141332_compressed.webp"
          alt="Welcome Image"
          class="welcome-image"
          loading="eager"
          fetchpriority="high"
          decoding="async"
        />
        <div class="explore-btn-container">
          <button class="explore-btn" @click="goToRandomArticle" aria-label="随机浏览文章">

              <Icon name="arrow-path" size="20" class="me-2" />

            <span>开始探索</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧信息区域 -->
    <div class="info-section">
      <!-- 顶部区域：公告 + 图标走马灯统一容器 -->
      <div class="top-section">
        <div class="announcement-text-content">
          <h3 class="announcement-title">简洁、美观、高性能的个人网站</h3>
          <p class="announcement-subtitle">Build with Asp.Net Core8.0 and Nuxt</p>
        </div>
        
        <!-- 图标走马灯 -->
        <IconMarquee class="icon-marquee-wrapper" />
      </div>

      <!-- 底部三个小卡片 -->
      <div class="bottom-cards">
        <!-- 文章卡片 -->
        <div class="info-card articles-card" @click="goToArticles">
          <!-- 白色斜切背景层 -->
          <div class="hover-bg-effect"></div>
          <!-- Hover时出现的内容 -->
          <div class="card-hover-reveal">
            <span class="hover-text">Start</span>
  
              <Icon name="arrow-right" size="lg" />
         
          </div>
          <!-- 默认内容 -->
          <div class="card-content-wrapper">      
                <Icon name="file-text" size="24" />
            <h5 class="card-title">文章</h5>
          </div>
        </div>

        <!-- 画廊卡片 -->
        <div class="info-card gallery-card" @click="goToGallery">
          <div class="hover-bg-effect"></div>
          <div class="card-hover-reveal">
            <span class="hover-text">Start</span>
        
              <Icon name="arrow-right" size="lg" />

          </div>
          <div class="card-content-wrapper">    
                <Icon name="images" size="24" />
            <h5 class="card-title">画廊</h5>
          </div>
        </div>

        <!-- 教程卡片 -->
        <div class="info-card host-card" @click="goToTutorials">
          <div class="hover-bg-effect"></div>
          <div class="card-hover-reveal">
            <span class="hover-text">Start</span>
          
              <Icon name="arrow-right" size="lg" />
       
          </div>
          <div class="card-content-wrapper">

          
                <Icon name="book" size="24" />
          

            <h5 class="card-title">教程</h5>
          </div>
        </div>
      </div>
    </div>

    <!-- 移动端悬浮导航按钮 -->
    <div class="mobile-fab-container">
      <!-- 遮罩层 -->
      <div 
        class="fab-overlay" 
        :class="{ 'fab-overlay-active': isFabExpanded }"
        @click="toggleFab"
      ></div>
      
      <!-- 展开的菜单项 -->
      <div class="fab-menu" :class="{ 'fab-menu-expanded': isFabExpanded }">
        <div class="fab-menu-item" @click="handleFabArticles">
          <span class="fab-menu-label">文章</span>
          <div class="fab-menu-icon articles-icon">
         
              <Icon name="file-text" size="md" />
         
          </div>
        </div>
        <div class="fab-menu-item" @click="handleFabGallery">
          <span class="fab-menu-label">画廊</span>
          <div class="fab-menu-icon gallery-icon">
      
              <Icon name="images" size="md" />
       
          </div>
        </div>
        <div class="fab-menu-item" @click="handleFabAbout">
          <span class="fab-menu-label">关于</span>
          <div class="fab-menu-icon about-icon">
       
              <Icon name="person-circle" size="md" />
          </div>
        </div>
      </div>
      
      <!-- 主悬浮按钮 -->
      <button 
        class="fab-main-btn" 
        :class="{ 'fab-main-btn-active': isFabExpanded }"
        @click="toggleFab"
      >
      
          <Icon name="grid-3x3-gap-fill" size="lg" class="fab-icon-default" />
          <Icon name="x-lg" size="lg" class="fab-icon-close" />
 
      </button>
    </div>
  </div>

</template>

<script setup>
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'
import { useArticleNavigation } from '~/composables/useArticleNavigation'

const router = useRouter()
const { navigateToArticle } = useArticleNavigation()

// 响应式数据
const articleCount = ref(0)
const loading = ref(false)
const isFabExpanded = ref(false)

// API composable
const { getArticles, getAllArticles } = useArticlesFeature()

// 页面导航功能
const goToArticles = () => {
  // 优先尝试滚动到文章列表容器
  const articleListContainer = document.querySelector('.article-list-page')
  if (articleListContainer) {
    articleListContainer.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    return
  }

  // 如果找不到文章列表容器，尝试滚动到主内容区域
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
    return
  }

  // 最后的备选方案：滚动到页面适当位置
  window.scrollTo({
    top: window.innerHeight * 0.6,
    behavior: 'smooth'
  })
}

const goToGallery = () => {
  router.push('/gallery')
}

const goToTutorials = () => {
  router.push('/tutorials')
}

// 悬浮按钮相关方法
const toggleFab = () => {
  isFabExpanded.value = !isFabExpanded.value
}

const handleFabArticles = () => {
  isFabExpanded.value = false
  goToArticles()
}

const handleFabGallery = () => {
  isFabExpanded.value = false
  goToGallery()
}

const handleFabAbout = () => {
  isFabExpanded.value = false
  goToAbout()
}

// 随机跳转文章
const goToRandomArticle = async () => {
  try {
    let articles = []
    
    console.log('获取所有文章...')
    const allArticles = await getAllArticles()

    if (allArticles && allArticles.length > 0) {
      articles = allArticles
      console.log('成功获取所有文章，共', articles.length, '篇')
      
      const randomIndex = Math.floor(Math.random() * articles.length)
      const randomArticle = articles[randomIndex]

      if (randomArticle && randomArticle.id) {
        console.log('随机跳转到文章:', randomArticle.id, '-', randomArticle.title)
        navigateToArticle(randomArticle)
      }
    } else {
      console.warn('没有找到可用的文章')
    }
  } catch (error) {
    console.error('获取随机文章失败:', error)
  }
}

// 生命周期
onMounted(async () => {
  console.log('WelcomeSection: 组件挂载')
})

const getArticlePath = (article) => {
  if (!article?.id || article.id === 'null' || article.id === 'undefined') {
    return '/'
  }
  return article.slug ? `/article/${article.id}-${article.slug}` : `/article/${article.id}`
}
</script>

<style scoped>
@import '~/assets/css/components/WelcomeSection.styles.css';

.welcome-image-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
  /* 
     保持 .carousel-wrapper 的布局属性如果不生效 
     但我们保留了 class="carousel-wrapper" 在 HTML 中
     所以这里不需要重复 flex 也行
  */
}

.welcome-image-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.welcome-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.8s ease;
}

.explore-btn-container {
  position: absolute;
  bottom: 25px;
  left: 25px;
  z-index: 10;
}

.explore-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50px;
  color: #333;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.explore-btn:hover {
  background: #ffffff;
}

/* 深色模式适配 */
:global(.dark-theme) .explore-btn {
  background: rgba(30, 30, 30, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
}

:global(.dark-theme) .explore-btn:hover {
  background: rgba(40, 40, 40, 0.95);
  color: #818cf8;
}
</style>

<template>
  <div class="welcome-section">
    <!-- 全宽横幅：蜜桃晚霞插画场景 -->
    <div class="peach-hero">
      <PeachSunsetScene class="hero-scene" />
      <div class="hero-overlay" aria-hidden="true"></div>
      <div class="hero-in">
        <div class="hero-eyebrow">Peach · 蜜桃时刻</div>
        <h1 class="hero-title">你好，我是 WyrmKk</h1>
        <p class="hero-sub">记录代码、游戏与生活的个人博客 —— 甜甜的，慢慢读</p>
        <div class="hero-cta">
          <button type="button" class="hero-btn-primary" @click="goToRandomArticle">
            <Icon name="heroicons:arrow-path" size="18" />
            <span>开始探索</span>
          </button>
          <button type="button" class="hero-btn-ghost" @click="goToGallery">
            <Icon name="heroicons:photo" size="18" />
            <span>进入画廊</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 三张重叠导航卡 -->
    <div class="peach-cards">
      <button type="button" class="peach-card" @click="goToArticles">
        <span class="card-ic ic-article"><Icon name="heroicons:document-text" size="22" /></span>
        <span class="card-body"><b>文章</b><span>阅读精选内容</span></span>
        <span class="card-more" aria-hidden="true">→</span>
      </button>
      <button type="button" class="peach-card" @click="goToGallery">
        <span class="card-ic ic-gallery"><Icon name="heroicons:photo" size="22" /></span>
        <span class="card-body"><b>画廊</b><span>浏览影像收藏</span></span>
        <span class="card-more" aria-hidden="true">→</span>
      </button>
      <button type="button" class="peach-card" @click="goToArchive">
        <span class="card-ic ic-archive"><Icon name="heroicons:book-open" size="22" /></span>
        <span class="card-body"><b>归档</b><span>按时间回顾</span></span>
        <span class="card-more" aria-hidden="true">→</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import PeachSunsetScene from '~/shared/ui/PeachSunsetScene.vue'
import { useArticlesFeature } from '~/features/article-list/composables/useArticlesFeature'
import { useArticleNavigation } from '~/composables/useArticleNavigation'

const router = useRouter()
const { navigateToArticle } = useArticleNavigation()

// API composable
const { getAllArticles } = useArticlesFeature()

// 页面导航功能
const goToArticles = () => {
  // 优先尝试滚动到文章列表容器
  const articleListContainer = document.querySelector('.article-list-page')
  if (articleListContainer) {
    articleListContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  // 如果找不到文章列表容器，尝试滚动到主内容区域
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  // 最后的备选方案：滚动到页面适当位置
  window.scrollTo({ top: window.innerHeight * 0.6, behavior: 'smooth' })
}

const goToGallery = () => {
  router.push('/gallery')
}

const goToArchive = () => {
  router.push('/archive')
}

// 随机跳转文章
const goToRandomArticle = async () => {
  try {
    const allArticles = await getAllArticles()
    if (allArticles && allArticles.length > 0) {
      const randomArticle = allArticles[Math.floor(Math.random() * allArticles.length)]
      if (randomArticle && randomArticle.id) {
        navigateToArticle(randomArticle)
      }
    }
  } catch (error) {
    console.error('获取随机文章失败:', error)
  }
}
</script>

<style scoped>
@import '~/assets/css/components/WelcomeSection.desktop.css';
@import '~/assets/css/components/WelcomeSection.mobile.css';
</style>

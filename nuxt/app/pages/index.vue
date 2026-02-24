<template>
  <ArticleListPageContainer />
</template>

<script setup>
import ArticleListPageContainer from '~/features/article-list/containers/ArticleListPageContainer.vue'

// 设置页面元数据，启用 keepalive
definePageMeta({
  name: 'index',
  keepalive: true,
  key: () => 'index-page'
})

// 定义组件名称，方便 keep-alive 缓存命中
defineOptions({
  name: 'ArticleListPage'
})

const route = useRoute()

const pageTitle = computed(() => {
  if (route.query.search) return '搜索结果'
  if (route.query.category === 'study') return '学习'
  if (route.query.category === 'game') return '游戏'
  if (route.query.category === 'work') return '个人作品'
  if (route.query.category === 'resource') return '资源分享'
  return '首页'
})

const pageDescription = computed(() => {
  if (route.query.search) return '根据关键词实时筛选出的相关文章'
  const categoryDescriptions = {
    'study': '记录学习心得和技术沉淀',
    'game': '游戏体验与创意灵感',
    'work': '个人作品与项目总结',
    'resource': '精选资源与效率工具'
  }
  if (route.query.category) {
    const key = route.query.category.toLowerCase()
    return categoryDescriptions[key] || '精选文章与阅读灵感'
  }
  return '精选文章与最新动态，欢迎随时探索更多内容'
})

useHead(() => ({
  title: `${pageTitle.value}`,
  meta: [
    { name: 'description', content: '欢迎来到我的个人博客，分享技术文章和生活感悟' },
    { name: 'keywords', content: '博客,文章,技术分享,个人网站' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/icon/Myfavicon.ico' }
  ]
}))
</script>

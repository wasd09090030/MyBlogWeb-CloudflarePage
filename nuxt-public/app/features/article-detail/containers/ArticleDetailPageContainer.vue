<template>
  <UPage
    class="article-detail-page-layout min-h-screen"
    :ui="{
      root: 'lg:gap-0',
      center: 'article-detail-page-center min-w-0 flex-1 bg-white dark:bg-gray-900 rounded-xl overflow-hidden lg:rounded-l-xl lg:rounded-r-none',
      right: 'article-detail-page-right order-last'
    }"
  >
    <!-- 状态渲染优先级：loading -> error -> content -> empty -->
    <StateLoading v-if="pending">
      <div class="flex flex-col items-center justify-center min-h-[60vh]">
        <UProgress animation="carousel" size="lg" color="primary" />
        <p class="mt-4 text-gray-500 dark:text-gray-400">加载中...</p>
      </div>
    </StateLoading>

    <StateError v-else-if="error">
      <ContentPageBody width="article" vertical="content">
        <UAlert
          color="error"
          variant="soft"
          title="加载失败"
          :description="`加载文章失败: ${error.message}`"
        />
      </ContentPageBody>
    </StateError>

    <article v-else-if="article" class="relative">
      <ArticleDetailCoverImage :article="article" />

      <ContentPageBody width="article" vertical="content" spacing="compact">
        <ArticleDetailHeader :article="article" @go-back="goBack" />
        <ArticleDetailContent :article="article" @toc-ready="onTocReady" @go-back="goBack" />
      </ContentPageBody>
    </article>

    <StateEmpty
      v-else
      icon="heroicons:document-minus"
      description="找不到文章"
      :actions="[{ label: '返回首页', onClick: goBack, color: 'primary', variant: 'solid' }]"
      class="py-20"
    />

    <template #right>
      <ArticleDetailSidebar v-if="article" :article="article" :headings="headings" :pending="pending" />
    </template>
  </UPage>
</template>

<script setup>
import ArticleDetailCoverImage from '~/features/article-detail/components/CoverImage.vue'
import ArticleDetailHeader from '~/features/article-detail/components/Header.vue'
import ArticleDetailContent from '~/features/article-detail/components/Content.vue'
import ArticleDetailSidebar from '~/features/article-detail/components/Sidebar.vue'
import { useArticleDetailPage } from '~/features/article-detail/composables/useArticleDetailPage'
import StateLoading from '~/shared/ui/StateLoading.vue'
import StateError from '~/shared/ui/StateError.vue'
import StateEmpty from '~/shared/ui/StateEmpty.vue'
import ContentPageBody from '~/shared/ui/ContentPageBody.vue'

// 详情页所有状态与行为由组合式函数集中编排，容器仅负责状态分发与组件拼装。
const {
  article,
  pending,
  error,
  headings,
  goBack,
  onTocReady
} = await useArticleDetailPage()
</script>

<style scoped>
.article-detail-page-layout {
  display: flex;
  flex-direction: column;
}

@media (min-width: 1024px) {
  .article-detail-page-layout {
    flex-direction: row;
    align-items: stretch;
  }
}
</style>

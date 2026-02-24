<template>
  <div class="min-h-screen flex">
    <div class="flex-1 bg-white dark:bg-gray-900 rounded-xl overflow-hidden lg:rounded-l-xl lg:rounded-r-none">
      <!-- 状态渲染优先级：loading -> error -> content -> empty -->
      <StateLoading v-if="pending">
        <div class="flex flex-col items-center justify-center min-h-[60vh]">
          <n-spin size="large" />
          <p class="mt-4 text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </StateLoading>

      <StateError v-else-if="error">
        <n-alert type="error" title="加载失败" class="max-w-4xl mx-auto my-8">
          加载文章失败: {{ error.message }}
        </n-alert>
      </StateError>

      <article v-else-if="article" class="relative">
        <ArticleDetailCoverImage :article="article" />

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <ArticleDetailHeader :article="article" @go-back="goBack" />
          <ArticleDetailContent :article="article" @toc-ready="onTocReady" @go-back="goBack" />
        </div>
      </article>

      <StateEmpty v-else>
        <n-empty description="找不到文章" class="py-20">
          <template #icon>
            <Icon name="file-earmark-x" size="3xl" />
          </template>
          <template #extra>
            <n-button @click="goBack">返回首页</n-button>
          </template>
        </n-empty>
      </StateEmpty>
    </div>

    <ArticleDetailSidebar :article="article" :headings="headings" :pending="pending" />
  </div>
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

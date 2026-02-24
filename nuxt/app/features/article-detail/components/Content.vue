<template>
  <div>
    <!-- 文章内容 - Markdown 渲染（优先使用 SSR 预解析的 AST）-->
    <div class="article-content">
      <MarkdownRenderer
        :markdown="article.contentMarkdown"
        :html="article.content"
        :precomputed-ast="article._mdcAst"
        :precomputed-toc="article._mdcToc"
        size="lg"
        @toc-ready="onTocReady"
      />
    </div>

    <!-- 从 HTML 标题中提取目录（作为备选方案仅用于 HTML 回退） -->
    <div v-if="!article.contentMarkdown" style="display: none;" ref="headingExtractor"></div>

        <!-- 分割线 -->
    <div class="h-px mt-20 bg-gray-500 dark:bg-gray-800 w-full mb-10"></div>

    <!-- 相关推荐 -->
    <RelatedArticles :exclude-id="article.id" :count="3" />

    <!-- 评论区 - 无缝衔接 -->
    <section class="mt-12 pt-8 border-t border-gray-500 dark:border-gray-700">
      <CommentSection :article-id="article.id" />
    </section>



    <!-- 底部返回按钮 -->
    <div class="mt-10 mb-4 text-center">
      <n-button @click="() => $emit('go-back')" type="info" size="large">
        <template #icon>
          <Icon name="arrow-left" size="md" />
        </template>
        返回上页
      </n-button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  article: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['toc-ready', 'go-back'])

// 从 MarkdownRenderer 接收 TOC 数据（来自 AST，更快）
function onTocReady(toc) {
  if (toc?.links?.length > 0) {
    const toHeadingLevel = (value, fallback) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
    }

    // 将 MDC 的 toc 格式转换为我们的格式（优先保留原始 depth/level）
    const convertLinks = (links, parentLevel = 1) => {
      const result = []
      for (const link of links) {
        const currentLevel = toHeadingLevel(link?.depth ?? link?.level, parentLevel + 1)
        result.push({
          id: link.id,
          text: link.text,
          level: currentLevel
        })
        if (link.children?.length > 0) {
          result.push(...convertLinks(link.children, currentLevel))
        }
      }
      return result
    }
    emit('toc-ready', convertLinks(toc.links))
  }
}

// 从渲染后的内容中提取标题 - 仅用于 HTML 回退模式
function extractHeadingsFromDOM() {
  nextTick(() => {
    const container = document.querySelector('.article-content')
    if (!container) return
    
    const elements = container.querySelectorAll('h1, h2, h3, h4, h5, h6')
    const extracted = []
    
    elements.forEach((el, index) => {
      const level = parseInt(el.tagName[1])
      const text = el.textContent?.trim() || ''
      const id = el.id || `heading-${index}`
      
      // 确保每个标题都有 ID
      if (!el.id) {
        el.id = id
      }
      
      extracted.push({ id, text, level })
    })
    
    if (extracted.length > 0) {
      emit('toc-ready', extracted)
    }
  })
}

onMounted(() => {
  // 仅当使用 HTML 回退时从 DOM 提取标题
  if (props.article && !props.article.contentMarkdown) {
    extractHeadingsFromDOM()
  }
})
</script>

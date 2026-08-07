<template>
  <header class="article-detail-header mb-7">
    <h1 class="mb-3 text-3xl font-bold leading-tight text-[color:var(--article-prose-heading)] md:text-4xl">
      {{ article.title }}
    </h1>
    
    <!-- 元信息 -->
    <div class="mb-5 flex flex-wrap items-center gap-3 text-sm text-[color:var(--article-prose-muted)]">
      <UBadge :color="getCategoryTagType(article.category)" variant="subtle" size="md">
        {{ getCategoryName(article.category) }}
      </UBadge>
      <span class="flex items-center gap-1">
        <Icon name="heroicons:calendar" size="sm" />
        {{ formatDate(article.createdAt) }}
      </span>
      <span v-if="article.updatedAt && article.updatedAt !== article.createdAt" class="flex items-center gap-1">
        <Icon name="heroicons:pencil-square" size="sm" />
        更新于 {{ formatDate(article.updatedAt) }}
      </span>
    </div>

    <!-- AI 摘要 -->
    <div v-if="article.aiSummary" class="bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg p-4 mb-6">
      <div class="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-semibold text-sm mb-2">
        <Icon name="mdi:robot" size="sm" />
        <span>AI 摘要</span>
      </div>
      <p class="text-gray-700 dark:text-gray-300 italic leading-relaxed">
        {{ displayedSummary }}<span class="animate-pulse text-sky-500">|</span>
      </p>
    </div>

    <!-- 返回按钮 -->
    <UButton color="success" variant="ghost" leading-icon="heroicons:arrow-left" @click="() => $emit('go-back')">
      返回
    </UButton>
  </header>
</template>

<script setup>
const props = defineProps({
  article: {
    type: Object,
    required: true
  }
})

defineEmits(['go-back'])

const displayedSummary = ref('')
let typingTimer = null

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getCategoryName(category) {
  const map = { study: '学习', game: '游戏', work: '作品', resource: '资源' }
  return map[category?.toLowerCase()] || '其他'
}

function getCategoryTagType(category) {
  const map = { study: 'info', game: 'warning', work: 'success', resource: 'primary' }
  return map[category?.toLowerCase()] || 'default'
}

function startTyping(text) {
  if (!text) return
  displayedSummary.value = ''
  let i = 0
  typingTimer = setInterval(() => {
    if (i < text.length) {
      displayedSummary.value += text[i]
      i++
    } else {
      clearInterval(typingTimer)
    }
  }, 30)
}

onMounted(() => {
  if (props.article?.aiSummary) {
    startTyping(props.article.aiSummary)
  }
})

onUnmounted(() => {
  if (typingTimer) {
    clearInterval(typingTimer)
  }
})
</script>

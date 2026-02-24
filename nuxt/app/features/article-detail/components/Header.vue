<template>
  <header class="mb-8">
    <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
      {{ article.title }}
    </h1>
    
    <!-- 元信息 -->
    <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-6">
      <n-tag :type="getCategoryTagType(article.category)" round size="small">
        {{ getCategoryName(article.category) }}
      </n-tag>
      <span class="flex items-center gap-1">
        <Icon name="calendar3" size="sm" />
        {{ formatDate(article.createdAt) }}
      </span>
      <span v-if="article.updatedAt && article.updatedAt !== article.createdAt" class="flex items-center gap-1">
        <Icon name="pencil-square" size="sm" />
        更新于 {{ formatDate(article.updatedAt) }}
      </span>
    </div>

    <!-- AI 摘要 -->
    <div v-if="article.aiSummary" class="bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg p-4 mb-6">
      <div class="flex items-center gap-2 text-sky-700 dark:text-sky-300 font-semibold text-sm mb-2">
        <Icon name="robot" size="sm" />
        <span>AI 摘要</span>
      </div>
      <p class="text-gray-700 dark:text-gray-300 italic leading-relaxed">
        {{ displayedSummary }}<span class="animate-pulse text-sky-500">|</span>
      </p>
    </div>

    <!-- 返回按钮 -->
    <n-button @click="() => $emit('go-back')" quaternary strong secondary type="success">
      <template #icon>
        <Icon name="arrow-left" size="sm" />
      </template>
      返回
    </n-button>
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

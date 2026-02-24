<template>
  <div class="github-card-mdc my-6">
    <div v-if="loading" class="loading-skeleton p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div class="skeleton-line w-3/4 h-6 mb-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div class="skeleton-line w-full h-4 mb-2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      <div class="skeleton-line w-5/6 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    </div>
    
    <div v-else-if="repoData" class="github-card p-4 bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden">
      <!-- 装饰性光晕效果 -->
      <div class="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-transparent to-transparent dark:from-sky-500/10 dark:via-transparent dark:to-transparent pointer-events-none"></div>
      
      <!-- 内容区域 -->
      <div class="relative z-10">
        <!-- 仓库名称和描述 -->
        <div class="repo-header mb-4">
          <a :href="repoData.html_url" target="_blank" rel="noopener" class="repo-name text-lg font-semibold text-blue-600 hover:text-blue-700 dark:text-sky-300 dark:hover:text-sky-200 transition-colors inline-flex items-center no-underline hover:underline">
            <Icon name="mdi:github" class="inline-block mr-2" />
            {{ repoData.full_name }}
          </a>
          <p v-if="repoData.description" class="repo-description mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {{ repoData.description }}
          </p>
        </div>
        
        <!-- 统计信息 -->
        <div class="repo-stats flex gap-4 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div class="stat-item flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Icon name="mdi:star-outline" class="w-4 h-4" />
            <span>{{ formatNumber(repoData.stargazers_count) }}</span>
          </div>
          <div class="stat-item flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Icon name="mdi:source-fork" class="w-4 h-4" />
            <span>{{ formatNumber(repoData.forks_count) }}</span>
          </div>
          <div v-if="repoData.open_issues_count" class="stat-item flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <Icon name="mdi:alert-circle-outline" class="w-4 h-4" />
            <span>{{ formatNumber(repoData.open_issues_count) }}</span>
          </div>
        </div>
        
        <!-- 底部信息 -->
        <div class="repo-footer flex items-center gap-4 flex-wrap text-xs text-gray-600 dark:text-gray-400">
          <div v-if="repoData.language" class="language flex items-center gap-2">
            <span class="language-dot w-3 h-3 rounded-full" :style="{ backgroundColor: getLanguageColor(repoData.language) }"></span>
            {{ repoData.language }}
          </div>
          <div v-if="repoData.license" class="license flex items-center">
            <Icon name="mdi:scale-balance" class="inline-block mr-1" />
            {{ repoData.license.spdx_id }}
          </div>
          <div class="updated">
            更新于 {{ formatDate(repoData.updated_at) }}
          </div>
        </div>
      </div>
    </div>
    
    <div v-else-if="error" class="error-message p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400">
      <Icon name="mdi:alert-circle" class="inline-block mr-2" />
      {{ error }}
    </div>
  </div>
</template>

<script setup>
/**
 * GithubCard GitHub 仓库卡片组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::github-card{repo="vuejs/core"}
 * ::
 * 
 * ::github-card{repo="nuxt/nuxt"}
 * ::
 */

const props = defineProps({
  // GitHub 仓库，格式: owner/repo
  repo: {
    type: String,
    required: true
  }
})

const repoData = ref(null)
const loading = ref(true)
const error = ref(null)

// 语言颜色映射（GitHub 官方配色）
const languageColors = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
}

const getLanguageColor = (language) => {
  return languageColors[language] || '#8b949e'
}

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 30) return `${diffDays} 天前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`
  return `${Math.floor(diffDays / 365)} 年前`
}

// 获取仓库数据
const fetchRepoData = async () => {
  if (!props.repo) {
    error.value = '请提供仓库名称'
    loading.value = false
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    const response = await fetch(`https://api.github.com/repos/${props.repo}`)
    
    if (!response.ok) {
      throw new Error(`GitHub API 错误: ${response.status}`)
    }
    
    repoData.value = await response.json()
  } catch (e) {
    error.value = `加载失败: ${e.message}`
    console.error('GitHub Card Error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRepoData()
})

watch(() => props.repo, () => {
  fetchRepoData()
})
</script>

<style scoped>
.github-card-mdc {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
}

/* 保留装饰性光晕在暗色模式下的增强效果 */
.dark .github-card:hover {
  border-color: rgba(56, 189, 248, 0.3);
}

/* 暗色模式下仓库名称的文字发光效果 */
.dark .repo-name {
  text-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
}

/* 暗色模式下语言点的外光晕 */
.dark .language-dot {
  border: 1px solid rgba(148, 163, 184, 0.3);
}
</style>

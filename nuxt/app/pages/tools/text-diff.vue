<template>
  <div class="text-diff-page">
    <div class="page-header">
      <n-breadcrumb>
        <n-breadcrumb-item @click="navigateTo('/')">首页</n-breadcrumb-item>
        <n-breadcrumb-item @click="navigateTo('/tools')">工具箱</n-breadcrumb-item>
        <n-breadcrumb-item>文本对比</n-breadcrumb-item>
      </n-breadcrumb>

      <h1 class="page-title">
        <Icon name="document-duplicate" size="lg" class="me-2" />
        文本差异对比
      </h1>
      <p class="page-description">对比两段文本的差异，高亮显示增删改</p>
    </div>

    <div class="diff-container">
      <!-- 输入区域 -->
      <div class="input-section">
        <div class="input-column">
          <div class="input-header">
            <h3>原始文本</h3>
            <n-button size="tiny" quaternary @click="originalText = ''">清空</n-button>
          </div>
          <n-input
            v-model:value="originalText"
            type="textarea"
            placeholder="粘贴或输入原始文本..."
            :rows="10"
            class="text-input"
          />
        </div>

        <div class="input-column">
          <div class="input-header">
            <h3>修改后文本</h3>
            <n-button size="tiny" quaternary @click="modifiedText = ''">清空</n-button>
          </div>
          <n-input
            v-model:value="modifiedText"
            type="textarea"
            placeholder="粘贴或输入修改后的文本..."
            :rows="10"
            class="text-input"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <n-button type="primary" @click="compareDiff" :disabled="!originalText && !modifiedText">
          <Icon name="arrow-right" size="sm" class="me-1" />
          对比差异
        </n-button>
        <n-button @click="swapTexts">
          <Icon name="switch-horizontal" size="sm" class="me-1" />
          交换文本
        </n-button>
        <n-button @click="clearAll">清空全部</n-button>
        
        <div class="view-options">
          <n-radio-group v-model:value="viewMode" size="small">
            <n-radio-button value="inline">行内视图</n-radio-button>
            <n-radio-button value="sideBySide">并排视图</n-radio-button>
          </n-radio-group>
        </div>
      </div>

      <!-- 差异结果 -->
      <div v-if="diffResult.length" class="diff-result">
        <div class="result-header">
          <h3>差异结果</h3>
          <div class="stats">
            <n-tag type="success" size="small">+{{ stats.additions }} 添加</n-tag>
            <n-tag type="error" size="small">-{{ stats.deletions }} 删除</n-tag>
            <n-tag type="info" size="small">{{ stats.unchanged }} 未变</n-tag>
          </div>
        </div>

        <!-- 行内视图 -->
        <div v-if="viewMode === 'inline'" class="inline-view">
          <div 
            v-for="(line, index) in diffResult" 
            :key="index"
            :class="['diff-line', getDiffClass(line.type)]"
          >
            <span class="line-number">{{ line.lineNumber }}</span>
            <span class="line-prefix">{{ getPrefix(line.type) }}</span>
            <span class="line-content" v-html="line.content"></span>
          </div>
        </div>

        <!-- 并排视图 -->
        <div v-else class="side-by-side-view">
          <div class="side-column original-side">
            <div class="side-header">原始</div>
            <div 
              v-for="(line, index) in leftLines" 
              :key="'left-' + index"
              :class="['diff-line', getDiffClass(line.type)]"
            >
              <span class="line-number">{{ line.lineNumber }}</span>
              <span class="line-content">{{ line.content }}</span>
            </div>
          </div>
          <div class="side-column modified-side">
            <div class="side-header">修改后</div>
            <div 
              v-for="(line, index) in rightLines" 
              :key="'right-' + index"
              :class="['diff-line', getDiffClass(line.type)]"
            >
              <span class="line-number">{{ line.lineNumber }}</span>
              <span class="line-content">{{ line.content }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="hasCompared" class="empty-result">
        <Icon name="check-circle" size="xl" class="empty-icon" />
        <p>两段文本完全相同，没有差异</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  ssr: false
})

import { ref, computed } from 'vue'

// 输入文本
const originalText = ref('')
const modifiedText = ref('')

// 视图模式
const viewMode = ref('inline')

// 差异结果
const diffResult = ref([])
const hasCompared = ref(false)

// 统计
const stats = computed(() => {
  let additions = 0
  let deletions = 0
  let unchanged = 0
  
  diffResult.value.forEach(line => {
    if (line.type === 'add') additions++
    else if (line.type === 'remove') deletions++
    else unchanged++
  })
  
  return { additions, deletions, unchanged }
})

// 左侧行（并排视图）
const leftLines = computed(() => {
  return diffResult.value.filter(line => line.type !== 'add').map((line, idx) => ({
    ...line,
    lineNumber: idx + 1
  }))
})

// 右侧行（并排视图）
const rightLines = computed(() => {
  return diffResult.value.filter(line => line.type !== 'remove').map((line, idx) => ({
    ...line,
    lineNumber: idx + 1
  }))
})

// 简单的 LCS 差异算法
const computeDiff = (text1, text2) => {
  const lines1 = text1.split('\n')
  const lines2 = text2.split('\n')
  
  // 构建 LCS 表
  const m = lines1.length
  const n = lines2.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // 回溯生成差异
  const result = []
  let i = m, j = n
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      result.unshift({ type: 'unchanged', content: lines1[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'add', content: lines2[j - 1] })
      j--
    } else if (i > 0) {
      result.unshift({ type: 'remove', content: lines1[i - 1] })
      i--
    }
  }
  
  // 添加行号
  let lineNum = 1
  return result.map(item => ({
    ...item,
    lineNumber: lineNum++,
    content: escapeHtml(item.content)
  }))
}

// 转义 HTML
const escapeHtml = (text) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// 执行对比
const compareDiff = () => {
  hasCompared.value = true
  diffResult.value = computeDiff(originalText.value, modifiedText.value)
}

// 交换文本
const swapTexts = () => {
  const temp = originalText.value
  originalText.value = modifiedText.value
  modifiedText.value = temp
  if (hasCompared.value) {
    compareDiff()
  }
}

// 清空全部
const clearAll = () => {
  originalText.value = ''
  modifiedText.value = ''
  diffResult.value = []
  hasCompared.value = false
}

// 获取差异类名
const getDiffClass = (type) => {
  return {
    'diff-add': type === 'add',
    'diff-remove': type === 'remove',
    'diff-unchanged': type === 'unchanged'
  }
}

// 获取前缀符号
const getPrefix = (type) => {
  if (type === 'add') return '+'
  if (type === 'remove') return '-'
  return ' '
}

// SEO
useHead({
  title: '文本差异对比 - 工具箱',
  meta: [
    { name: 'description', content: '在线文本差异对比工具，高亮显示两段文本的增删改差异' },
    { name: 'keywords', content: '文本对比,差异对比,Diff,文本比较,在线工具' }
  ]
})
</script>

<style scoped>
.text-diff-page {
  padding: 2rem 0;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 1rem 0 0.5rem;
  display: flex;
  align-items: center;
}

.page-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.diff-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.input-column {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.input-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.view-options {
  margin-left: auto;
}

.diff-result {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.result-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.stats {
  display: flex;
  gap: 0.5rem;
}

.inline-view {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.diff-line {
  display: flex;
  padding: 0.25rem 0.5rem;
  border-bottom: 1px solid var(--border-color);
}

.diff-line:last-child {
  border-bottom: none;
}

.line-number {
  min-width: 40px;
  color: var(--text-secondary);
  text-align: right;
  padding-right: 0.75rem;
  user-select: none;
}

.line-prefix {
  min-width: 1.5rem;
  font-weight: bold;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-add {
  background-color: rgba(46, 204, 113, 0.15);
}

.diff-add .line-prefix {
  color: #27ae60;
}

.diff-remove {
  background-color: rgba(231, 76, 60, 0.15);
}

.diff-remove .line-prefix {
  color: #e74c3c;
}

.diff-unchanged {
  background-color: transparent;
}

.side-by-side-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.side-column {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.side-header {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.empty-result {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-icon {
  color: #27ae60;
  margin-bottom: 1rem;
}

.empty-result p {
  font-size: 1.1rem;
  margin: 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .input-section {
    grid-template-columns: 1fr;
  }
  
  .side-by-side-view {
    grid-template-columns: 1fr;
  }
  
  .view-options {
    margin-left: 0;
    width: 100%;
  }
  
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

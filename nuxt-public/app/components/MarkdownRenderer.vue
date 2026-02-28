<template>
  <div class="markdown-renderer" ref="containerRef">
    <!-- 骨架屏加载状态 -->
    <div v-if="loading" class="animate-pulse space-y-4">
      <!-- 模拟标题 -->
      <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
      <!-- 模拟段落 -->
      <div class="space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
      </div>
      <!-- 模拟代码块 -->
      <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <!-- 模拟段落 -->
      <div class="space-y-2">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
      <!-- 模拟小标题 -->
      <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 mt-6"></div>
      <!-- 模拟列表 -->
      <div class="space-y-2 pl-4">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/5"></div>
      </div>
    </div>

    <!-- 渲染错误 -->
    <n-alert v-else-if="error" type="error" title="渲染失败" class="my-4">
      {{ error }}
    </n-alert>

    <!-- MDC 渲染结果 -->
    <article
      v-else-if="ast"
      :class="proseClasses"
    >
      <MDCRenderer
        :body="ast.body"
        :data="ast.data"
      />
    </article>

    <!-- 回退：直接渲染 HTML（兼容旧数据） -->
    <article
      v-else-if="htmlContent"
      :class="proseClasses"
      v-html="htmlContent"
    />

    <!-- 无内容 -->
    <n-empty v-else description="暂无内容" />
  </div>
</template>

<script setup>
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import mdcHighlighter from '#mdc-highlighter'

// Worker 预处理已移除,使用内联 fallback
const preprocessMarkdown = async (md) => null

const props = defineProps({
  markdown: {
    type: String,
    default: ''
  },
  html: {
    type: String,
    default: ''
  },
  // 🆕 接受服务端预解析的 AST（跳过客户端解析）
  precomputedAst: {
    type: Object,
    default: null
  },
  // 🆕 接受服务端预解析的 TOC
  precomputedToc: {
    type: Object,
    default: null
  },
  size: {
    type: String,
    default: 'lg',
    validator: (value) => ['sm', 'base', 'lg', 'xl', '2xl'].includes(value)
  },
  customClass: {
    type: String,
    default: ''
  }
})

// 暴露 TOC 供父组件使用
const emit = defineEmits(['toc-ready'])

const ast = ref(null)
const loading = ref(false)
const error = ref(null)
const containerRef = ref(null)

const markdownParseOptions = {
  highlight: {
    theme: {
      default: 'material-theme-darker',
      dark: 'one-dark-pro'
    },
    highlighter: mdcHighlighter
  }
}

let katexStylesReady = false
let katexStylesPromise = null

// Mermaid 实例缓存
let mermaidInstance = null
let mermaidLoading = false

const htmlContent = computed(() => {
  if (!props.markdown && props.html) {
    return props.html
  }
  return null
})

const proseClasses = computed(() => {
  return [
    'prose',
    `prose-${props.size}`,
    'prose-pink',
    'max-w-none',
    'dark:prose-invert',
    props.customClass
  ].filter(Boolean).join(' ')
})

function hasMathSyntax(markdown) {
  if (!markdown || typeof markdown !== 'string') return false
  if (markdown.includes('$$')) return true
  if (markdown.includes('\\(') || markdown.includes('\\[')) return true
  return /(^|[^\\])\$[^$\n]+\$/m.test(markdown)
}

async function ensureKatexStylesIfNeeded() {
  if (!process.client || katexStylesReady) return
  if (!hasMathSyntax(props.markdown)) return

  if (!katexStylesPromise) {
    katexStylesPromise = import('katex/dist/katex.min.css')
      .then(() => {
        katexStylesReady = true
      })
      .catch((e) => {
        console.warn('[KaTeX] 样式加载失败:', e)
      })
  }

  await katexStylesPromise
}

// 预加载 Mermaid 库（检测到 mermaid 代码块时提前加载）
async function preloadMermaid() {
  if (mermaidInstance || mermaidLoading || !process.client) return
  
  // 检查 markdown 中是否包含 mermaid
  if (props.markdown?.includes('```mermaid')) {
    mermaidLoading = true
    try {
      mermaidInstance = (await import('mermaid')).default
    } catch (e) {
      console.error('Mermaid 预加载失败:', e)
    }
    mermaidLoading = false
  }
}

function getThemeVar(name, fallbackName = '') {
  if (!process.client) return ''
  const style = getComputedStyle(document.documentElement)
  const value = style.getPropertyValue(name).trim()
  if (value) return value
  return fallbackName ? style.getPropertyValue(fallbackName).trim() : ''
}

function buildMermaidThemeVariables() {
  return {
    primaryColor: getThemeVar('--bg-tertiary', '--bg-secondary'),
    primaryTextColor: getThemeVar('--text-primary'),
    primaryBorderColor: getThemeVar('--accent-primary'),
    lineColor: getThemeVar('--text-muted', '--text-secondary'),
    secondaryColor: getThemeVar('--bg-secondary'),
    tertiaryColor: getThemeVar('--bg-tertiary', '--bg-secondary'),
    background: getThemeVar('--bg-primary'),
    mainBkg: getThemeVar('--card-bg', '--bg-secondary'),
    secondBkg: getThemeVar('--bg-secondary'),
    nodeBorder: getThemeVar('--accent-primary'),
    clusterBkg: getThemeVar('--bg-secondary'),
    clusterBorder: getThemeVar('--border-color-dark', '--border-color'),
    titleColor: getThemeVar('--text-primary'),
    edgeLabelBackground: getThemeVar('--bg-primary'),
    textColor: getThemeVar('--text-secondary', '--text-primary'),
    nodeTextColor: getThemeVar('--text-primary'),
    actorTextColor: getThemeVar('--text-primary'),
    actorBkg: getThemeVar('--bg-tertiary', '--bg-secondary'),
    actorBorder: getThemeVar('--accent-primary'),
    actorLineColor: getThemeVar('--text-muted', '--text-secondary'),
    signalColor: getThemeVar('--text-muted', '--text-secondary'),
    signalTextColor: getThemeVar('--text-secondary', '--text-primary'),
    labelBoxBkgColor: getThemeVar('--bg-secondary'),
    labelBoxBorderColor: getThemeVar('--border-color-dark', '--border-color'),
    labelTextColor: getThemeVar('--text-secondary', '--text-primary'),
    loopTextColor: getThemeVar('--text-secondary', '--text-primary'),
    noteBkgColor: getThemeVar('--bg-hover', '--bg-secondary'),
    noteBorderColor: getThemeVar('--accent-warning', '--accent-primary'),
    noteTextColor: getThemeVar('--text-primary'),
    activationBkgColor: getThemeVar('--bg-tertiary', '--bg-secondary'),
    activationBorderColor: getThemeVar('--accent-primary'),
    sequenceNumberColor: getThemeVar('--text-primary')
  }
}

// 渲染 Mermaid 图表，返回找到的图表数量
async function renderMermaidDiagrams() {
  if (!process.client || !containerRef.value) return 0
  
  // 获取所有 pre 元素，检查其内容是否是 mermaid 图表
  const allPreElements = containerRef.value.querySelectorAll('pre')
  const mermaidBlocks = []
  
  // Mermaid 图表类型的正则（必须在开头）
  const mermaidPattern = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment|sankey-beta|xychart-beta|block-beta)\b/i
  
  allPreElements.forEach(pre => {
    // 跳过已渲染的
    if (pre.dataset.mermaidRendered === 'true') return
    
    // 获取代码内容
    const codeEl = pre.querySelector('code')
    const textContent = (codeEl?.textContent || pre.textContent || '').trim()
    
    // 检查是否是 mermaid 语法
    if (mermaidPattern.test(textContent)) {
      mermaidBlocks.push({ pre, code: textContent })
    }
  })
  
  console.log('[Mermaid] 找到的图表数量:', mermaidBlocks.length)
  if (mermaidBlocks.length === 0) return 0
  
  try {
    // 使用缓存的实例或动态导入
    const mermaid = mermaidInstance || (await import('mermaid')).default
    mermaidInstance = mermaid
    
    // 初始化 mermaid - 使用主题 token 构建颜色，随主题实时切换
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      themeVariables: buildMermaidThemeVariables(),
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        useMaxWidth: true,
        wrap: true,
        mirrorActors: false
      },
      gantt: {
        useMaxWidth: true
      }
    })
    
    // 渲染每个 mermaid 代码块
    for (let i = 0; i < mermaidBlocks.length; i++) {
      const { pre: preElement, code } = mermaidBlocks[i]
      if (!preElement || !code) continue
      
      console.log('[Mermaid] 渲染图表 #' + i + ':', code.substring(0, 50) + '...')
      
      try {
        const diagramId = `mermaid-diagram-${Date.now()}-${i}`
        const { svg } = await mermaid.render(diagramId, code)
        
        // 创建容器替换原来的 pre 元素
        const container = document.createElement('div')
        container.className = 'mermaid-diagram my-6 flex justify-center overflow-x-auto p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'
        container.innerHTML = svg
        
        preElement.replaceWith(container)
      } catch (err) {
        console.error('Mermaid 渲染失败:', err)
        // 标记为已处理（避免重复尝试）
        preElement.dataset.mermaidRendered = 'true'
        // 显示错误信息
        const errorContainer = document.createElement('div')
        errorContainer.className = 'mermaid-error my-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl'
        errorContainer.innerHTML = `
          <p class="text-red-600 dark:text-red-400 text-sm mb-2">Mermaid 图表渲染失败: ${err.message}</p>
          <details class="text-xs">
            <summary class="text-gray-500 cursor-pointer">查看源码</summary>
            <pre class="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">${code}</pre>
          </details>
        `
        preElement.replaceWith(errorContainer)
      }
    }
    return mermaidBlocks.length
  } catch (err) {
    console.error('加载 Mermaid 库失败:', err)
    return 0
  }
}

const parseContent = async () => {
  if (!props.markdown) {
    ast.value = null
    return
  }

  loading.value = true
  error.value = null

  try {
    await ensureKatexStylesIfNeeded()

    // 🔥 并行执行：Worker 预处理 + 主线程 Markdown 解析
    // Worker 线程：TOC 提取、Mermaid 检测、文本统计（不阻塞主线程）
    // 主线程：parseMarkdown AST 生成（必须在主线程）
    const [preprocessed, result] = await Promise.all([
      preprocessMarkdown(props.markdown).catch(() => null),
      parseMarkdown(props.markdown, markdownParseOptions)
    ])

    ast.value = result

    // Worker 预处理的 TOC 通常比 parseMarkdown 更快就绪
    // 优先使用 parseMarkdown 的 TOC（更准确），降级到 Worker 版本
    if (result.toc) {
      emit('toc-ready', result.toc)
    } else if (preprocessed?.toc) {
      // Worker 提取的快速 TOC 作为后备
      emit('toc-ready', { links: preprocessed.toc })
    }

    // 使用 Worker 的 Mermaid 检测结果决定是否需要渲染
    const hasMermaid = preprocessed?.codeBlocks?.hasMermaid
      ?? props.markdown?.includes('```mermaid')

    if (hasMermaid) {
      // 使用 requestIdleCallback 延迟渲染 Mermaid，避免阻塞主线程
      scheduleIdleTask(() => tryRenderMermaid())
    }
  } catch (e) {
    console.error('Markdown 解析失败:', e)
    error.value = e.message || '内容解析失败'
    ast.value = null
  } finally {
    loading.value = false
  }
}

/**
 * 使用 requestIdleCallback 调度空闲任务
 * 降级到 setTimeout（兼容 Safari）
 */
function scheduleIdleTask(callback, timeout = 2000) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(callback, { timeout })
  } else {
    setTimeout(callback, 16)
  }
}

// Mermaid 渲染重试机制（使用 requestIdleCallback 优化）
let mermaidRetryCount = 0
const MAX_MERMAID_RETRIES = 3
const MERMAID_RETRY_DELAY = 300

async function tryRenderMermaid() {
  // 检查是否有 mermaid 内容需要渲染
  if (!props.markdown?.includes('```mermaid')) return
  
  const result = await renderMermaidDiagrams()
  
  // 如果没找到图表且还有重试次数，使用 requestIdleCallback 延迟重试
  if (result === 0 && mermaidRetryCount < MAX_MERMAID_RETRIES) {
    mermaidRetryCount++
    console.log(`[Mermaid] 未找到图表，空闲时重试 (${mermaidRetryCount}/${MAX_MERMAID_RETRIES})`)
    scheduleIdleTask(tryRenderMermaid, MERMAID_RETRY_DELAY)
  } else {
    mermaidRetryCount = 0 // 重置计数
  }
}

// 监听主题变化重新渲染 Mermaid
let themeObserver = null

// 监听 markdown 或预解析 AST 变化
watch(() => [props.markdown, props.precomputedAst], () => {
  mermaidRetryCount = 0 // 重置重试计数
  
  // 如果有预解析的 AST，直接使用
  if (props.precomputedAst) {
    void ensureKatexStylesIfNeeded()
    ast.value = props.precomputedAst
    if (props.precomputedToc) {
      emit('toc-ready', props.precomputedToc)
    } else if (props.precomputedAst.toc) {
      emit('toc-ready', props.precomputedAst.toc)
    }
    nextTick(() => scheduleIdleTask(() => tryRenderMermaid()))
    return
  }
  
  // 否则客户端解析
  parseContent()
}, { immediate: false })

onMounted(() => {
  void ensureKatexStylesIfNeeded()

  // 🔥 优先使用服务端预解析的 AST（跳过客户端解析，大幅提升性能）
  if (props.precomputedAst) {
    console.log('[MDC] 使用服务端预解析的 AST，跳过客户端解析')
    ast.value = props.precomputedAst
    
    // 发送 TOC 数据
    if (props.precomputedToc) {
      emit('toc-ready', props.precomputedToc)
    } else if (props.precomputedAst.toc) {
      emit('toc-ready', props.precomputedAst.toc)
    }
    
    // 使用 requestIdleCallback 延迟渲染 Mermaid（不阻塞首屏）
    nextTick(() => {
      scheduleIdleTask(() => tryRenderMermaid())
    })
    return
  }
  
  // 回退：客户端解析（兼容旧数据或 SSR 解析失败的情况）
  if (props.markdown && !ast.value) {
    console.log('[MDC] 客户端回退解析 Markdown')
    parseContent()
  }
  
  // 监听主题变化
  if (process.client) {
    themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // 主题变化时重新渲染 mermaid
          nextTick(() => {
            setTimeout(renderMermaidDiagrams, 100)
          })
        }
      })
    })
    
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  }
})

onUnmounted(() => {
  if (themeObserver) {
    themeObserver.disconnect()
  }
})
</script>

<style scoped>
.markdown-renderer {
  width: 100%;
}
</style>

<style>
/* MDC 组件统一块级显示，避免行内拼接 */
.markdown-renderer .prose .alert-mdc,
.markdown-renderer .prose .tabs-mdc,
.markdown-renderer .prose .collapse-mdc,
.markdown-renderer .prose .code-playground-mdc,
.markdown-renderer .prose .link-card-wrapper,
.markdown-renderer .prose .image-comparison-mdc,
.markdown-renderer .prose .web-embed-mdc,
.markdown-renderer .prose .star-rating-mdc,
.markdown-renderer .prose .steps-mdc,
.markdown-renderer .prose .github-card-mdc,
.markdown-renderer .prose .image-enhanced-mdc,
.markdown-renderer .prose .related-articles-mdc {
  display: block;
}

/* Mermaid 图表样式 */
.mermaid-diagram svg {
  max-width: 100%;
  height: auto;
}

/* 暗色模式下的 Mermaid 样式增强 */
.dark .mermaid-diagram text {
  fill: var(--text-secondary) !important;
}

.dark .mermaid-diagram .nodeLabel,
.dark .mermaid-diagram .label {
  color: var(--text-primary) !important;
  fill: var(--text-primary) !important;
}

.dark .mermaid-diagram .edgeLabel {
  color: var(--text-secondary) !important;
  background-color: var(--bg-secondary) !important;
}

.dark .mermaid-diagram .edgePath .path {
  stroke: var(--text-muted) !important;
}

.dark .mermaid-diagram .arrowheadPath {
  fill: var(--text-muted) !important;
}

.dark .mermaid-diagram .node rect,
.dark .mermaid-diagram .node circle,
.dark .mermaid-diagram .node polygon {
  stroke: var(--accent-primary) !important;
}

.dark .mermaid-diagram .cluster rect {
  fill: var(--bg-tertiary) !important;
  stroke: var(--border-color-dark) !important;
}

.dark .mermaid-diagram .actor {
  fill: var(--bg-tertiary) !important;
  stroke: var(--accent-primary) !important;
}

.dark .mermaid-diagram .actor-line {
  stroke: var(--text-muted) !important;
}

.dark .mermaid-diagram .messageLine0,
.dark .mermaid-diagram .messageLine1 {
  stroke: var(--text-muted) !important;
}

.dark .mermaid-diagram .messageText {
  fill: var(--text-secondary) !important;
}

.dark .mermaid-diagram .loopText,
.dark .mermaid-diagram .loopText > tspan {
  fill: var(--text-secondary) !important;
}

.dark .mermaid-diagram .loopLine {
  stroke: var(--border-color-dark) !important;
}

.dark .mermaid-diagram .labelBox {
  fill: var(--bg-secondary) !important;
  stroke: var(--border-color-dark) !important;
}

.dark .mermaid-diagram .note {
  fill: var(--bg-secondary) !important;
  stroke: var(--accent-primary) !important;
}

.dark .mermaid-diagram .noteText {
  fill: var(--text-secondary) !important;
}

.dark .mermaid-diagram .activation0,
.dark .mermaid-diagram .activation1,
.dark .mermaid-diagram .activation2 {
  fill: var(--bg-tertiary) !important;
  stroke: var(--accent-primary) !important;
}

.dark .mermaid-diagram .sequenceNumber {
  fill: var(--text-primary) !important;
}
</style>

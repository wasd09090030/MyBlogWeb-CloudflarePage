<template>
  <div v-if="tocItems.length > 0" class="h-full flex flex-col">
    <!-- 头部 -->
    <div 
      class="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      @click="toggleCollapse"
    >
      <h6 class="flex items-center gap-2 text-sm font-semibold m-0 text-gray-800 dark:text-gray-100">
        <Icon name="list-ul" size="sm" class="text-pink-500 dark:text-pink-400" />
        文章目录
      </h6>
      <Icon 
        :name="isCollapsed ? 'chevron-down' : 'chevron-up'" 
        size="sm"
        class="text-gray-500 dark:text-gray-400 transition-transform duration-200"
      />
    </div>

    <!-- 目录内容 -->
    <div 
      class="flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out"
      :class="isCollapsed ? 'max-h-0' : 'max-h-full'"
    >
      <!-- 目录列表 -->
      <nav class="flex-1 py-3 overflow-y-auto custom-scrollbar">
        <ul class="space-y-0.5 px-2">
          <li 
            v-for="heading in tocItems" 
            :key="heading.id"
            :class="getTocItemClass(heading)"
            :style="getTocItemStyle(heading)"
          >
            <n-tooltip placement="left" :delay="300" :disabled="!isTextTruncated(heading.id)">
              <template #trigger>
                <a 
                  :ref="el => setItemRef(heading.id, el)"
                  :href="`#${heading.id}`"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                  :class="[
                    getTocTextClass(heading),
                    activeHeading === heading.id 
                      ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 font-medium shadow-sm dark:shadow-pink-500/10' 
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-pink-600 dark:hover:text-pink-400'
                  ]"
                  @click.prevent="scrollToHeading(heading.id)"
                >
                  <span 
                    class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all duration-200"
                    :class="activeHeading === heading.id ? 'bg-pink-500 dark:bg-pink-400 scale-125' : 'bg-gray-400 dark:bg-gray-500'"
                  />
                  <span class="truncate">{{ heading.text }}</span>
                </a>
              </template>
              {{ heading.text }}
            </n-tooltip>
          </li>
        </ul>
      </nav>

      <!-- 阅读进度 -->
      <div class="px-3 py-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30">
        <div class="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-2">
          <span class="flex items-center gap-1">
            <Icon name="book" size="sm" class="text-gray-500 dark:text-gray-400" />
            阅读进度
          </span>
          <span class="font-semibold text-pink-600 dark:text-pink-400">{{ Math.round(progress) }}%</span>
        </div>
        <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
          <div 
            class="h-full bg-gradient-to-r from-pink-500 to-rose-500 dark:from-pink-400 dark:to-rose-400 rounded-full transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  headings: {
    type: Array,
    default: () => []
  }
})

const isCollapsed = ref(false)
const activeHeading = ref('')
const progress = ref(0)
const itemRefs = ref({})
let highlightedId = ref(null)

const normalizedHeadings = computed(() => {
  return (props.headings || [])
    .map((heading) => ({
      id: heading?.id,
      text: heading?.text,
      level: Number(heading?.level) || 2
    }))
    .filter((heading) => Boolean(heading.id && heading.text))
})

const tocItems = computed(() => {
  const roots = []
  const stack = []

  for (const heading of normalizedHeadings.value) {
    const node = {
      ...heading,
      depth: 0,
      children: []
    }

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop()
    }

    node.depth = stack.length

    if (stack.length === 0) {
      roots.push(node)
    } else {
      stack[stack.length - 1].children.push(node)
    }

    stack.push(node)
  }

  const flattened = []
  const walk = (nodes) => {
    for (const node of nodes) {
      flattened.push({
        id: node.id,
        text: node.text,
        level: node.level,
        depth: node.depth
      })
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }

  walk(roots)
  return flattened
})

// 设置目录项引用
function setItemRef(id, el) {
  if (el) {
    itemRefs.value[id] = el
  }
}

// 检测文本是否被截断
function isTextTruncated(id) {
  const el = itemRefs.value[id]
  if (!el) return false
  const textSpan = el.querySelector('.truncate')
  if (!textSpan) return false
  return textSpan.scrollWidth > textSpan.clientWidth
}

// 切换折叠
function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

// 获取目录项缩进类
function getTocItemClass(heading) {
  const depth = heading?.depth || 0
  return depth > 0
    ? 'toc-item-child border-l border-gray-200 dark:border-gray-700'
    : 'toc-item-root'
}

function getHeadingDepth(heading) {
  return Math.min(Math.max(heading?.depth || 0, 0), 5)
}

function getTocItemStyle(heading) {
  const depth = getHeadingDepth(heading)
  return {
    paddingLeft: `${depth * 20}px`
  }
}

function getTocTextClass(heading) {
  const depth = getHeadingDepth(heading)
  if (depth === 0) return 'text-sm font-semibold'
  if (depth === 1) return 'text-sm font-medium'
  return 'text-[13px]'
}

// 滚动到指定标题
function scrollToHeading(id) {
  if (!process.client || typeof document === 'undefined') return

  const element = document.getElementById(id)
  if (!element) return
  
  const navbarHeight = 80
  const top = element.offsetTop - navbarHeight
  
  window.scrollTo({
    top,
    behavior: 'smooth'
  })
  
  // 延迟确保滚动完成后再显示高亮
  if (highlightTimer) {
    clearTimeout(highlightTimer)
    highlightTimer = null
  }
  if (clearHighlightTimer) {
    clearTimeout(clearHighlightTimer)
    clearHighlightTimer = null
  }

  highlightTimer = window.setTimeout(() => {
    // 移除之前的高亮
    const prevHighlighted = document.querySelector('.heading-highlight')
    if (prevHighlighted) {
      prevHighlighted.classList.remove('heading-highlight')
    }
    
    // 添加新的高亮
    element.classList.add('heading-highlight')
    highlightedId.value = id
    
    // 3秒后移除高亮
    clearHighlightTimer = window.setTimeout(() => {
      element.classList.remove('heading-highlight')
      highlightedId.value = null
    }, 3000)
  }, 200)
}

// 监听滚动更新进度和活动标题
function handleScroll() {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  const windowHeight = window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  
  // 计算进度
  const maxScroll = documentHeight - windowHeight
  progress.value = maxScroll > 0 ? Math.min((scrollTop / maxScroll) * 100, 100) : 0
}

// 使用 IntersectionObserver 检测活动标题
let observer = null
let observerRetryCount = 0
const MAX_RETRY = 5
let observerSetupTimer = null
let highlightTimer = null
let clearHighlightTimer = null

function setupObserver() {
  if (!process.client || typeof document === 'undefined') {
    return
  }

  if (observer) observer.disconnect()
  
  // 检查是否有标题需要观察
  if (!tocItems.value || tocItems.value.length === 0) {
    return
  }
  
  // 检查 DOM 元素是否已经渲染
  const firstHeading = document.getElementById(tocItems.value[0].id)
  if (!firstHeading && observerRetryCount < MAX_RETRY) {
    // 如果第一个标题元素还不存在，延迟重试
    observerRetryCount++
    observerSetupTimer = window.setTimeout(() => {
      setupObserver()
    }, 200)
    return
  }
  
  // 重置重试计数
  observerRetryCount = 0
  
  observer = new IntersectionObserver(
    (entries) => {
      // 找出所有在视口中的标题，选择最接近顶部的那个
      const visibleEntries = entries.filter(entry => entry.isIntersecting)
      if (visibleEntries.length > 0) {
        // 按照在视口中的位置排序，选择最接近顶部的
        const topEntry = visibleEntries.reduce((top, current) => 
          current.boundingClientRect.top < top.boundingClientRect.top ? current : top
        )
        activeHeading.value = topEntry.target.id
      }
    },
    {
      rootMargin: '-80px 0px -50% 0px',
      threshold: [0, 0.5, 1]
    }
  )
  
  // 观察所有标题元素
  let observedCount = 0
  tocItems.value.forEach(heading => {
    const el = document.getElementById(heading.id)
    if (el) {
      observer.observe(el)
      observedCount++
    }
  })
  
  // 如果成功观察到元素，设置初始活动标题
  if (observedCount > 0 && !activeHeading.value) {
    // 找到当前可见区域的第一个标题
    nextTick(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const navbarHeight = 80
      
      for (const heading of tocItems.value) {
        const el = document.getElementById(heading.id)
        if (el && el.offsetTop - navbarHeight <= scrollTop + 100) {
          activeHeading.value = heading.id
        } else {
          break
        }
      }
      
      // 如果没有找到，使用第一个标题
      if (!activeHeading.value && tocItems.value.length > 0) {
        activeHeading.value = tocItems.value[0].id
      }
    })
  }
}

// 监听 headings 变化
watch(tocItems, (newHeadings) => {
  if (!process.client) return

  if (newHeadings.length > 0) {
    observerRetryCount = 0
    nextTick(() => {
      if (observerSetupTimer) {
        clearTimeout(observerSetupTimer)
      }
      observerSetupTimer = window.setTimeout(setupObserver, 100)
    })
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
  
  // 在组件挂载时也尝试初始化 observer
  if (tocItems.value.length > 0) {
    nextTick(() => {
      if (observerSetupTimer) {
        clearTimeout(observerSetupTimer)
      }
      observerSetupTimer = window.setTimeout(setupObserver, 150)
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (observer) observer.disconnect()
  if (observerSetupTimer) {
    clearTimeout(observerSetupTimer)
    observerSetupTimer = null
  }
  if (highlightTimer) {
    clearTimeout(highlightTimer)
    highlightTimer = null
  }
  if (clearHighlightTimer) {
    clearTimeout(clearHighlightTimer)
    clearHighlightTimer = null
  }
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 2px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}

/* 暗色模式滚动条 */
:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
}

:global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>

<style>
/* 标题高亮动画 - 全局样式，更明显 */
.heading-highlight {
  animation: highlight-flash 3s ease-out !important;
}

@keyframes highlight-flash {
  0% {
    background-color: color-mix(in srgb, var(--accent-primary) 30%, transparent) !important;
    border-radius: 0.25rem;
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary) 40%, transparent);
  }
  50% {
    background-color: color-mix(in srgb, var(--accent-primary) 20%, transparent);
  }
  100% {
    background-color: transparent;
    box-shadow: none;
  }
}
</style>

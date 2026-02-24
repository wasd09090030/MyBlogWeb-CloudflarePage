<template>
  <section class="waterfall-section" ref="sectionRef">
    <!-- 标题区域 -->
    <div class="section-header fade-up"></div>
    
    <div class="waterfall-container" ref="containerRef" :style="gridStyle">
      <div
        v-for="(item, index) in layoutItems"
        :key="`${item.id ?? 'img'}-${index}`"
        class="waterfall-item"
        :style="item.style"
        :ref="(el) => observeItem(el)"
        @click="$emit('image-click', item)"
      >
        <div class="item-inner">
          <img
            :src="item.thumbnailUrl || item.imageUrl"
            :alt="item.title || '画廊图片'"
            class="waterfall-image"
            loading="lazy"
          />
        </div>
      </div>
    </div>

    <!-- 无限滚动触发器 -->
    <div ref="infiniteScrollTrigger" class="infinite-scroll-trigger">
      <div v-if="isLoadingMore" class="loading-indicator fade-in">
        <div class="loading-spinner"></div>
        <span>加载更多图片...</span>
      </div>
      <div v-else-if="!hasMore && displayedCount > 0" class="end-message fade-in">
        <Icon name="check-circle" size="md" />
        <span>已加载全部 {{ displayedCount }} 张图片</span>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  columnCount: {
    type: Number,
    default: 4
  },
  // 无限滚动相关配置
  initialLoadCount: {
    type: Number,
    default: 20  // 初始加载数量
  },
  loadMoreCount: {
    type: Number,
    default: 10   // 每次加载更多的数量
  }
})

const emit = defineEmits(['image-click', 'load-more'])

// DOM 引用
const containerRef = ref(null)
const sectionRef = ref(null)
const infiniteScrollTrigger = ref(null)
const itemObserver = ref(null)

// 布局参数
const gridGap = 16
const gridRowHeight = 8
const minWidthPercent = 15
const maxWidthPercent = 45

const gridColumns = ref(Math.max(8, props.columnCount * 4))
const containerWidth = ref(0)

// 是否已挂载（用于 SSR 兼容）
const isMounted = ref(false)

// 无限滚动状态
const displayedCount = ref(props.initialLoadCount)
const isLoadingMore = ref(false)
const hasMore = computed(() => displayedCount.value < props.images.length)

// 稳定随机（用于打乱和宽度分配）
const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash >>> 0
}

const randomFromHash = (value) => {
  const hash = hashString(value)
  return (hash % 10000) / 10000
}

const getBaseKey = (image, index) => {
  if (image?.id != null) return `${image.id}`
  if (image?.imageUrl) return image.imageUrl
  return `${index}`
}

const shuffledImages = computed(() => {
  return [...props.images]
    .map((image, index) => ({
      image,
      order: randomFromHash(`order:${getBaseKey(image, index)}`)
    }))
    .sort((a, b) => a.order - b.order)
    .map(entry => entry.image)
})

// 当前显示的图片
const displayedImages = computed(() => {
  return shuffledImages.value.slice(0, displayedCount.value)
})

const getImageRatio = (image) => {
  const width = Number(image?.imageWidth || image?.width || 0)
  const height = Number(image?.imageHeight || image?.height || 0)
  if (width > 0 && height > 0) {
    return Math.max(0.2, Math.min(5, width / height))
  }
  return 1
}

const getAspectRatioStyle = (image) => {
  const width = Number(image?.imageWidth || image?.width || 0)
  const height = Number(image?.imageHeight || image?.height || 0)
  if (width > 0 && height > 0) {
    return `${width} / ${height}`
  }
  return '1 / 1'
}

const getColumnSpan = (image, index) => {
  const baseKey = getBaseKey(image, index)
  const rand = randomFromHash(`width:${baseKey}`)
  const widthPercent = minWidthPercent + (maxWidthPercent - minWidthPercent) * rand
  const span = Math.round((gridColumns.value * widthPercent) / 100)
  return Math.max(1, Math.min(gridColumns.value, span))
}

const layoutItems = computed(() => {
  const cols = Math.max(1, gridColumns.value)
  const width = containerWidth.value
  const gap = gridGap
  const rowHeight = gridRowHeight
  const safeWidth = width > 0 ? width : (isMounted.value ? window.innerWidth : 0)
  const colWidth = safeWidth > 0
    ? Math.max(1, (safeWidth - (cols - 1) * gap) / cols)
    : 1

  return displayedImages.value.map((image, index) => {
    const ratio = getImageRatio(image)
    const colSpan = getColumnSpan(image, index)
    const itemWidth = colWidth * colSpan + gap * (colSpan - 1)
    const itemHeight = ratio > 0 ? itemWidth / ratio : itemWidth
    const rowSpan = Math.max(1, Math.ceil((itemHeight + gap) / (rowHeight + gap)))

    return {
      ...image,
      style: {
        gridColumn: `span ${colSpan}`,
        gridRowEnd: `span ${rowSpan}`,
        aspectRatio: getAspectRatioStyle(image)
      }
    }
  })
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridColumns.value}, minmax(0, 1fr))`,
  gap: `${gridGap}px`,
  '--grid-row-height': `${gridRowHeight}px`
}))

// 加载更多图片
const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return
  
  isLoadingMore.value = true
  
  // 模拟加载延迟，让用户看到加载动画
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 增加显示数量
  displayedCount.value = Math.min(
    displayedCount.value + props.loadMoreCount,
    props.images.length
  )
  
  isLoadingMore.value = false
  emit('load-more', displayedCount.value)
}

// Intersection Observer 用于无限滚动
let observer = null

const setupInfiniteScroll = () => {
  if (!infiniteScrollTrigger.value) return
  
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMore.value && !isLoadingMore.value) {
          loadMore()
        }
      })
    },
    {
      root: null,
      rootMargin: '400px', // 提前触发加载
      threshold: 0
    }
  )
  
  observer.observe(infiniteScrollTrigger.value)
}

const updateContainerWidth = () => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
}

const observeItem = (el) => {
  if (el && itemObserver.value) {
    itemObserver.value.observe(el)
  }
}

// 响应式调整网格列数
const updateGridColumns = () => {
  const width = window.innerWidth
  let columns = 16
  if (width < 576) {
    columns = 8
  } else if (width < 992) {
    columns = 12
  } else if (width < 1400) {
    columns = 16
  } else {
    columns = 20
  }

  const baseColumns = Math.max(8, props.columnCount * 4)
  gridColumns.value = Math.max(baseColumns, columns)
  nextTick(updateContainerWidth)
}

// 初始化
const initLayout = async () => {
  updateGridColumns()
  setupInfiniteScroll()
}

// 销毁
const destroyLayout = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

// 重置显示数量（当图片数据变化时）
watch(() => props.images, () => {
  displayedCount.value = Math.min(props.initialLoadCount, props.images.length)
}, { deep: true })

// 暴露方法给父组件
defineExpose({
  initLayout,
  destroyLayout,
  loadMore
})

// 监听窗口大小变化
onMounted(() => {
  isMounted.value = true
  updateGridColumns()
  window.addEventListener('resize', updateGridColumns)
  window.addEventListener('resize', updateContainerWidth)
  
  // 初始化 item observer
  itemObserver.value = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        itemObserver.value.unobserve(entry.target)
      }
    })
  }, {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px 50px 0px'
  })

  // 延迟设置无限滚动，确保DOM已渲染
  nextTick(() => {
    setupInfiniteScroll()
    updateContainerWidth()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateGridColumns)
  window.removeEventListener('resize', updateContainerWidth)
  destroyLayout()
  if (itemObserver.value) {
    itemObserver.value.disconnect()
    itemObserver.value = null
  }
})
</script>

<style scoped>
.waterfall-section {
  padding: 2rem 1rem;
  background: linear-gradient(180deg, transparent 0%, var(--glass-bg) 100%);
  border-radius: 30px 30px 0 0;
  margin-top: -20px;
  width: 100%;
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.fade-up {
  animation: fade-up 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.fade-in {
  animation: fade-in 0.4s ease both;
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .fade-up,
  .fade-in {
    animation: none;
  }
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.title-icon {
  color: var(--accent-primary);
}

.section-subtitle {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin: 0;
}

.waterfall-container {
  display: grid;
  grid-auto-flow: dense;
  grid-auto-rows: var(--grid-row-height, 8px);
  gap: 1rem;
  width: 100%;
  max-width: 100%; /* 移除最大宽度限制，让图片占据更多空间 */
  margin: 0 auto;
  padding: 0 1rem;
  box-sizing: border-box;
}

.waterfall-item {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transform-origin: center;
  background: var(--card-bg);
  /* 初始隐藏状态：向下偏移并透明 */
  opacity: 0;
  transform: translateY(60px) scale(0.95);
  /* 复合过渡效果 */
  transition: 
    opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.4s ease;
  box-shadow: var(--shadow-sm);
  will-change: transform, opacity;
}

.waterfall-item.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.waterfall-item:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: var(--shadow-lg);
  z-index: 2;
}

.waterfall-item:active {
  transform: scale(0.98);
  transition-duration: 0.1s;
}

.item-inner {
  position: relative;
  width: 100%;
  height: 100%;
}

.waterfall-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1),
              filter 0.4s ease;
}

.waterfall-item:hover .waterfall-image {
  transform: scale(1.12);
}

/* 无限滚动触发器样式 */
.infinite-scroll-trigger {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
  min-height: 80px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--accent-primary);
  font-size: 0.95rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--focus-ring-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.end-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent-success);
  font-size: 0.9rem;
  padding: 0.75rem 1.5rem;
  background: color-mix(in srgb, var(--accent-success) 12%, transparent);
  border-radius: 25px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .waterfall-section {
    padding: 1.5rem 1rem;
    border-radius: 20px 20px 0 0;
  }

  .section-title {
    font-size: 1.2rem;
  }

  .section-subtitle {
    font-size: 0.85rem;
  }

  .waterfall-container {
    gap: 0.75rem;
    padding: 0;
  }

  .waterfall-item {
    border-radius: 12px;
  }
}

@media (max-width: 576px) {
  .waterfall-section {
    padding: 1rem 0.5rem;
  }

  .waterfall-container {
    gap: 0.5rem;
  }

  .waterfall-item {
    border-radius: 10px;
  }

  .infinite-scroll-trigger {
    padding: 1.5rem;
  }
}

/* 暗色主题 */
:global(.dark) .waterfall-section,
:global(.dark-theme) .waterfall-section {
  background: linear-gradient(180deg, transparent 0%, var(--glass-bg) 100%);
}

:global(.dark) .section-title,
:global(.dark-theme) .section-title {
  color: var(--text-primary);
}

:global(.dark) .title-icon,
:global(.dark-theme) .title-icon {
  color: var(--accent-secondary);
}

:global(.dark) .section-subtitle,
:global(.dark-theme) .section-subtitle {
  color: var(--text-muted);
}

:global(.dark) .waterfall-item,
:global(.dark-theme) .waterfall-item {
  background: var(--card-bg);
  box-shadow: var(--shadow-md);
}

:global(.dark) .waterfall-item:hover,
:global(.dark-theme) .waterfall-item:hover {
  box-shadow: var(--shadow-xl);
}

:global(.dark) .item-overlay,
:global(.dark-theme) .item-overlay {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-secondary) 70%, transparent) 0%,
    color-mix(in srgb, var(--accent-primary) 70%, transparent) 100%
  );
}

:global(.dark) .loading-indicator,
:global(.dark-theme) .loading-indicator {
  color: var(--accent-secondary);
}

:global(.dark) .loading-spinner,
:global(.dark-theme) .loading-spinner {
  border-color: color-mix(in srgb, var(--accent-secondary) 25%, transparent);
  border-top-color: var(--accent-secondary);
}

:global(.dark) .end-message,
:global(.dark-theme) .end-message {
  color: var(--accent-success);
  background: color-mix(in srgb, var(--accent-success) 12%, transparent);
}
</style>

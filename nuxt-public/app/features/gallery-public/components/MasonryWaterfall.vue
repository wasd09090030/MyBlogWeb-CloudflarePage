<template>
  <div class="masonry-container" ref="containerRef">
    <div
      v-for="(column, colIndex) in columns"
      :key="colIndex"
      class="masonry-column"
      :style="{ gap: gap + 'px' }"
    >
      <div
        v-for="item in column"
        :key="item.id"
        class="masonry-item-wrapper"
      >
        <slot name="item" :item="item" :index="images.indexOf(item)">
          <!-- 默认卡片插槽内容 fallback -->
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useWindowSize } from '@vueuse/core'

export interface WaterfallItem {
  id: string | number
  url: string
  width: number
  height: number
  [key: string]: any
}

const props = withDefaults(defineProps<{
  images: WaterfallItem[]
  gap?: number
  minColWidth?: number
}>(), {
  images: () => [],
  gap: 16, // 默认精致的排版间距 (MD3 标准 16px/24px)
  minColWidth: 280 // 提高单图最小展现宽度增加大气感
})

const containerRef = ref<HTMLElement | null>(null)
const columns = ref<WaterfallItem[][]>([])
const colCount = ref(1)

const { width: windowWidth } = useWindowSize()

// 计算需要的列数
const calculateColCount = () => {
  if (!containerRef.value) return 1
  const containerWidth = containerRef.value.clientWidth
  // 根据间隙和最小列宽计算：
  // cols * minColWidth + (cols - 1) * gap <= containerWidth
  // cols <= (containerWidth + gap) / (minColWidth + gap)
  let count = Math.floor((containerWidth + props.gap) / (props.minColWidth + props.gap))
  return Math.max(1, Math.min(count, 5)) // 最少1列，最多5列避免过密
}

// 瀑布流核心派发逻辑 (贪心：始终将新图推入当前高度最小的列)
const layoutItems = () => {
  if (!props.images || props.images.length === 0) {
    columns.value = []
    return
  }

  const count = calculateColCount()
  colCount.value = count

  const newColumns: WaterfallItem[][] = Array.from({ length: count }, () => [])
  // 模拟列高度追踪阵列
  const colHeights = new Array(count).fill(0)

  props.images.forEach((item) => {
    // 找出当前高度最矮的列索引
    let minHeightIndex = 0
    let minHeight = colHeights[0]

    for (let i = 1; i < count; i++) {
      if (colHeights[i] < minHeight) {
        minHeight = colHeights[i]
        minHeightIndex = i
      }
    }

    // 分配到最矮的列
    newColumns[minHeightIndex].push(item)

    // 更新该列高度估算。因为图片的父容器是固定宽度的等比缩放，高度会按原比例缩小。
    // 计算估算高度：(实际展示宽 / 原始宽) * 原高 + 间距（这里统一按 1 的比率算相对增长即可保障分配均衡度）
    const aspectRatio = item.width > 0 ? (item.height / item.width) : 1
    colHeights[minHeightIndex] += aspectRatio + (props.gap / props.minColWidth)
  })

  columns.value = newColumns
}

// 防抖重绘，防止尺寸调整时剧烈闪烁
let resizeTimer: ReturnType<typeof setTimeout>
const handleResize = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    layoutItems()
  }, 100)
}

watch(() => props.images, () => {
  nextTick(() => {
    layoutItems()
  })
}, { deep: true, immediate: true })

watch(windowWidth, () => {
  handleResize()
})

onMounted(() => {
  // 确保挂载后 DOM 可用，执行一次绘制
  layoutItems()
})
</script>

<style scoped>
.masonry-container {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: v-bind(gap + 'px'); /* 保证列与列直间的精确水平间距 */
}

/* 每列宽度一致，flex-basis 分担平分 */
.masonry-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.masonry-item-wrapper {
  position: relative;
  border-radius: 12px; /* MD3 标准卡圈角 */
  overflow: hidden;
  /* 移除这里的 hover 放大：这会导致图片宽高影响周边或者截断溢出造成形变。所有的 Hover 内敛到深层图层实现 */
  transform: translateZ(0); /* 提升渲染层 */
  background: var(--n-card-color, rgba(200, 200, 200, 0.1));
}

/* 进场动画：简单的微移与淡入，确保流畅性而不破坏排版 */
.masonry-item-wrapper {
  animation: waterfall-fade-in 0.6s cubic-bezier(0.2, 0, 0, 1) both;
}

@keyframes waterfall-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

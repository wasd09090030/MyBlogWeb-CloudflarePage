<template>
  <div class="image-comparison-mdc my-6 relative overflow-hidden" ref="containerRef">
    <div class="relative select-none" :style="{ aspectRatio: aspectRatio || 'auto' }">
      <!-- 后图（右侧） -->
      <div class="absolute inset-0">
        <slot name="after">
          <img v-if="after" :src="after" alt="After" class="w-full h-full object-cover" />
        </slot>
      </div>
      
      <!-- 前图（左侧，通过 clip-path 裁剪） -->
      <div 
        class="absolute inset-0 overflow-hidden"
        :style="{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }"
      >
        <slot name="before">
          <img v-if="before" :src="before" alt="Before" class="w-full h-full object-cover" />
        </slot>
      </div>
      
      <!-- 滑块 -->
      <div 
        class="slider-handle absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
        :style="{ left: `${sliderPosition}%` }"
        role="slider"
        tabindex="0"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-orientation="horizontal"
        :aria-valuenow="Math.round(sliderPosition)"
        :aria-valuetext="`${Math.round(sliderPosition)}%`"
        :aria-label="`${beforeLabel} 与 ${afterLabel} 对比位置`"
        @pointerdown="startDrag"
        @pointercancel="stopDrag"
        @keydown="handleSliderKeydown"
      >
        <div class="slider-button absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full border border-gray-300 flex items-center justify-center">
          <div class="flex gap-1">
            <Icon name="heroicons:chevron-left" size="sm" />
            <Icon name="heroicons:chevron-right" size="sm" />
          </div>
        </div>
      </div>
      
      <!-- 标签 -->
      <div v-if="showLabels" class="absolute top-4 left-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full backdrop-blur-xs">
        {{ beforeLabel }}
      </div>
      <div v-if="showLabels" class="absolute top-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full backdrop-blur-xs">
        {{ afterLabel }}
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * ImageComparison 图片对比组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::image-comparison{before="/img/before.jpg" after="/img/after.jpg" aspectRatio="16/9"}
 * ::
 * 
 * 或使用 slots：
 * ::image-comparison{aspectRatio="16/9"}
 * #before
 * ![优化前](/img/before.jpg)
 * #after
 * ![优化后](/img/after.jpg)
 * ::
 */

const props = defineProps({
  before: String,
  after: String,
  aspectRatio: {
    type: String,
    default: '16/9'
  },
  showLabels: {
    type: Boolean,
    default: true
  },
  beforeLabel: {
    type: String,
    default: 'Before'
  },
  afterLabel: {
    type: String,
    default: 'After'
  }
})

const containerRef = ref(null)
const sliderPosition = ref(50)
const isDragging = ref(false)

const updateSliderPosition = (clientX) => {
  if (!containerRef.value) return
  
  const rect = containerRef.value.getBoundingClientRect()
  const x = clientX - rect.left
  const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
  sliderPosition.value = percentage
}

const startDrag = (e) => {
  isDragging.value = true
  e.preventDefault()
}

const onDrag = (e) => {
  if (!isDragging.value) return

  updateSliderPosition(e.clientX)
}

const stopDrag = () => {
  isDragging.value = false
}

const handleSliderKeydown = (e) => {
  const step = e.shiftKey ? 10 : 1

  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    const direction = e.key === 'ArrowRight' ? 1 : -1
    sliderPosition.value = Math.max(0, Math.min(100, sliderPosition.value + direction * step))
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault()
    sliderPosition.value = e.key === 'Home' ? 0 : 100
  }
}

onMounted(() => {
  document.addEventListener('pointermove', onDrag)
  document.addEventListener('pointerup', stopDrag)
})

onUnmounted(() => {
  document.removeEventListener('pointermove', onDrag)
  document.removeEventListener('pointerup', stopDrag)
})
</script>

<style scoped>
.slider-handle {
  z-index: 10;
  touch-action: none;
}

.slider-button {
  pointer-events: none;
  user-select: none;
}
</style>

<template>
  <section class="gallery-section">
    <div 
      class="carousel-container" 
      @mouseenter="pauseAutoplay" 
      @mouseleave="handleMouseLeave"
      @mousedown="startDrag"
      @touchstart="startDrag"
      @mousemove="onDrag"
      @touchmove="onDrag"
      @mouseup="endDrag"
      @touchend="endDrag"
    >
      <div class="carousel-stage">
        <div 
          v-for="(item, index) in internalImages" 
          :key="item._uniqueKey"
          class="carousel-item"
          :class="{ active: index === activeIndex }"
          :style="getItemStyle(index)"
          @click="handleItemClick(index, item)"
        >
          <div class="item-content">
            <img :src="item.imageUrl" class="carousel-image" loading="lazy" />
            <div class="item-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  autoplayInterval: {
    type: Number,
    default: 3000
  }
})

const emit = defineEmits(['image-click'])

const activeIndex = ref(0)
const autoplayTimer = ref(null)
const isDragging = ref(false)
const startX = ref(0)
const currentX = ref(0)
const isClickValid = ref(true)

// 构造内部循环数组：确保数量足够以实现无缝无限滚动
// 至少需要 10 个元素来保证视口外的元素跳转不可见（避免"飞过"屏幕）
const internalImages = computed(() => {
  const original = props.images
  if (!original || original.length === 0) return []
  
  const minLength = 15
  let result = [...original]
  
  // 复制数组直到满足最小长度
  while (result.length < minLength) {
    result = [...result, ...original]
  }
  
  // 添加唯一 Key 以便 v-for 渲染
  return result.map((img, i) => ({
    ...img,
    _uniqueKey: `clone-${i}-${img.id || Math.random()}`
  }))
})

// 初始化
onMounted(() => {
  if (internalImages.value.length > 0) {
    // 从中间开始，方便向左向右都有缓冲区
    activeIndex.value = Math.floor(internalImages.value.length / 2)
  }
  startAutoplay()
})

onUnmounted(() => {
  stopAutoplay()
})

const startAutoplay = () => {
  stopAutoplay()
  if (internalImages.value.length <= 1) return
  autoplayTimer.value = setInterval(() => {
    next()
  }, props.autoplayInterval)
}

const stopAutoplay = () => {
  if (autoplayTimer.value) {
    clearInterval(autoplayTimer.value)
    autoplayTimer.value = null
  }
}

const pauseAutoplay = () => {
  stopAutoplay()
}

const resumeAutoplay = () => {
  startAutoplay()
}

const getClientX = (e) => {
  if (e.type.startsWith('touch')) {
    // touchend has no touches, use changedTouches
    return e.touches[0] ? e.touches[0].clientX : e.changedTouches[0].clientX
  }
  return e.clientX
}

const startDrag = (e) => {
  isDragging.value = true
  isClickValid.value = true
  startX.value = getClientX(e)
  currentX.value = startX.value
  pauseAutoplay()
}

const onDrag = (e) => {
  if (!isDragging.value) return
  currentX.value = getClientX(e)
  
  // check for drag distance to invalidate click
  if (Math.abs(currentX.value - startX.value) > 5) {
    isClickValid.value = false
  }
}

const endDrag = () => {
  if (!isDragging.value) return
  isDragging.value = false
  
  const diff = currentX.value - startX.value
  const threshold = 50 // swipe threshold
  
  if (Math.abs(diff) > threshold) {
    if (diff > 0) {
      prev()
    } else {
      next()
    }
  }
  
  resumeAutoplay()
}

const handleMouseLeave = () => {
  if (isDragging.value) {
    endDrag()
  } else {
    resumeAutoplay()
  }
}

const next = () => {
  activeIndex.value = (activeIndex.value + 1) % internalImages.value.length
}

const prev = () => {
  const len = internalImages.value.length
  activeIndex.value = (activeIndex.value - 1 + len) % len
}

const handleItemClick = (index, item) => {
  if (!isClickValid.value) return
  
  if (index === activeIndex.value) {
    emit('image-click', item)
  } else {
    // 计算最短路径跳转
    const len = internalImages.value.length
    let diff = index - activeIndex.value
    if (diff > len / 2) diff -= len
    else if (diff < -len / 2) diff += len
    
    // 如果直接设置 index，可能会导致"长途跋涉"的动画
    // 这里简单设置，因为通常点击的是可见区域的图片 (-2 到 2)
    activeIndex.value = index
  }
}

// 核心：计算每个卡片的 3D 样式
const getItemStyle = (index) => {
  const len = internalImages.value.length
  if (len === 0) return {}

  // 计算循环偏移量 (Circular Offset)
  let offset = index - activeIndex.value
  // 修正偏移量以实现最短路径循环
  if (offset > len / 2) offset -= len
  else if (offset < -len / 2) offset += len
  
  const absOffset = Math.abs(offset)
  
  // 只显示 0 1 2 1 0 模式 (即 absOffset <= 2)
  if (absOffset > 2) {
    return { 
      opacity: 0,
      pointerEvents: 'none',
      visibility: 'hidden', // 使用 visibility hidden 保持布局但不可见 (absolute定位下其实不影响布局)
      transform: 'translate(-50%, -50%) scale(0)' // 缩到最小防止干扰
    }
  }

  // 配置参数
  const xSpacing = 75// 60% 间距
  const zDepthStep = 120 // Z轴深度递减
  const scaleStep = 0.1 // 缩放递减

  let translateX = offset * xSpacing
  let translateZ = -absOffset * zDepthStep
  let scale = 1 - (absOffset * scaleStep)
  let zIndex = 100 - absOffset
  let opacity = 1 // 保持可见区域不透明，或者轻微透明

  // 中心特殊处理
  if (offset === 0) {
    scale = 1.1
    translateZ = 100
    zIndex = 1000
    opacity = 1
  } else {
    // 两侧稍微变暗一点点，增加层次感
    opacity = 0.9
  }

  return {
    transform: `
      translateX(${translateX}%) 
      translateZ(${translateZ}px) 
      rotateY(0deg) 
      scale(${scale})
    `,
    zIndex: zIndex,
    opacity: opacity,
    visibility: 'visible'
  }
}
</script>

<style scoped>
.gallery-section {
  height: 80vh;
  width: 100%;
  padding: 10px 0;
  overflow: hidden;
  perspective: 1200px;
  background: transparent;
}

.carousel-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  touch-action: pan-y; /* Allow vertical scroll, handle horizontal in JS */
  user-select: none;
}

.carousel-stage {
  position: relative;
  width: 100%;
  height: 80%;
  transform-style: preserve-3d;
  display: flex;
  justify-content: center;
  align-items: center;
}

.carousel-item {
  position: absolute;
  width: 400px;
  height: 100%;
  /* 优化过渡效果：transform 负责位置移动，opacity 负责显隐 */
  transition: transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.5s ease, z-index 0s;
  cursor: pointer;
  border-radius: 15px;
  background: #f0f0f0;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  /* 默认居中 */
  left: 0;
  right: 0;
  margin: 0 auto; 
  /* 这一步很关键：translateX百分比是相对于自身宽度的。
     如果不居中，translate % 会基于父容器或者当前位置。
     Absolute + margin: 0 auto + left/right: 0 让元素初始水平居中。
  */
}

.item-content {
  width: 100%;
  height: 100%;
  border-radius: 15px;
  overflow: hidden;
  position: relative;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
}

.item-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.carousel-item:not(.active) .item-overlay {
  opacity: 1;
  background: rgba(0, 0, 0, 0.15); /* 两侧压暗 */
}

.carousel-item.active .item-overlay {
  opacity: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .carousel-item {
    width: 220px;
    height: 320px;
  }
  
  .gallery-section {
    padding: 20px 0;
  }
  
  .carousel-container {
    height: 360px;
  }
}

</style>

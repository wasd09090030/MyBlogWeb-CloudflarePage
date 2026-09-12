<template>
  <div class="coverflow-fill">
    <div 
      class="carousel-container" 
      :class="{ 'is-dragging': isDragging }"
      @mouseenter="pauseAutoplay" 
      @mouseleave="handleMouseLeave"
      @mousedown="startDrag"
      @touchstart="startDrag"
      @mousemove="onDrag"
      @touchmove="onDrag"
      @mouseup="endDrag"
      @touchend="endDrag"
    >
      <div class="carousel-stage" ref="stageRef">
        <div 
          v-for="(item, index) in internalImages" 
          :key="item._uniqueKey"
          class="carousel-item"
          :class="{ active: index === activeIndex }"
          :style="getItemStyle(index)"
          @click="handleItemClick(index, item)"
        >
          <div class="item-content">
            <template v-if="hasImage(item, index)">
              <img
                :src="item.thumbnailUrl || ''"
                class="carousel-image"
                loading="lazy"
                @error="handleImageError(item, index)"
              />
            </template>
            <div v-else class="carousel-fallback">
              <Icon name="heroicons:photo" size="2xl" />
            </div>
            <div class="item-overlay"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
const imageErrorMap = ref({})

const getImageKey = (image, index) => String(image?._uniqueKey ?? image?.id ?? image?.thumbnailUrl ?? index)
const hasImage = (image, index) => {
  const thumbnailUrl = image?.thumbnailUrl
  if (!thumbnailUrl) return false
  return !imageErrorMap.value[getImageKey(image, index)]
}
const handleImageError = (image, index) => {
  imageErrorMap.value[getImageKey(image, index)] = true
}

const activeIndex = ref(0)
const autoplayTimer = ref(null)
const isDragging = ref(false)
const startX = ref(0)
const currentX = ref(0)
const isClickValid = ref(true)

// 拖拽跟随：dragProgress 的单位是「卡片宽度」，与 getItemStyle 里的 offset
// 同一量纲，直接相加即可得到连续的循环偏移量，从而实现 1:1 跟手。
const stageRef = ref(null)
const cardWidth = ref(400)
const dragProgress = ref(0)

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
    stepBy(1)
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

// 换算基准：一张卡片宽度 = 一格。
// 用 offsetWidth 而不是 getBoundingClientRect —— 后者会被 scale 变换污染。
// 响应式下 .carousel-item 是 400px（≤768px 为 180px），每次拖拽开始复测一次。
const measureCardWidth = () => {
  const el = stageRef.value?.querySelector('.carousel-item')
  if (el?.offsetWidth) cardWidth.value = el.offsetWidth
}

const startDrag = (e) => {
  isDragging.value = true
  isClickValid.value = true
  startX.value = getClientX(e)
  currentX.value = startX.value
  dragProgress.value = 0
  measureCardWidth()
  pauseAutoplay()
}

const onDrag = (e) => {
  if (!isDragging.value) return
  currentX.value = getClientX(e)

  const delta = currentX.value - startX.value

  // 卡片整体跟随指针位移（向右拖 delta > 0，卡片跟着向右走）
  dragProgress.value = delta / cardWidth.value

  // check for drag distance to invalidate click
  if (Math.abs(delta) > 5) {
    isClickValid.value = false
  }
}

const endDrag = () => {
  if (!isDragging.value) return
  isDragging.value = false

  // 拖过的格数 = 位移换算成卡片宽度后四舍五入；不足半格自然回弹 0 格
  const steps = Math.round(dragProgress.value)

  if (steps !== 0) {
    // 向右拖（steps > 0）→ 回到上一张，与原有 diff > threshold → prev() 语义一致
    stepBy(-steps)
  }

  // 归零拖拽位移：activeIndex 已吸收整数格，剩下的不足一格部分
  // 交给 .carousel-item 的 0.5s 缓动平滑吸附（is-dragging 已移除，过渡恢复）
  dragProgress.value = 0
  resumeAutoplay()
}

const handleMouseLeave = () => {
  if (isDragging.value) {
    endDrag()
  } else {
    resumeAutoplay()
  }
}

// 按格数平移（正数向后、负数向前），统一处理循环取模。
// 自动播放走 stepBy(1)；拖拽松手时按拖过的格数一次性平移。
const stepBy = (delta) => {
  const len = internalImages.value.length
  if (len === 0) return
  activeIndex.value = ((activeIndex.value + delta) % len + len) % len
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
//
// offset 是离散的循环格位，dragProgress 是当前拖拽的连续位移（单位同为「卡片宽度」）。
// 两者相加得到 eff —— 用它驱动全部几何量，卡片就能在拖拽过程中连续跟随指针，
// 而不是只在松手时跳一格。
// dragProgress 为 0（静止/自动播放）时，下面各式的取值与原实现逐项一致：
//   a=0 → scale 1.1 / z 100  / opacity 1   / zIndex 1000
//   a=1 → scale 0.9 / z -120 / opacity 0.9 / zIndex 99
//   a=2 → scale 0.8 / z -240 / opacity 0.9 / zIndex 98
const getItemStyle = (index) => {
  const len = internalImages.value.length
  if (len === 0) return {}

  // 计算循环偏移量 (Circular Offset)
  let offset = index - activeIndex.value
  // 修正偏移量以实现最短路径循环
  if (offset > len / 2) offset -= len
  else if (offset < -len / 2) offset += len

  const eff = offset + dragProgress.value
  const a = Math.abs(eff)

  // 配置参数
  const xSpacing = 75          // 每格水平位移（% of 卡片自身宽度）
  const zDepthStep = 120       // Z 轴每格递减
  const scaleStep = 0.1        // 侧卡之间每格缩放递减
  const centerScale = 1.1      // 中心卡缩放
  const centerZ = 100          // 中心卡 Z
  const sideScale = 0.9        // 第一张侧卡缩放
  const sideZ = -120           // 第一张侧卡 Z
  const fadeSpan = 0.5         // 第 3 张之后淡出的跨度（格）
  const visibleSpan = 2        // 完整可见到第 2 格（0 1 2 1 0 模式）

  // 缩放 / Z：a∈[0,1] 从中心卡过渡到侧卡，a>1 之后按 scaleStep 递减
  const scale = a <= 1
    ? centerScale - (centerScale - sideScale) * a
    : Math.max(0.4, sideScale - scaleStep * (a - 1))
  const translateZ = a <= 1
    ? centerZ - (centerZ - sideZ) * a
    : sideZ - zDepthStep * (a - 1)

  // 透明度：中心到第一张侧卡 1 → 0.9，第 2 格维持 0.9，再往外淡出
  let opacity
  if (a <= 1) opacity = 1 - 0.1 * a
  else if (a <= visibleSpan) opacity = 0.9
  else opacity = Math.max(0, 0.9 * (1 - (a - visibleSpan) / fadeSpan))

  const hidden = a > visibleSpan + fadeSpan
  // zIndex 需要整数；中心卡在过半格之前保持置顶
  const zIndex = a < 0.5 ? 1000 : Math.max(1, Math.round(100 - a))

  return {
    transform: `
      translateX(${eff * xSpacing}%) 
      translateZ(${translateZ}px) 
      rotateY(0deg) 
      scale(${scale})
    `,
    zIndex: hidden ? 0 : zIndex,
    opacity: opacity,
    visibility: hidden ? 'hidden' : 'visible',
    pointerEvents: hidden ? 'none' : 'auto'
  }
}

watch(
  () => internalImages.value.map((image, index) => getImageKey(image, index)),
  () => {
    imageErrorMap.value = {}
  },
  { immediate: true }
)
</script>

<style scoped>
.coverflow-fill {
  width: 100%;
  height: 100%;
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
  touch-action: pan-y;
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
  background: var(--gallery-card-strong, #f0f0f0);
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

/* 拖拽期间关闭过渡，让卡片严格跟随指针。
   否则 0.5s 的缓动会让卡片始终落后于指针 —— 这正是"粘滞、不跟手"的来源。
   松手时 is-dragging 被移除，过渡恢复，剩余不足一格的位移平滑吸附。 */
.carousel-container.is-dragging .carousel-item {
  transition: none;
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

.carousel-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.82);
  background: var(--gallery-fallback, linear-gradient(145deg, rgba(157, 23, 77, 0.58), rgba(61, 47, 43, 0.3)));
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
    width: 180px;
  }
}

</style>

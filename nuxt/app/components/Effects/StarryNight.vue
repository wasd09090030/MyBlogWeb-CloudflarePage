<template>
  <div class="starry-night">
    <div 
      v-for="(star, index) in visibleStars" 
      :key="`star-${index}`"
      class="star"
      :style="getStarStyle(star, index)"
    >
      <div class="star-inner"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const stars = ref([])
const isActive = ref(true)

// 星星配置
const STAR_COUNT = 80

// 星星类型配置
const STAR_TYPES = [
  { size: 1, opacity: 0.3, twinkleSpeed: 2 },    // 小星星
  { size: 1.5, opacity: 0.5, twinkleSpeed: 3 },  // 中星星
  { size: 2, opacity: 0.8, twinkleSpeed: 4 }     // 大星星
]

// 只显示活跃的星星
const visibleStars = computed(() => 
  stars.value.filter(star => star.active)
)

// 创建星星数据
const createStar = (index) => {
  const type = STAR_TYPES[Math.floor(Math.random() * STAR_TYPES.length)]
  return {
    id: `star-${index}-${Date.now()}`,
    x: Math.random() * 100, // 百分比位置
    y: Math.random() * 100,
    size: type.size,
    opacity: type.opacity,
    twinkleSpeed: type.twinkleSpeed + Math.random() * 2,
    delay: Math.random() * 5,
    // 飘动效果参数
    driftX: -20 + Math.random() * 40, // X方向飘动距离
    driftY: -20 + Math.random() * 40, // Y方向飘动距离
    driftDuration: 15 + Math.random() * 20, // 飘动周期
    driftDelay: Math.random() * 10, // 飘动延迟
    active: true
  }
}

// 获取星星样式
const getStarStyle = (star, index) => {
  return {
    '--x': `${star.x}%`,
    '--y': `${star.y}%`,
    '--size': star.size,
    '--opacity': star.opacity,
    '--twinkle-speed': `${star.twinkleSpeed}s`,
    '--delay': `${star.delay}s`,
    '--drift-x': `${star.driftX}px`,
    '--drift-y': `${star.driftY}px`,
    '--drift-duration': `${star.driftDuration}s`,
    '--drift-delay': `${star.driftDelay}s`,
    animationDelay: `${star.delay}s`,
    animationDuration: `${star.twinkleSpeed}s`
  }
}

// 初始化星星
const initStars = () => {
  stars.value = []
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.value.push(createStar(i))
  }
}

// 处理窗口大小改变
const handleResize = () => {
  // 星星位置是百分比，不需要重新计算
}

onMounted(() => {
  initStars()
  
  // 监听窗口大小改变
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  isActive.value = false
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.starry-night {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99;
  overflow: hidden;
  background: transparent;
}

/* 星星样式 */
.star {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: calc(2px * var(--size));
  height: calc(2px * var(--size));
  pointer-events: none;
  user-select: none;
  animation: starDrift var(--drift-duration) ease-in-out infinite;
  animation-delay: var(--drift-delay);
}

.star-inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8),
              0 0 10px 4px rgba(135, 206, 250, 0.4);
  animation: starTwinkle var(--twinkle-speed) ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: var(--opacity);
}

/* 星星闪烁动画 */
@keyframes starTwinkle {
  0%, 100% {
    opacity: var(--opacity);
    transform: scale(1);
  }
  50% {
    opacity: calc(var(--opacity) * 0.3);
    transform: scale(0.8);
  }
}

/* 星星飘动动画 */
@keyframes starDrift {
  0%, 100% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(var(--drift-x), calc(var(--drift-y) * 0.5));
  }
  50% {
    transform: translate(calc(var(--drift-x) * 0.5), var(--drift-y));
  }
  75% {
    transform: translate(calc(var(--drift-x) * -0.5), calc(var(--drift-y) * 0.5));
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .star {
    width: calc(1.5px * var(--size));
    height: calc(1.5px * var(--size));
  }
  
  .star-inner {
    box-shadow: 0 0 4px 1px rgba(255, 255, 255, 0.6),
                0 0 6px 2px rgba(135, 206, 250, 0.3);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .star-inner {
    animation-duration: calc(var(--twinkle-speed) * 3) !important;
  }
  
  .star {
    animation: none !important;
  }
}
</style>

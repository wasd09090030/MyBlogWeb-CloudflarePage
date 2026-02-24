<template>
  <div class="sakura-falling">
    <div 
      v-for="(petal, index) in visiblePetals" 
      :key="`petal-${index}`"
      class="sakura-petal"
      :style="getPetalStyle(petal, index)"
    >
      <img 
        :src="petal.image" 
        class="petal-image" 
        :alt="`flower-petal-${index}`"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'

const petals = ref([])
const isActive = ref(true)

// 花瓣配置
const PETAL_COUNT = 15
const PETAL_IMAGES = [
  '/flower/f01.webp',
  '/flower/f02.webp'
]

// 只显示活跃的花瓣
const visiblePetals = computed(() => 
  petals.value.filter(petal => petal.active)
)

// 创建花瓣数据
const createPetal = (index) => ({
  id: `petal-${index}-${Date.now()}`,
  image: PETAL_IMAGES[Math.floor(Math.random() * PETAL_IMAGES.length)],
  startDelay: Math.random() * 5,
  duration: 8 + Math.random() * 4,
  startX: Math.random() * window.innerWidth,
  endX: Math.random() * window.innerWidth,
  size: 0.8 + Math.random() * 0.6,
  opacity: 0.6 + Math.random() * 0.4,
  active: true
})

// 获取花瓣样式
const getPetalStyle = (petal, index) => {
  return {
    '--start-x': `${petal.startX}px`,
    '--end-x': `${petal.endX}px`,
    '--duration': `${petal.duration}s`,
    '--delay': `${petal.startDelay}s`,
    '--size': petal.size,
    '--opacity': petal.opacity,
    animationDelay: `${petal.startDelay}s`,
    animationDuration: `${petal.duration}s`
  }
}

// 初始化花瓣
const initPetals = () => {
  petals.value = []
  for (let i = 0; i < PETAL_COUNT; i++) {
    petals.value.push(createPetal(i))
  }
}

// 重新启动花瓣动画
const restartPetal = (index) => {
  if (!isActive.value) return
  
  setTimeout(() => {
    petals.value[index] = createPetal(index)
  }, 100)
}

// 处理窗口大小改变
const handleResize = () => {
  // 重新初始化所有花瓣以适应新的窗口大小
  initPetals()
}

onMounted(() => {
  initPetals()
  
  // 监听窗口大小改变
  window.addEventListener('resize', handleResize)
  
  // 监听动画结束事件
  document.addEventListener('animationend', (e) => {
    if (e.target.classList.contains('sakura-petal')) {
      const petalElement = e.target
      const index = Array.from(petalElement.parentNode.children).indexOf(petalElement)
      if (index !== -1) {
        restartPetal(index)
      }
    }
  })
})

onUnmounted(() => {
  isActive.value = false
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.sakura-falling {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99;
  overflow: hidden;
}

.sakura-petal {
  position: absolute;
  top: -50px;
  left: var(--start-x);
  width: calc(24px * var(--size));
  height: calc(24px * var(--size));
  opacity: var(--opacity);
  animation: sakuraFall var(--duration) linear infinite;
  animation-fill-mode: forwards;
  pointer-events: none;
  user-select: none;
}

.petal-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: inline-block;
  animation: sakuraRotate calc(var(--duration) * 0.5) linear infinite;
  filter: drop-shadow(1px 1px 2px rgba(255, 192, 203, 0.3));
}

@keyframes sakuraFall {
  0% {
    transform: translateY(-100px) translateX(0px) rotateZ(0deg);
    opacity: var(--opacity);
  }
  10% {
    opacity: var(--opacity);
  }
  90% {
    opacity: var(--opacity);
  }
  100% {
    transform: translateY(100vh) translateX(calc(var(--end-x) - var(--start-x))) rotateZ(360deg);
    opacity: 0;
  }
}

@keyframes sakuraRotate {
  0% {
    transform: rotateY(0deg) rotateX(0deg);
  }
  25% {
    transform: rotateY(90deg) rotateX(45deg);
  }
  50% {
    transform: rotateY(180deg) rotateX(0deg);
  }
  75% {
    transform: rotateY(270deg) rotateX(-45deg);
  }
  100% {
    transform: rotateY(360deg) rotateX(0deg);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .sakura-petal {
    width: calc(20px * var(--size));
    height: calc(20px * var(--size));
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .sakura-petal {
    animation-duration: calc(var(--duration) * 2) !important;
  }
  
  .petal-image {
    animation: none;
  }
}
</style>

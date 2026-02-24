<template>
  <section class="fade-section">
    <div class="fade-gallery keen-slider" ref="containerRef">
      <div
        v-for="(gallery, index) in images"
        :key="`loop-${gallery.id}-${index}`"
        class="keen-slider__slide fade-slide"
      >
        <div
          class="fade-item"
          @click="$emit('image-click', gallery)"
        >
          <img
            :src="gallery.imageUrl"
            alt="画廊图片"
            class="fade-image"
          />
          <div class="fade-overlay">
            <div class="fade-content">
              <!-- 可扩展的内容区域 -->
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['image-click'])

// DOM 引用
const containerRef = ref(null)

// Keen Slider 实例
const sliderInstance = ref(null)

// Keen Slider 模块
let KeenSlider

// 动态加载 Keen Slider
const loadKeenSlider = async () => {
  try {
    if (!KeenSlider) {
      const keenModule = await import('keen-slider')
      KeenSlider = keenModule.default
    }
    return true
  } catch (err) {
    console.error('Failed to load KeenSlider:', err)
    return false
  }
}

const autoplayPlugin = (slider) => {
  let timeout = null
  let mouseOver = false

  const clearNextTimeout = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  const nextTimeout = () => {
    clearNextTimeout()
    if (mouseOver) return
    timeout = setTimeout(() => {
      slider.next()
    }, 4000)
  }

  const handleMouseOver = () => {
    mouseOver = true
    clearNextTimeout()
  }

  const handleMouseOut = () => {
    mouseOver = false
    nextTimeout()
  }

  slider.on('created', () => {
    slider.container.addEventListener('mouseover', handleMouseOver)
    slider.container.addEventListener('mouseout', handleMouseOut)
    nextTimeout()
  })

  slider.on('dragStarted', clearNextTimeout)
  slider.on('animationEnded', nextTimeout)
  slider.on('updated', nextTimeout)
  slider.on('destroyed', () => {
    clearNextTimeout()
    slider.container.removeEventListener('mouseover', handleMouseOver)
    slider.container.removeEventListener('mouseout', handleMouseOut)
  })
}

const fadePlugin = (slider) => {
  const setOpacity = () => {
    const details = slider.track.details
    details.slides.forEach((slide, index) => {
      const opacity = slide.portion
      const element = slider.slides[index]
      if (!element) return
      element.style.opacity = opacity
      element.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none'
      element.style.zIndex = `${Math.round(opacity * 100)}`
    })
  }

  slider.on('created', () => {
    slider.container.style.position = 'relative'
    slider.container.style.overflow = 'hidden'
    slider.slides.forEach((slide) => {
      slide.style.position = 'absolute'
      slide.style.top = '0'
      slide.style.left = '0'
      slide.style.width = '100%'
      slide.style.height = '100%'
    })
    slider.container.classList.add('is-ready')
    setOpacity()
  })

  slider.on('detailsChanged', setOpacity)
  slider.on('updated', setOpacity)
}

// 初始化 Keen Slider
const initSlider = async () => {
  if (!containerRef.value || sliderInstance.value) return

  const loaded = await loadKeenSlider()
  if (!loaded || !KeenSlider) return

  await nextTick()

  sliderInstance.value = new KeenSlider(
    containerRef.value,
    {
      loop: true,
      drag: true,
      renderMode: 'custom',
      slides: {
        perView: 1,
        spacing: 0
      },
      defaultAnimation: {
        duration: 800
      }
    },
    [fadePlugin, autoplayPlugin]
  )
}

// 销毁 Keen Slider
const destroySlider = () => {
  if (sliderInstance.value) {
    sliderInstance.value.destroy()
    sliderInstance.value = null
  }
}

// 暴露方法给父组件
defineExpose({
  initSlider,
  destroySlider
})

onUnmounted(() => {
  destroySlider()
})
</script>

<style scoped>
/* 淡入淡出幻灯片样式 */
.fade-section {
  position: relative;
  width: 100%;
  height: 95vh;
  margin-bottom: 2rem;
  margin-top: 50px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 0;
  overflow: hidden;
}

.fade-gallery {
  height: 100%;
  width: 100%;
  margin: 0;
  position: relative;
  opacity: 0;
  transition: opacity 0.5s ease-out;
  cursor: grab;
  touch-action: pan-y;
}

.fade-gallery.is-ready {
  opacity: 1;
}

.fade-gallery:active {
  cursor: grabbing;
}

.fade-slide {
  height: 100%;
  width: 100%;
  opacity: 0;
  transition: opacity 0.5s ease-out;
}

.fade-item {
  position: relative;
  height: 100%;
  width: 100%;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
}

.fade-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.fade-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(45deg, rgba(0,0,0,0.3), transparent 50%, rgba(0,0,0,0.3));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.fade-item:hover .fade-overlay {
  opacity: 1;
}

.fade-content {
  text-align: center;
  color: white;
  padding: 1rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fade-section {
    height: 62vh;
  }
}

/* 暗色主题 */
:global(.dark-theme) .fade-section {
  background: rgba(45, 55, 72, 0.3);
}
</style>

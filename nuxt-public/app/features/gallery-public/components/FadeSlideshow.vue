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
          <template v-if="hasImage(gallery, index)">
            <img
              :src="(gallery.lightboxUrl || gallery.thumbnailUrl) || ''"
              alt="画廊图片"
              class="fade-image"
              @error="handleImageError(gallery, index)"
            />
          </template>
          <div v-else class="fade-fallback">
            <Icon name="heroicons:photo" size="2xl" />
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

defineEmits(['image-click'])
const imageErrorMap = ref({})

const getImageKey = (image, index) => String(image?.id ?? image?.thumbnailUrl ?? index)
const hasImage = (image, index) => {
  const thumbnailUrl = image?.lightboxUrl || image?.thumbnailUrl
  if (!thumbnailUrl) return false
  return !imageErrorMap.value[getImageKey(image, index)]
}
const handleImageError = (image, index) => {
  const imageKey = getImageKey(image, index)
  imageErrorMap.value[imageKey] = true
}

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
  /*
   * 每个 slide 上一次实际写入的样式值，用于「变化才写」。
   *
   * detailsChanged 在过渡期间逐帧触发。原实现对 5 个 slide 一律写
   * opacity + pointerEvents + zIndex 共 15 次，但其中大部分 slide 处于静止态
   * （portion 恒为 0），写入的是完全相同的值 —— 这些写入会白白制造样式重算，
   * 而 Hero 的淡入淡出区是首屏最大的一块绘制区域。
   * 加一层值比较后，静止的 slide 被完全跳过，只有正在交叉淡入淡出的两张
   * 才会真正落到 DOM。语义（含 zIndex 数值）与原先逐字节一致。
   */
  const appliedStyles = []

  const applySlideStyle = (index, element, opacity) => {
    const state = appliedStyles[index] || (appliedStyles[index] = {
      opacity: null,
      pointerEvents: null,
      zIndex: null
    })

    if (state.opacity !== opacity) {
      element.style.opacity = opacity
      state.opacity = opacity
    }

    const pointerEvents = opacity > 0.5 ? 'auto' : 'none'
    if (state.pointerEvents !== pointerEvents) {
      element.style.pointerEvents = pointerEvents
      state.pointerEvents = pointerEvents
    }

    const zIndex = `${Math.round(opacity * 100)}`
    if (state.zIndex !== zIndex) {
      element.style.zIndex = zIndex
      state.zIndex = zIndex
    }
  }

  const setOpacity = () => {
    const details = slider.track.details
    details.slides.forEach((slide, index) => {
      const element = slider.slides[index]
      if (!element) return
      applySlideStyle(index, element, slide.portion)
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
    appliedStyles.length = 0
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

watch(
  () => props.images.map((image, index) => image?.id ?? image?.thumbnailUrl ?? index),
  () => {
    imageErrorMap.value = {}
  },
  { immediate: true }
)
</script>

<!-- keen-slider CSS 仅在画廊页面按需加载 -->
<style>
@import 'keen-slider/keen-slider.min.css';
</style>

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
  transition:
    transform 0.65s cubic-bezier(0.2, 0.8, 0.2, 1),
    filter 0.45s ease;
  /* 这里不再常驻 will-change: transform。
     5 张 lightbox（约 2048px 宽 × 80vh 高）各自常驻一个合成层，
     要一直占着显存，而 transform 只在 hover 时才真正变化；
     在 prefers-reduced-motion 下连过渡都没有，提升纯属浪费。
     改为仅 hover 期间提升（见下方 :hover 规则），用完即撤。 */
}

.fade-item:hover .fade-image {
  transform: scale(1.025);
  filter: saturate(1.06) contrast(1.02);
  will-change: transform;
}

.fade-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.82);
  background: var(--gallery-fallback, linear-gradient(140deg, rgba(157, 23, 77, 0.65), rgba(61, 47, 43, 0.38)));
}

/* 响应式设计 */
@media (max-width: 768px) {
  .fade-section {
    height: 62vh;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-image {
    transition: none !important;
  }

  .fade-item:hover .fade-image {
    transform: none;
    filter: none;
  }
}

</style>

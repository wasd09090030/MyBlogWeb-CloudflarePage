<template>
  <div 
    class="image-enhanced-mdc my-6"
    :class="[
      `align-${align}`,
      { 'has-border': border, 'rounded': rounded }
    ]"
    :style="containerStyle"
  >
    <figure class="image-figure">
      <!-- 图片容器 -->
      <div class="image-wrapper" @click="handleImageClick">
        <img
          :src="src"
          :alt="alt"
          :title="title"
          :loading="lazy ? 'lazy' : 'eager'"
          class="enhanced-image"
          :class="{ 'cursor-zoom-in': zoomable }"
          @load="handleImageLoad"
        />
      </div>
      
      <!-- 图片说明文字 -->
      <figcaption v-if="caption || alt" class="image-caption">
        {{ caption || alt }}
      </figcaption>
    </figure>
    
    <!-- Lightbox 预览 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showLightbox" class="lightbox-overlay" @click="closeLightbox">
          <div class="lightbox-content" @click.stop>
            <img :src="src" :alt="alt" class="lightbox-image" />
            <button class="lightbox-close" @click="closeLightbox" aria-label="关闭">
              <Icon name="mdi:close" />
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
/**
 * ImageEnhanced 增强图片组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::image-enhanced{src="/img/photo.jpg" caption="这是图片说明" zoomable shadow rounded}
 * ::
 * 
 * 完整配置：
 * ::image-enhanced{src="/img/photo.jpg" alt="替代文本" caption="图片说明" width="600" align="center" shadow border rounded zoomable}
 * ::
 */

const props = defineProps({
  // 图片地址
  src: {
    type: String,
    required: true
  },
  // 替代文本
  alt: {
    type: String,
    default: ''
  },
  // 标题（悬停提示）
  title: {
    type: String,
    default: ''
  },
  // 图片说明文字
  caption: {
    type: String,
    default: ''
  },
  // 宽度（px 或百分比）
  width: {
    type: [String, Number],
    default: '100%'
  },
  // 高度
  height: {
    type: [String, Number],
    default: 'auto'
  },
  // 对齐方式: left | center | right
  align: {
    type: String,
    default: 'center',
    validator: (value) => ['left', 'center', 'right'].includes(value)
  },
  // 是否显示阴影
  shadow: {
    type: Boolean,
    default: false
  },
  // 是否显示边框
  border: {
    type: Boolean,
    default: false
  },
  // 是否圆角
  rounded: {
    type: Boolean,
    default: false
  },
  // 是否支持点击放大
  zoomable: {
    type: Boolean,
    default: true
  },
  // 是否懒加载
  lazy: {
    type: Boolean,
    default: true
  }
})

const showLightbox = ref(false)
const imageLoaded = ref(false)

const containerStyle = computed(() => {
  const width = typeof props.width === 'number' ? `${props.width}px` : props.width
  const height = typeof props.height === 'number' ? `${props.height}px` : props.height
  
  const style = {
    maxWidth: width
  }
  
  // 只在明确指定高度时才设置，否则让容器自适应图片高度
  if (height && height !== 'auto') {
    style.height = height
  }
  
  return style
})

const handleImageClick = () => {
  if (props.zoomable) {
    showLightbox.value = true
  }
}

const closeLightbox = () => {
  showLightbox.value = false
}

const handleImageLoad = () => {
  imageLoaded.value = true
}

// 监听 ESC 键关闭 Lightbox
onMounted(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape' && showLightbox.value) {
      closeLightbox()
    }
  }
  document.addEventListener('keydown', handleEscape)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
  })
})
</script>

<style scoped>
.image-enhanced-mdc {
  display: flex;
  width: 100%;
}

.align-left {
  justify-content: flex-start;
}

.align-center {
  justify-content: center;
}

.align-right {
  justify-content: flex-end;
}

.image-figure {
  margin: 0;
  display: inline-block;
  max-width: 100%;
}

.image-wrapper {
  position: relative;
  display: inline-block;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.image-wrapper:hover .zoom-hint {
  opacity: 1;
}

.enhanced-image {
  display: block;
  max-width: 100%;
  height: auto;
  transition: transform 0.3s ease;
}

.cursor-zoom-in {
  cursor: zoom-in;
}



.has-border .image-wrapper {
  border: 2px solid rgb(229 231 235);
}

:global(.dark) .has-border .image-wrapper {
  border-color: rgb(55 65 81);
}

.rounded .image-wrapper {
  border-radius: 0.5rem;
}

.rounded .enhanced-image {
  border-radius: 0.5rem;
}




.image-caption {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: rgb(107 114 128);
  text-align: center;
  font-style: italic;
}

:global(.dark) .image-caption {
  color: rgb(156 163 175);
}

/* Lightbox 样式 */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.lightbox-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  cursor: default;
}

.lightbox-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 0.5rem;
}

.lightbox-close {
  position: absolute;
  top: -3rem;
  right: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  transition: background 0.2s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

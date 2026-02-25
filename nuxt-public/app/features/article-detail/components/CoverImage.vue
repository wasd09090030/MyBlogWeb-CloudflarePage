<template>
  <div 
    v-if="hasCoverImage"
    class="w-full overflow-hidden relative"
    :style="coverContainerStyle"
  >
    <ImageLoadingPlaceholder :show="!imageLoaded" />
    <img
      :src="article.coverImage"
      :alt="article.title"
      class="w-full h-full object-cover" 
      @load="handleImageLoad"
      @error="handleImageError"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'

// 1. 设置最小宽高比为 1.5 (即 3:2，对应高宽比 2:3)
const containerAspectRatio = ref(1.5)

const props = defineProps({
  article: {
    type: Object,
    required: true
  }
})

const imageLoaded = ref(false)
const imageErrored = ref(false)
const coverContainerStyle = computed(() => ({
  aspectRatio: containerAspectRatio.value
}))
const hasCoverImage = computed(() => {
  const coverImage = props.article?.coverImage
  return Boolean(coverImage && coverImage !== 'null' && !imageErrored.value)
})

function handleImageLoad(event) {
  imageLoaded.value = true
  const target = event?.target
  const naturalWidth = target?.naturalWidth
  const naturalHeight = target?.naturalHeight
  if (!naturalWidth || !naturalHeight) return

  const imageRatio = naturalWidth / naturalHeight
  
  // 2. 核心修改：将最小值从 1 改为 1.5
  // 如果图片本身比 1.5 更宽（如 16:9），则保持原比例
  // 如果图片是正方形或竖图，则强制拉伸容器为 1.5 (3:2)
  containerAspectRatio.value = Math.max(imageRatio, 1.5)
}

function handleImageError() {
  imageErrored.value = true
  imageLoaded.value = true
}

watch(
  () => props.article?.coverImage,
  () => {
    imageLoaded.value = false
    imageErrored.value = false
    containerAspectRatio.value = 1.5
  },
  { immediate: true }
)
</script>

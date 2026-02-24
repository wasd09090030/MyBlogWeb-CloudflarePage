<template>
  <div 
    v-if="article.coverImage && article.coverImage !== 'null'"
    class="w-full overflow-hidden"
    :style="coverContainerStyle"
  >
    <img
      :src="article.coverImage"
      :alt="article.title"

      class="w-full h-full object-cover" 
      @load="handleImageLoad"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 1. 设置最小宽高比为 1.5 (即 3:2，对应高宽比 2:3)
const containerAspectRatio = ref(1.5)

defineProps({
  article: {
    type: Object,
    required: true
  }
})

const coverContainerStyle = computed(() => ({
  aspectRatio: containerAspectRatio.value
}))

function handleImageLoad(event) {
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
</script>
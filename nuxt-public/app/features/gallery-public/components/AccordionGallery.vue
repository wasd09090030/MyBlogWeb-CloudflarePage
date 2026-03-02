<template>
  <div class="accordion-fill">
    <div class="accordion-gallery">
      <div
        v-for="(gallery, index) in images"
        :key="`accordion-${gallery.id}-${index}`"
        class="accordion-item"
        :class="{ 'expanded': index === expandedIndex }"
        @click="toggleAccordion(index)"
        @dblclick="$emit('image-click', gallery)"
      >
        <template v-if="hasImage(gallery)">
          <img
            :src="gallery.thumbnailUrl || gallery.imageUrl"
            alt="画廊图片"
            class="accordion-image"
            loading="lazy"
            @error="handleImageError(gallery, $event)"
          />
        </template>
        <div v-else class="accordion-fallback">
          <Icon name="image" size="xl" />
        </div>
        <div class="overlay"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

defineEmits(['image-click'])

// 默认展开第一个
const expandedIndex = ref(0)
const imageErrorMap = ref({})

const getImageKey = (image) => String(image?.id ?? image?.imageUrl ?? '')
const hasImage = (image) => {
  const imageUrl = image?.thumbnailUrl || image?.imageUrl
  if (!imageUrl) return false
  return !imageErrorMap.value[getImageKey(image)]
}
const handleImageError = (image, event) => {
  const fallbackUrl = image?.imageUrl
  const target = event?.target
  if (fallbackUrl && target instanceof HTMLImageElement) {
    const currentSrc = target.getAttribute('src') || ''
    if (currentSrc !== fallbackUrl) {
      target.src = fallbackUrl
      return
    }
  }
  imageErrorMap.value[getImageKey(image)] = true
}

// 切换展开项
const toggleAccordion = (index) => {
  expandedIndex.value = index
}

watch(
  () => props.images.map(image => image?.id ?? image?.imageUrl),
  () => {
    imageErrorMap.value = {}
  },
  { immediate: true }
)
</script>

<style scoped>
.accordion-fill {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.accordion-gallery {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 10px;
}

.accordion-item {
  position: relative;
  flex: 1; /* 默认收缩状态 */
  height: 100%;
  border-radius: 15px;
  overflow: hidden;
  cursor: pointer;
  transition: flex 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  min-width: 0; /* 防止内容撑开 flex item */
}

.accordion-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.75);
  background: linear-gradient(140deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.4));
}

.accordion-item.expanded {
  flex: 2; /* 展开状态，比例 1:4 */
}

.accordion-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
  display: block; /* 消除图片底部间隙 */
}

.accordion-item:hover .accordion-image {
  transform: scale(1.05);
}

.accordion-item.expanded .accordion-image {
  transform: scale(1);
}

/* 遮罩层，增加未选中项的层次感 */
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  opacity: 1;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.accordion-item.expanded .overlay {
  opacity: 0;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .accordion-gallery {
    flex-direction: column;
  }
  
  .accordion-item.expanded {
    flex: 3;
  }
}


</style>

<template>
  <section class="gallery-section">
    <div class="accordion-container">
      <div class="accordion-gallery">
        <div
          v-for="(gallery, index) in images"
          :key="`accordion-${gallery.id}-${index}`"
          class="accordion-item"
          :class="{ 'expanded': index === expandedIndex }"
          @click="toggleAccordion(index)"
          @dblclick="$emit('image-click', gallery)"
        >
          <img
            :src="gallery.imageUrl"
            alt="画廊图片"
            class="accordion-image"
            loading="lazy"
          />
          <div class="overlay"></div>
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

// 默认展开第一个
const expandedIndex = ref(0)

// 切换展开项
const toggleAccordion = (index) => {
  expandedIndex.value = index
}
</script>

<style scoped>
.gallery-section {
  height: 80vh;
  margin-bottom: 4rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  box-sizing: border-box;
}

.accordion-container {
  width: 100%;
  height: 80vh; 
  min-height: 400px;
  border-radius: 15px;
  overflow: hidden; /* 确保内容不溢出 */
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

/* 暗色主题 */
:global(.dark-theme) .gallery-section {
  background: rgba(45, 55, 72, 0.8);
  color: #ffffff;
}
</style>

<template>
  <div class="initial-loading-overlay">
    <div class="loading-container">
      <n-spin size="large" :stroke="isDarkMode ? '#fff' : '#667eea'">
        <template #icon>
          <Icon name="images" size="2xl" />
        </template>
      </n-spin>
      
      <div class="loading-info">
        <p class="loading-text">正在加载画廊 {{ Math.round(loadingProgress) }}%</p>
        <n-progress 
          type="line" 
          :percentage="loadingProgress" 
          :show-indicator="false"
          :height="6"
          :border-radius="3"
        />
        <p class="loading-tip">图片未压缩，请注意流量...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { isDarkMode } = useTheme()

defineProps({
  loadingProgress: {
    type: Number,
    default: 0
  },
  previewImages: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.initial-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  transition: opacity 0.5s ease-out;
}

.initial-loading-overlay.fade-out {
  opacity: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
}

.loading-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 280px;
}

.loading-text {
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.loading-tip {
  font-size: 0.9rem;
  color: #666;
  margin: 0;
}

/* 暗色主题 */
:global(.dark-theme) .initial-loading-overlay {
  background: #18171d;
}

:global(.dark-theme) .loading-text {
  color: #e2e8f0;
}

:global(.dark-theme) .loading-tip {
  color: #a0aec0;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .loading-container {
    padding: 1rem;
  }

  .loading-info {
    min-width: 240px;
  }

  .loading-text {
    font-size: 1rem;
  }

  .loading-tip {
    font-size: 0.85rem;
  }
}
</style>

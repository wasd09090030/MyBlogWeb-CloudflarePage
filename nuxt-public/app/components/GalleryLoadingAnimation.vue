<template>
  <div class="initial-loading-overlay">
    <div class="loading-container">
      <div class="spinner-icon-wrapper">
        <Icon name="heroicons:photo" size="2xl" class="spinner-icon" />
      </div>

      <div class="loading-info">
        <p class="loading-text">正在加载画廊 {{ Math.round(loadingProgress) }}%</p>
        <UProgress
          :model-value="loadingProgress"
          :max="100"
          color="primary"
          size="md"
        />
        <p class="loading-tip">图片未压缩，请注意流量...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
// 主题色改由 CSS 变量 + :global(.dark) 选择器控制（见 .spinner-icon-wrapper）
// 不再依赖 useTheme() 的 isDarkMode 响应式切换

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

.spinner-icon-wrapper {
  /* 原 n-spin stroke 颜色（dark=白、light=#667eea）通过 CSS 变量按主题切换 */
  color: #667eea;
}

:global(.dark) .spinner-icon-wrapper {
  color: #ffffff;
}

.spinner-icon {
  display: block;
  animation: spinner-rotate 1.2s linear infinite;
}

@keyframes spinner-rotate {
  to { transform: rotate(360deg); }
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
:global(.dark) .initial-loading-overlay {
  background: #18171d;
}

:global(.dark) .loading-text {
  color: #e2e8f0;
}

:global(.dark) .loading-tip {
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

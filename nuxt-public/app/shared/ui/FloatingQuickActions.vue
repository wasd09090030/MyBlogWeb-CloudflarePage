<template>
  <div class="floating-quick-actions" aria-label="Quick actions">
    <button
      v-if="!isHomeRoute"
      type="button"
      class="floating-quick-actions__item"
      @click="$emit('go-home')"
      aria-label="回主页"
    >
      <Icon name="house" size="16" />
      <span class="floating-quick-actions__tip">主页</span>
    </button>

    <button
      type="button"
      class="floating-quick-actions__item"
      @click="$emit('scroll-top')"
      aria-label="回到顶部"
    >
      <Icon name="arrow-up" size="16" />
      <span class="floating-quick-actions__tip">顶部</span>
    </button>

    <button
      type="button"
      class="floating-quick-actions__item"
      @click="$emit('toggle-theme')"
      :aria-label="isDarkMode ? '切换到浅色模式' : '切换到深色模式'"
    >
      <Icon v-if="isHydrated" :name="isDarkMode ? 'sun-fill' : 'moon-fill'" size="16" :solid="true" />
      <Icon v-else name="moon-fill" size="16" :solid="true" />
      <span class="floating-quick-actions__tip">{{ isDarkMode ? '浅色' : '深色' }}</span>
    </button>

    <button
      type="button"
      class="floating-quick-actions__item"
      :class="{ 'floating-quick-actions__item--muted': !showBackgroundAnimation }"
      @click="$emit('toggle-background')"
      :aria-pressed="!showBackgroundAnimation"
      aria-label="背景动画开关"
    >
      <Icon name="sparkles" size="16" />
      <span class="floating-quick-actions__tip">背景</span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isHomeRoute: boolean
  isDarkMode: boolean
  isHydrated: boolean
  showBackgroundAnimation: boolean
}>()

defineEmits<{
  'go-home': []
  'scroll-top': []
  'toggle-theme': []
  'toggle-background': []
}>()
</script>

<style scoped>
.floating-quick-actions {
  position: fixed;
  right: 24px;
  bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 28px;
  
  /* Glassmorphism Effect */
  background: var(--glass-bg, rgba(255, 255, 255, 0.8));
  backdrop-filter: var(--backdrop-blur, blur(12px));
  -webkit-backdrop-filter: var(--backdrop-blur, blur(12px));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
  
  z-index: 1200;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-quick-actions:hover {
  border-color: var(--border-color-light, rgba(255, 255, 255, 0.4));
}

.floating-quick-actions__item {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.floating-quick-actions__item:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.05));
  color: var(--accent-primary, #0ea5e9);
  transform: translateY(-2px);
}

.floating-quick-actions__item:active {
  transform: translateY(0) scale(0.95);
}

.floating-quick-actions__item:focus-visible {
  outline: 2px solid var(--accent-primary, #0ea5e9);
  outline-offset: 2px;
}

/* Muted State (Background Animation Off) */
.floating-quick-actions__item--muted {
  color: var(--text-muted, #94a3b8);
  opacity: 0.8;
}

.floating-quick-actions__item--muted::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 2px;
  background: currentColor;
  border-radius: 99px;
  transform: rotate(-45deg);
}

/* Tooltips */
.floating-quick-actions__tip {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  padding: 6px 12px;
  border-radius: 8px;
  
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
  
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.floating-quick-actions__item:hover .floating-quick-actions__tip,
.floating-quick-actions__item:focus-visible .floating-quick-actions__tip {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* Responsive */
@media (max-width: 767px) {
  .floating-quick-actions {
    right: 16px;
    bottom: 24px;
    padding: 6px;
    gap: 6px;
    border-radius: 24px;
  }

  .floating-quick-actions__item {
    width: 36px;
    height: 36px;
  }
}
</style>

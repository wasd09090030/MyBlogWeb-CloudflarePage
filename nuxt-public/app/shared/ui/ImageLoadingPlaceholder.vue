<template>
  <div
    v-if="show"
    class="image-loading-overlay"
    :class="overlayClass"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel"
  >
    <img
      src="/Picture/loading.gif"
      :alt="alt"
      class="image-loading-gif"
      :class="imageClass"
      decoding="async"
    />
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: true
  },
  alt: {
    type: String,
    default: 'loading'
  },
  ariaLabel: {
    type: String,
    default: '图片加载中'
  },
  overlayClass: {
    type: [String, Array, Object],
    default: ''
  },
  imageClass: {
    type: [String, Array, Object],
    default: ''
  }
})
</script>

<style scoped>
.image-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 3;
  background: rgba(255, 255, 255, 0.66);
}

.image-loading-gif {
  display: block;
  height: 100%;
  width: auto;
  max-width: none;
  object-fit: contain;
  object-position: center;
}

:global(.dark-theme) .image-loading-overlay {
  background: rgba(15, 23, 42, 0.62);
}
</style>

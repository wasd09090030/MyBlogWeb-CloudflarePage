<template>
  <Transition name="image-origin-transition">
    <div
      v-if="active && originRect && src"
      class="image-origin-transition"
      aria-hidden="true"
      :style="originStyle"
    >
      <img :src="src" alt="">
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  active: { type: Boolean, default: false },
  src: { type: String, default: '' },
  originRect: { type: Object, default: null }
})

const originStyle = computed(() => {
  if (!props.originRect || typeof window === 'undefined') return {}

  const targetWidth = window.innerWidth * 0.9
  const targetHeight = window.innerHeight * 0.85
  return {
    left: `${props.originRect.left}px`,
    top: `${props.originRect.top}px`,
    width: `${props.originRect.width}px`,
    height: `${props.originRect.height}px`,
    '--origin-target-x': `${(window.innerWidth - targetWidth) / 2 - props.originRect.left}px`,
    '--origin-target-y': `${(window.innerHeight - targetHeight) / 2 - props.originRect.top}px`,
    '--origin-scale-x': targetWidth / props.originRect.width,
    '--origin-scale-y': targetHeight / props.originRect.height
  }
})
</script>

<style scoped>
.image-origin-transition {
  position: fixed;
  z-index: 100002;
  overflow: hidden;
  pointer-events: none;
  transform-origin: top left;
  animation: image-origin-push 340ms cubic-bezier(0.22, 0.8, 0.18, 1) both;
}

.image-origin-transition img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

@keyframes image-origin-push {
  to {
    opacity: 0;
    transform: translate(var(--origin-target-x), var(--origin-target-y)) scale(var(--origin-scale-x), var(--origin-scale-y));
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-origin-transition {
    display: none;
    animation: none;
  }
}
</style>

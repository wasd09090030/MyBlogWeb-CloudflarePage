<template>
  <StateLoading :message="text">
    <div class="loading-spinner" :class="sizeClass">
      <div class="spinner-container">
        <UProgress :indeterminate="true" animation="carousel" :size="progressSize" color="primary" />
        <p v-if="text" class="loading-text mt-3">{{ text }}</p>
      </div>
    </div>
  </StateLoading>
</template>

<script setup>
import StateLoading from '~/shared/ui/StateLoading.vue'

/**
 * 兼容组件（过渡期）：
 * - 推荐新代码直接使用 shared/ui/StateLoading。
 * - 计划移除条件：全仓库不再引用 LoadingSpinner。
 */
const props = defineProps({
  text: {
    type: String,
    default: '加载中...'
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})

const sizeClass = computed(() => `loading-spinner-${props.size}`)
// Nuxt UI Progress size 映射：small→xs, medium→md, large→xl
const progressSize = computed(() => {
  if (props.size === 'small') return 'xs'
  if (props.size === 'large') return 'xl'
  return 'md'
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.loading-spinner-small {
  padding: 0.5rem;
}

.loading-spinner-medium {
  padding: 1rem;
}

.loading-spinner-large {
  padding: 1.5rem;
}

.spinner-container {
  text-align: center;
}

.loading-text {
  font-size: 0.9rem;
  margin: 0;
}
</style>
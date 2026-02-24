<template>
  <div class="loading-overlay" role="status" aria-live="polite">
    <slot>
      <div class="state-loading-default">
        <n-spin size="large" />
        <p class="state-loading-text">{{ message }}</p>
      </div>
    </slot>
  </div>
</template>

<script setup>
/**
 * StateLoading 适用场景：
 * - 页面级/容器级异步加载态（首屏、筛选切换、分页切换）
 * - 需要统一“加载中”语义，但允许通过 slot 自定义视觉
 *
 * 不适用场景：
 * - 按钮内联 loading（应使用按钮自身 loading 属性）
 * - 极小局部骨架（应在业务组件内使用 n-skeleton）
 */
defineProps({
  message: {
    type: String,
    default: '加载中...'
  }
})
</script>

<style scoped>
.loading-overlay {
  width: 100%;
}

.state-loading-default {
  min-height: 12rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.75rem;
}

.state-loading-text {
  margin: 0;
}
</style>

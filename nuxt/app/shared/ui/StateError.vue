<template>
  <div class="error-overlay" role="alert">
    <slot>
      <div class="alert alert-danger text-center" role="alert">
        {{ message }}
      </div>
    </slot>
  </div>
</template>

<script setup>
/**
 * StateError 适用场景：
 * - 页面级/模块级请求失败提示
 * - 需要统一错误语义，并支持 slot 覆盖展示
 *
 * 不适用场景：
 * - 字段级校验（应交给表单校验系统）
 * - 需要复杂恢复流程的业务弹窗（应使用业务组件）
 */
defineProps({
  message: {
    type: String,
    default: '加载失败，请稍后重试'
  }
})
</script>

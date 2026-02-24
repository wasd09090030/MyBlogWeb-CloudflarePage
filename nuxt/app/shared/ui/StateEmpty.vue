<template>
  <div class="empty-state" role="status" aria-live="polite">
    <slot>
      <Icon :name="icon" size="3xl" class="text-muted mb-3" />
      <h3 class="text-muted">{{ title }}</h3>
      <p class="text-muted">{{ description }}</p>
    </slot>
  </div>
</template>

<script setup>
/**
 * StateEmpty 适用场景：
 * - 列表/详情无数据时的统一占位态
 * - 允许通过 props 快速设置图标与文案，或用 slot 自定义内容
 *
 * 不适用场景：
 * - 业务引导页（应使用专门引导组件）
 * - 需要复杂 CTA 组合的营销模块
 */
defineProps({
  icon: {
    type: String,
    default: 'images'
  },
  title: {
    type: String,
    default: '暂无数据'
  },
  description: {
    type: String,
    default: '当前没有可展示的内容'
  }
})
</script>

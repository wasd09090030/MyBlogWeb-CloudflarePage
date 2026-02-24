<template>
  <details 
    class="collapse-mdc my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    :open="defaultOpen"
  >
    <summary class="collapse-summary px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between">
      <span class="font-medium">
        <slot name="title">{{ title }}</slot>
      </span>
      <Icon name="chevron-down" class="collapse-icon transition-transform duration-200" size="md" />
    </summary>
    
    <div class="collapse-content px-4 py-3 bg-white dark:bg-gray-900">
      <slot />
    </div>
  </details>
</template>

<script setup>
/**
 * Collapse 折叠面板组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::collapse{title="点击展开更多内容" defaultOpen}
 * #title
 * 自定义标题（可选）
 * #default
 * 这里是折叠的内容
 * 可以包含任何 Markdown 元素
 * ::
 */

defineProps({
  title: {
    type: String,
    default: '点击展开'
  },
  defaultOpen: {
    type: Boolean,
    default: false
  }
})
</script>

<style scoped>
details[open] .collapse-icon {
  transform: rotate(180deg);
}

.collapse-content :deep(> *:first-child) {
  margin-top: 0;
}

.collapse-content :deep(> *:last-child) {
  margin-bottom: 0;
}

.collapse-summary::-webkit-details-marker {
  display: none;
}

.collapse-summary::marker {
  display: none;
}
</style>

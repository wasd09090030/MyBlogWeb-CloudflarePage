<template>
  <details 
    class="collapse-mdc my-4 overflow-hidden"
    :open="defaultOpen"
  >
    <summary class="collapse-summary px-4 py-3 cursor-pointer select-none transition-colors flex items-center justify-between gap-3">
      <span class="collapse-title min-w-0 font-medium">
        <slot name="title">{{ title }}</slot>
      </span>
      <span class="collapse-toggle" aria-hidden="true">
        <Icon name="heroicons:chevron-down" class="collapse-icon transition-transform duration-200" size="sm" />
      </span>
    </summary>
    
    <div class="collapse-content px-4 py-3">
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

/* 圆形描边箭头：在触屏和未悬停时也明确表达“这里可以点”。 */
.collapse-toggle {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid var(--article-prose-border);
  border-radius: 9999px;
  background: var(--article-prose-card);
  color: var(--article-prose-accent);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 120ms ease;
}

.collapse-toggle .collapse-icon {
  color: inherit;
}

.collapse-summary:hover .collapse-toggle,
.collapse-mdc[open] .collapse-toggle {
  border-color: var(--article-prose-accent);
  background: var(--article-prose-accent);
  color: var(--text-on-accent, #fff);
}

.collapse-summary:active .collapse-toggle {
  transform: scale(0.94);
}

/* 展开后明确分出“头 / 身”，避免内容直接贴在标题行下方。 */
.collapse-mdc[open] > .collapse-summary {
  border-bottom: 1px solid var(--article-prose-border);
}

@media (prefers-reduced-motion: reduce) {
  .collapse-toggle,
  .collapse-icon {
    transition: none;
  }
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

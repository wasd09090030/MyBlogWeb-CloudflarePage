<template>
  <div class="link-card-wrapper">
    <UButton
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      color="primary"
      variant="ghost"
      class="link-card-button"
    >
      <Icon :name="icon" size="24px" class="shrink-0" />
      <span class="link-text">{{ text }}</span>
    </UButton>
  </div>
</template>

<script setup>
/**
 * LinkCard 链接分享组件 - MDC 语法
 *
 * 在 Markdown 中使用：
 * ::link-card{url="https://example.com" text="查看示例网站"}
 * ::
 *
 * Props:
 * - url: 链接地址（必需）
 * - text: 显示文本（必需）
 * - icon: 图标名称（可选，默认 fa6-solid:cloud-arrow-down）
 */

defineProps({
  url: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: 'fa6-solid:cloud-arrow-down'
  }
})
</script>

<style scoped>
.link-card-wrapper {
  display: block;
  margin: 1rem 0;
}

.link-card-button {
  min-height: 60px;
  width: 100%;
  justify-content: flex-start;
  gap: 0.75rem;
  padding-inline: 1rem;
  white-space: normal;
  background: var(--article-prose-card);
  color: var(--article-prose-accent);
  border-radius: var(--article-prose-radius);
  text-decoration: none;
  transition: background-color 0.2s ease;
}

.link-card-button:hover {
  background: var(--article-prose-hover);
}

.link-text {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: start;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--article-prose-heading);
}
</style>

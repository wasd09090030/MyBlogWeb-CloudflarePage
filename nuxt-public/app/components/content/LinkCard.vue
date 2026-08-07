<template>
  <div class="link-card-wrapper">
    <UButton
      :href="url"
      target="_blank"
      rel="noopener noreferrer"
      color="info"
      variant="solid"
      class="link-card-button"
    >
      <Icon name="heroicons:cloud-arrow-down" size="36px" class="text-white" />
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
  display: inline-block;
  margin: 1rem 0;
}

.link-card-button {
  /* 2:5 aspect ratio (Height:Width) */
  /* Setting explicit dimensions to ensure it's not a thin strip */
  height: 60px;
  width: 160px;
  padding-inline: 1rem;

  /* Styling */
  border-radius: 0.375rem;
  transition: transform 0.2s ease;
}

.link-card-button:hover {
  transform: translateY(-2px);
}

.link-text {
  font-size: 1.1rem; /* Slightly larger */
  font-weight: 600;  /* Slightly bold (semi-bold) */
  color: white;      /* White text */
}
</style>

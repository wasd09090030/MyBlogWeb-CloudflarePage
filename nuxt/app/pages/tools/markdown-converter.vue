<template>
  <div class="markdown-converter-page">
    <div class="page-header">
      <n-breadcrumb>
        <n-breadcrumb-item @click="$router.push('/tools')">
          <Icon name="puzzle-piece" size="sm" class="me-1" />
          工具箱
        </n-breadcrumb-item>
        <n-breadcrumb-item>Markdown 转换器</n-breadcrumb-item>
      </n-breadcrumb>
      <h1 class="page-title">
        <Icon name="document-text" size="lg" class="me-2" />
        Markdown 转换器
      </h1>
      <p class="page-description">将 Markdown 文档转换为 PDF 或 DOCX 格式</p>
    </div>

    <MarkdownConverter />
  </div>
</template>

<script setup>
definePageMeta({
  ssr: false
})

// SEO 优化
useHead({
  title: 'Markdown 转换器 - 工具箱',
  meta: [
    { name: 'description', content: '在线将 Markdown 转换为 PDF 或 DOCX 格式，支持代码高亮、表格和数学公式' }
  ]
})
</script>

<style scoped>
.markdown-converter-page {
  padding: 2rem 0;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header :deep(.n-breadcrumb-item__link) {
  cursor: pointer;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 1rem 0 0.5rem;
  display: flex;
  align-items: center;
}

.page-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
}
</style>

<template>
  <div class="image-processor-page">
    <div class="page-header">
      <n-breadcrumb>
        <n-breadcrumb-item @click="navigateTo('/')">首页</n-breadcrumb-item>
        <n-breadcrumb-item @click="navigateTo('/tools')">工具箱</n-breadcrumb-item>
        <n-breadcrumb-item>图像处理</n-breadcrumb-item>
      </n-breadcrumb>

      <h1 class="page-title">
        <Icon name="photo" size="lg" class="me-2" />
        图像处理工具
      </h1>
      <p class="page-description">格式转换、压缩 - 本地处理，隐私安全</p>
    </div>

    <ImageProcessor />
  </div>
</template>

<script setup>
definePageMeta({
  ssr: false
})

useHead({
  title: '图像处理工具 - 格式转换/压缩',
  meta: [
    { name: 'description', content: '在线图像处理工具，支持格式转换（PNG/JPG/WebP/AVIF）、压缩。所有处理在浏览器本地完成，保护您的隐私。' },
    { name: 'keywords', content: '图片转换,图片压缩,WebP转换,在线图片处理,隐私安全' }
  ]
})
</script>

<style scoped>
.image-processor-page {
  padding: 2rem 0;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
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

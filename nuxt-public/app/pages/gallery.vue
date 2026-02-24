<template>
  <GalleryPageContainer />
</template>

<script setup>
import GalleryPageContainer from '~/features/gallery-public/containers/GalleryPageContainer.vue'

// 设置页面元数据
useHead({
  title: '图片画廊',
  meta: [
    {
      name: 'description',
      content: '高性能、支持 SSR 的图片画廊'
    }
  ]
})
</script>

<template>
  <ArchivePageContainer />
</template>

<script setup>
import ArchivePageContainer from '~/features/archive/containers/ArchivePageContainer.vue'

definePageMeta({
  name: 'archive',
  keepalive: true,
  key: () => 'archive-page',
  layout: 'default'
})

defineOptions({
  name: 'ArchivePage'
})

useHead({
  title: '文章归档 - 按标签与时间线浏览',
  meta: [
    { name: 'description', content: '按标签云和月份时间线浏览全部文章，快速定位感兴趣的内容。' },
    { name: 'keywords', content: '文章归档,标签云,时间线,博客归档' }
  ]
})
</script>

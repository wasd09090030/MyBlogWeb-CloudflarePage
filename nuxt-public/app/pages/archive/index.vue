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
  title: '文章归档 - 杂志风时间线',
  meta: [
    { name: 'description', content: '以杂志风时间线与标签云浏览全部文章，快速定位感兴趣的内容。' },
    { name: 'keywords', content: '文章归档,杂志风,时间线,标签云,博客归档' }
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Noto+Serif+SC:wght@400;600;900&family=Inter:wght@400;500;600&display=swap' }
  ]
})
</script>

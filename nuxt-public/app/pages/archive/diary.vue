<template>
  <DiaryPageContainer />
</template>

<script setup>
import DiaryPageContainer from '~/features/diary/containers/DiaryPageContainer.vue'

definePageMeta({
  name: 'archive-diary',
  keepalive: true,
  key: () => 'archive-diary-page',
  layout: 'default'
})

defineOptions({
  name: 'ArchiveDiaryPage'
})

useHead({
  title: '每日日记 - 碎碎念',
  meta: [
    { name: 'description', content: '记录每一天的生活碎碎念，可按年份与月份筛选。' },
    { name: 'keywords', content: '每日日记,碎碎念,生活记录,日记归档' }
  ]
})
</script>

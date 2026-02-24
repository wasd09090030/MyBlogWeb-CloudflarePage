<template>
  <TutorialsPageContainer />
</template>

<script setup>
import TutorialsPageContainer from '~/features/tutorials/containers/TutorialsPageContainer.vue'

definePageMeta({
  name: 'tutorials',
  keepalive: true,
  key: () => 'tutorials-page',
  layout: 'default'
})

defineOptions({
  name: 'TutorialsPage'
})

useHead({
  title: '教程专栏 - 系统化学习资源',
  meta: [
    { name: 'description', content: '精心编排的开发教程，涵盖前端、后端、设计等多个领域，助你系统化掌握核心技术。' },
    { name: 'keywords', content: '编程教程,Web开发,Vue3,Nuxt,设计系统,UI/UX' }
  ]
})
</script>

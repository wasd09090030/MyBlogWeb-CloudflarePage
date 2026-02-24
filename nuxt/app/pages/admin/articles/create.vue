<template>
  <ArticleEditorPage />
</template>

<script setup>
import ArticleEditorPage from './[id].vue'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})
</script>

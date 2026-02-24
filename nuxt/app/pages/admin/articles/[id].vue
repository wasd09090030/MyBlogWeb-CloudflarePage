<template>
  <AdminArticleEditorContainer />
</template>

<script setup>
import AdminArticleEditorContainer from '~/features/article-admin/containers/AdminArticleEditorContainer.vue'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})
</script>

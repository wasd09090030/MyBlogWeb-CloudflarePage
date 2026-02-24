<template>
  <AdminGalleryPageContainer />
</template>

<script setup>
import AdminGalleryPageContainer from '~/features/gallery-admin/containers/AdminGalleryPageContainer.vue'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})
</script>

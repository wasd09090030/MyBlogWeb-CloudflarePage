<template>
  <div v-if="totalPages > 1" class="pagination-container mt-4">
    <div class="d-flex justify-content-center">
      <n-pagination
        :page="currentPage"
        :page-count="totalPages"
        :page-slot="7"
        @update:page="$emit('update:page', $event)"
      />
    </div>

    <div class="text-center text-muted mt-3">
      共 {{ totalCount }} 篇文章，当前 {{ currentPage }} / {{ totalPages }} 页
    </div>
  </div>
</template>

<script setup>
defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  totalCount: {
    type: Number,
    required: true
  }
})

defineEmits(['update:page'])
</script>
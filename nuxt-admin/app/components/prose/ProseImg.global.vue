<script setup lang="ts">
const props = defineProps<{
  src?: string
  alt?: string
  title?: string
  width?: string | number
  height?: string | number
}>()

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>

<template>
  <figure class="my-5">
    <img
      v-if="props.src && !failed"
      :src="props.src"
      :alt="props.alt || ''"
      :title="props.title"
      :width="props.width"
      :height="props.height"
      class="max-w-full rounded-md border border-default object-contain"
      loading="lazy"
      decoding="async"
      @error="failed = true"
    >
    <figcaption v-if="failed" class="text-sm text-error">Image preview could not be loaded.</figcaption>
    <figcaption v-else-if="props.title || props.alt" class="mt-2 text-sm text-muted">{{ props.title || props.alt }}</figcaption>
  </figure>
</template>

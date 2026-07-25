<script setup lang="ts">
const props = withDefaults(defineProps<{
  src?: string
  alt?: string
  title?: string
  caption?: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  shadow?: boolean
  border?: boolean
  rounded?: boolean
  zoomable?: boolean
  lazy?: boolean
}>(), {
  alt: '',
  caption: '',
  width: '100%',
  align: 'center',
  zoomable: true,
  lazy: true
})

const failed = ref(false)
const previewOpen = ref(false)
const width = computed(() => typeof props.width === 'number' ? `${props.width}px` : props.width)
watch(() => props.src, () => { failed.value = false; previewOpen.value = false })
</script>

<template>
  <figure class="my-6 flex" :class="{ 'justify-start': align === 'left', 'justify-center': align === 'center', 'justify-end': align === 'right' }">
    <div class="max-w-full" :style="{ maxWidth: width }">
      <button v-if="src && !failed" type="button" class="block max-w-full overflow-hidden text-left" :class="{ 'cursor-zoom-in': zoomable, 'rounded-lg': rounded, 'border border-default': border, 'shadow-lg': shadow }" :disabled="!zoomable" @click="previewOpen = zoomable">
        <img :src="src" :alt="alt" :title="title" :loading="lazy ? 'lazy' : 'eager'" class="block max-w-full" :class="{ 'rounded-lg': rounded }" @error="failed = true">
      </button>
      <p v-else class="text-sm text-error">Image preview could not be loaded.</p>
      <figcaption v-if="caption || alt" class="mt-2 text-center text-sm text-muted">{{ caption || alt }}</figcaption>
    </div>
    <UModal v-model:open="previewOpen" :title="caption || alt || 'Image preview'">
      <template #body><img :src="src" :alt="alt" class="max-h-[75vh] w-full object-contain"></template>
    </UModal>
  </figure>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ type?: string }>(), { type: 'info' })
const tone = computed(() => ({ success: 'var(--article-prose-success)', warning: 'var(--article-prose-warning)', error: 'var(--article-prose-error)' })[props.type] || 'var(--article-prose-accent)')
</script>

<template>
  <section class="alert-mdc my-5 p-4" :style="{ '--mdc-tone': tone }"><h4 v-if="$slots.title" class="mb-1 text-base font-semibold"><slot name="title" /></h4><slot /></section>
</template>

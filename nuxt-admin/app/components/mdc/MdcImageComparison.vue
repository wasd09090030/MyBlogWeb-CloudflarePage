<script setup lang="ts">
const props = withDefaults(defineProps<{
  before?: string
  after?: string
  aspectRatio?: string
  beforeLabel?: string
  afterLabel?: string
}>(), { aspectRatio: '16/9', beforeLabel: 'Before', afterLabel: 'After' })
</script>

<template>
  <div class="image-comparison-mdc my-6 grid gap-3 sm:grid-cols-2">
    <figure><img v-if="before" :src="before" :alt="beforeLabel" class="w-full rounded-md border border-default object-cover" :style="{ aspectRatio }"><figcaption class="mt-1 text-center text-sm text-muted">{{ beforeLabel }}</figcaption></figure>
    <figure><img v-if="after" :src="after" :alt="afterLabel" class="w-full rounded-md border border-default object-cover" :style="{ aspectRatio }"><figcaption class="mt-1 text-center text-sm text-muted">{{ afterLabel }}</figcaption></figure>
  </div>
</template>

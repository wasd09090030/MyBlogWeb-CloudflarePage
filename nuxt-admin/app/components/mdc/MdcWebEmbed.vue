<script setup lang="ts">
const props = withDefaults(defineProps<{ url?: string, title?: string, caption?: string, aspectRatio?: string, allowFullscreen?: boolean }>(), { title: 'Embedded content', aspectRatio: '16/9', allowFullscreen: true })
const safeUrl = computed(() => { try { const url = new URL(props.url || ''); return ['http:', 'https:'].includes(url.protocol) ? url.href : '' } catch { return '' } })
</script>

<template>
  <figure class="my-5"><div class="overflow-hidden rounded-md border border-default bg-muted" :style="{ aspectRatio }"><iframe v-if="safeUrl" :src="safeUrl" :title="title" class="size-full" sandbox="allow-scripts allow-same-origin allow-popups" referrerpolicy="strict-origin-when-cross-origin" :allowfullscreen="allowFullscreen" /><div v-else class="flex size-full items-center justify-center text-sm text-muted">Invalid embed URL</div></div><figcaption v-if="caption" class="mt-2 text-center text-sm text-muted">{{ caption }}</figcaption></figure>
</template>

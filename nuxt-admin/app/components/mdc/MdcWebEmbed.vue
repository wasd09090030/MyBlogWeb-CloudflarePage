<script setup lang="ts">
const props = withDefaults(defineProps<{ url?: string, title?: string, caption?: string, aspectRatio?: string, allowFullscreen?: boolean }>(), { title: 'Embedded content', aspectRatio: '16/9', allowFullscreen: true })
const allowedEmbedHosts = ['bilibili.com', 'youtube.com', 'youtu.be', 'codepen.io', 'codesandbox.io', 'stackblitz.com']
const safeUrl = computed(() => {
  try {
    const url = new URL(props.url || '')
    const hostname = url.hostname.toLowerCase()
    const allowed = allowedEmbedHosts.some(host => hostname === host || hostname.endsWith(`.${host}`))
    return ['http:', 'https:'].includes(url.protocol) && allowed ? url.href : ''
  } catch {
    return ''
  }
})
</script>

<template>
  <figure class="web-embed-mdc my-5"><div class="embed-container overflow-hidden border border-default bg-muted" :style="{ aspectRatio }"><iframe v-if="safeUrl" :src="safeUrl" :title="title" class="size-full" loading="lazy" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" referrerpolicy="strict-origin-when-cross-origin" :allowfullscreen="allowFullscreen" /><div v-else class="flex size-full items-center justify-center text-sm text-muted">Invalid embed URL</div></div><figcaption v-if="caption" class="mt-2 text-center text-sm text-muted">{{ caption }}</figcaption></figure>
</template>

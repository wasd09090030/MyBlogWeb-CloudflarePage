<script setup lang="ts">
const props = withDefaults(defineProps<{ lang?: string, title?: string, runnable?: boolean }>(), { lang: 'text', title: 'Code example', runnable: false })
const copied = ref(false)
const slots = useSlots()
async function copyCode() { const text = slots.default?.().map(node => node.children).join('') || ''; await navigator.clipboard?.writeText(text); copied.value = true; setTimeout(() => { copied.value = false }, 1500) }
</script>

<template>
  <UCard class="code-playground-mdc my-5"><template #header><div class="flex items-center justify-between gap-3"><span class="font-medium">{{ title }}</span><div class="flex items-center gap-2"><UBadge color="neutral" variant="subtle">{{ lang }}</UBadge><UButton size="xs" color="neutral" variant="ghost" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" :aria-label="copied ? 'Copied' : 'Copy code'" @click="copyCode" /></div></div></template><pre class="overflow-x-auto text-sm"><code><slot /></code></pre></UCard>
</template>

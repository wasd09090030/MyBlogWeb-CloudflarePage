<script setup lang="ts">
defineProps<{ title?: string, name?: string, url?: string, href?: string, description?: string, desc?: string, text?: string, repo?: string }>()
</script>

<template>
  <section class="my-5 rounded-md border border-default bg-elevated p-4">
    <a v-if="url || href" :href="url || href" target="_blank" rel="noopener noreferrer" class="font-medium text-primary hover:underline">{{ title || name || text || url || href }}</a>
    <p v-else-if="title || name || repo || text" class="font-medium">{{ title || name || repo || text }}</p>
    <p v-if="description || desc" class="mt-1 text-sm text-muted">{{ description || desc }}</p>
    <div v-if="$slots.default" class="mt-3"><slot /></div>
  </section>
</template>

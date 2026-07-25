<script setup lang="ts">
withDefaults(defineProps<{ title?: string, defaultOpen?: boolean }>(), { title: 'More content', defaultOpen: false })
</script>

<template>
  <details class="my-5 rounded-md border border-default bg-elevated" :open="defaultOpen">
    <summary class="cursor-pointer px-4 py-3 font-medium"><span>{{ title }}</span></summary>
    <div class="border-t border-default px-4 py-3"><slot /></div>
  </details>
</template>

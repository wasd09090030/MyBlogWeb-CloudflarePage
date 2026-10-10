<script setup lang="ts">
withDefaults(defineProps<{ title?: string, defaultOpen?: boolean }>(), { title: 'More content', defaultOpen: false })
</script>

<template>
  <details class="collapse-mdc my-5 rounded-md border border-default bg-elevated" :open="defaultOpen">
    <summary class="collapse-summary cursor-pointer px-4 py-3 font-medium"><span><slot name="title">{{ title }}</slot></span></summary>
    <div class="collapse-content border-t border-default px-4 py-3"><slot /></div>
  </details>
</template>

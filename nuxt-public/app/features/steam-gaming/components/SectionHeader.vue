<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  meta?: string
}>()
</script>

<template>
  <div class="sg-sec">
    <span class="sg-icon-chip"><Icon :name="icon" size="15" /></span>
    <h2 class="sg-sec__title">{{ title }}</h2>
    <span v-if="meta" class="sg-sec__meta">{{ meta }}</span>
  </div>
</template>

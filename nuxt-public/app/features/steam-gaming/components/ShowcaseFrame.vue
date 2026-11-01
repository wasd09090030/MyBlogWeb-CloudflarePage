<script setup lang="ts">
import SectionHeader from './SectionHeader.vue'
import GameCover from '../components/GameCover.vue'

const props = defineProps<{
  title: string
  icon: string
  meta?: string
  span?: number
}>()

const spanClass = computed(() => {
  switch (props.span) {
    case 4: return 'sg-card--narrow'
    case 5: return 'sg-card--side'
    case 7: return 'sg-card--hero'
    case 8: return 'sg-card--wide'
    case 12: return 'sg-card--full'
    default: return ''
  }
})
</script>

<template>
  <section class="sg-card" :class="spanClass">
    <SectionHeader :icon="icon" :title="title" :meta="meta" />
    <slot />
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ rating?: number | string, maxStars?: number | string, label?: string, showScore?: boolean }>(), { rating: 0, maxStars: 5, label: '', showScore: true })
const rating = computed(() => Math.max(0, Math.min(Number(props.rating) || 0, Number(props.maxStars) || 5)))
const maxStars = computed(() => Math.max(1, Math.min(10, Number(props.maxStars) || 5)))
</script>

<template>
  <div class="star-rating-mdc my-5 flex flex-wrap items-center gap-2"><span v-if="label" class="text-sm font-medium">{{ label }}</span><div class="flex text-warning" :aria-label="`Rating ${rating} of ${maxStars}`"><UIcon v-for="index in maxStars" :key="index" :name="index <= Math.round(rating) ? 'i-lucide-star' : 'i-lucide-star'" :class="index <= Math.round(rating) ? 'fill-current' : 'text-muted'" /></div><span v-if="showScore" class="text-sm text-muted">{{ rating.toFixed(1) }} / {{ maxStars }}</span></div>
</template>

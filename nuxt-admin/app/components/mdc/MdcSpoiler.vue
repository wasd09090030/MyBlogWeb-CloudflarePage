<script setup lang="ts">
const props = withDefaults(defineProps<{ label?: string, clickText?: string, open?: boolean }>(), { label: 'Spoiler warning', clickText: 'Click to reveal', open: false })
const revealed = ref(props.open)
</script>

<template>
  <section class="spoiler-mdc my-5 overflow-hidden rounded-md border border-warning/40 bg-warning/5">
    <button type="button" class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-medium" :aria-expanded="revealed" @click="revealed = !revealed"><span>{{ label }}</span><span class="text-sm text-muted">{{ revealed ? 'Hide' : clickText }}</span></button>
    <div v-show="revealed" class="border-t border-warning/30 px-4 py-3"><slot /></div>
  </section>
</template>

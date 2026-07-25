<template>
  <section class="rounded-lg border border-default/70 bg-default/80 shadow-sm shadow-black/[0.03] dark:bg-elevated/70">
    <div v-if="$slots.header || title" class="flex min-w-0 items-center justify-between gap-3 border-b border-default/70 px-4 py-3">
      <div class="min-w-0">
        <h2 v-if="title" class="truncate text-sm font-semibold text-highlighted">
          {{ title }}
        </h2>
        <p v-if="description" class="mt-0.5 text-xs text-muted">
          {{ description }}
        </p>
        <slot name="header" />
      </div>
      <slot name="actions" />
    </div>
    <div :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  description?: string
  padded?: boolean
}>(), {
  padded: true
})

const bodyClass = computed(() => props.padded ? 'p-4' : 'p-0')
</script>

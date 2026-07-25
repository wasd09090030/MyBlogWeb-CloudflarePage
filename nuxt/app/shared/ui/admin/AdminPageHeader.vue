<template>
  <header class="flex min-w-0 flex-col gap-3 border-b border-default/70 pb-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0 space-y-1">
      <p v-if="eyebrow" class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
        {{ eyebrow }}
      </p>
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <h1 class="truncate font-display text-xl font-semibold tracking-normal text-highlighted sm:text-2xl">
          {{ title }}
        </h1>
        <slot name="badge" />
      </div>
      <p v-if="description" class="max-w-2xl text-sm leading-5 text-muted">
        {{ description }}
      </p>
      <p v-if="meta" class="text-xs font-mono text-muted">
        {{ meta }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
  meta?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-2 rounded-lg border border-default/70 bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <slot />
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

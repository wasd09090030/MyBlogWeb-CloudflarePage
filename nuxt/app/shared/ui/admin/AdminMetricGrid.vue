<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <component
      :is="item.to ? 'NuxtLink' : 'div'"
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="flex min-h-[5.75rem] min-w-0 flex-col justify-between rounded-lg border border-default/70 bg-default/80 p-3 shadow-sm shadow-black/[0.03] transition-colors dark:bg-elevated/70"
      :class="item.to ? 'hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : ''"
    >
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs font-medium text-muted">{{ item.label }}</span>
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="size-4 shrink-0"
          :class="colorClass(item.color)"
        />
      </div>
      <div>
        <p class="font-mono text-2xl font-semibold tabular-nums text-highlighted">
          {{ item.value }}
        </p>
        <p v-if="item.hint" class="mt-1 text-xs text-muted">{{ item.hint }}</p>
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
type AdminMetricItem = {
  label: string
  value: string | number
  hint?: string
  icon?: string
  to?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

defineProps<{ items: AdminMetricItem[] }>()

const colorClass = (color: AdminMetricItem['color']) => ({
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  neutral: 'text-muted'
}[color || 'neutral'])
</script>

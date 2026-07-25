<template>
  <div class="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
    <UIcon
      :name="resolvedIcon"
      class="mb-3 size-6 text-muted"
      :class="type === 'loading' ? 'animate-spin' : ''"
    />
    <p class="text-sm font-medium text-highlighted">{{ resolvedTitle }}</p>
    <p v-if="description" class="mt-1 max-w-md text-sm text-muted">{{ description }}</p>
    <div v-if="$slots.actions" class="mt-4 flex flex-wrap justify-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  type: 'loading' | 'empty' | 'error'
  title?: string
  description?: string
  icon?: string
}>()

const resolvedIcon = computed(() => props.icon || {
  loading: 'i-lucide-loader-circle',
  empty: 'i-lucide-inbox',
  error: 'i-lucide-circle-alert'
}[props.type])

const resolvedTitle = computed(() => props.title || {
  loading: 'Loading',
  empty: 'Nothing here yet',
  error: 'Unable to load this view'
}[props.type])
</script>

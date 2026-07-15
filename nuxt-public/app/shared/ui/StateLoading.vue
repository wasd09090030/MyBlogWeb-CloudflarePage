<template>
  <div class="w-full" role="status" aria-live="polite">
    <slot v-if="hasDefaultSlot" />

    <UCard
      v-else
      variant="soft"
      class="border-0 shadow-none"
      :ui="{ body: 'min-h-48 flex flex-col items-center justify-center gap-3 text-center' }"
    >
      <UProgress class="w-full max-w-xs" animation="carousel" size="lg" color="primary" />
      <p v-if="message" class="m-0 text-sm text-muted">
        {{ message }}
      </p>
    </UCard>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: '加载中...'
  }
})

const slots = useSlots()
const hasDefaultSlot = computed(() => Boolean(slots.default))
</script>

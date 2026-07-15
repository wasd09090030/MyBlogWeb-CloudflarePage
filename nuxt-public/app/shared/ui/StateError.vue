<template>
  <div class="w-full" role="alert">
    <slot v-if="hasDefaultSlot" />

    <UAlert
      v-else
      color="error"
      variant="soft"
      :icon="icon"
      :title="title"
      :description="message"
    />
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '加载失败'
  },
  message: {
    type: String,
    default: '加载失败，请稍后重试'
  },
  icon: {
    type: String,
    default: 'heroicons:exclamation-triangle'
  }
})

const slots = useSlots()
const hasDefaultSlot = computed(() => Boolean(slots.default))
</script>

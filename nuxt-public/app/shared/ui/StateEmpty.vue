<template>
  <div class="w-full" role="status" aria-live="polite">
    <slot v-if="hasDefaultSlot" />

    <UEmpty
      v-else
      :icon="icon"
      :title="title || undefined"
      :description="description"
      :actions="normalizedActions"
      variant="naked"
      size="lg"
      :ui="{
        root: 'py-6',
        actions: 'mt-4 flex flex-wrap justify-center gap-2'
      }"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  icon: {
    type: String,
    default: 'heroicons:photo'
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: '暂无数据'
  },
  actions: {
    type: Array,
    default: () => []
    // 每项形如：{ label: string, onClick: () => void, color?: string, variant?: string }
  }
})

const slots = useSlots()
const hasDefaultSlot = computed(() => Boolean(slots.default))

const normalizedActions = computed(() => props.actions.map(action => ({
  color: action.color || 'primary',
  variant: action.variant || 'solid',
  ...action
})))
</script>

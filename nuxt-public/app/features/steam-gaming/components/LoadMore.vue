<script setup lang="ts">
const props = withDefaults(defineProps<{
  shown: number
  total: number
  loading?: boolean
  /** 每次追加的条数，用于提示文案。 */
  step?: number
}>(), {
  loading: false,
  step: 24
})

const emit = defineEmits<{ load: [] }>()

const remaining = computed(() => Math.max(0, props.total - props.shown))
const nextSize = computed(() => Math.min(props.step, remaining.value))
</script>

<template>
  <div v-if="total > 0" class="sg-load">
    <p class="sg-load__hint">已显示 {{ shown }} / {{ total }}</p>
    <button
      v-if="remaining > 0"
      type="button"
      class="sg-load__btn"
      :disabled="loading"
      @click="emit('load')"
    >
      {{ loading ? '加载中…' : `再加载 ${nextSize} 条` }}
    </button>
  </div>
</template>

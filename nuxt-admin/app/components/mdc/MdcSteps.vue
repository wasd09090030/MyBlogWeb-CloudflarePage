<script setup lang="ts">
type Step = { title?: string, description?: string }
const props = withDefaults(defineProps<{ steps?: Step[], current?: number | string, showControls?: boolean }>(), { steps: () => [], current: 1, showControls: false })
const active = ref(Math.max(1, Number(props.current) || 1))
const steps = computed(() => props.steps.length ? props.steps : [{ title: 'First step' }, { title: 'Second step' }])
watch(() => props.current, value => { active.value = Math.max(1, Number(value) || 1) })
</script>

<template>
  <section class="my-5 rounded-md border border-default bg-elevated p-4">
    <ol class="space-y-3">
      <li v-for="(step, index) in steps" :key="index" class="flex gap-3" :class="{ 'text-primary': index + 1 === active, 'text-muted': index + 1 > active }"><span class="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">{{ index + 1 }}</span><div><p class="font-medium">{{ step.title || `Step ${index + 1}` }}</p><p v-if="step.description" class="text-sm text-muted">{{ step.description }}</p></div></li>
    </ol>
    <div v-if="showControls" class="mt-4 flex justify-end gap-2"><UButton size="xs" color="neutral" variant="soft" :disabled="active <= 1" @click="active--">Previous</UButton><UButton size="xs" :disabled="active >= steps.length" @click="active++">Next</UButton></div>
  </section>
</template>

<script setup lang="ts">
import { getCurrentInstance } from 'vue'

const props = withDefaults(defineProps<{ labels?: string[] }>(), { labels: () => ['First', 'Second'] })
const active = ref(0)
const labels = computed(() => props.labels.length ? props.labels : ['First'])
const tabsId = `mdc-tabs-${getCurrentInstance()?.uid ?? 0}`

const tabId = (index: number) => `${tabsId}-tab-${index}`
const panelId = (index: number) => `${tabsId}-panel-${index}`

const handleTabKeydown = (event: KeyboardEvent, index: number) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || labels.value.length === 0) return

  event.preventDefault()

  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? labels.value.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + labels.value.length) % labels.value.length

  active.value = nextIndex
  nextTick(() => document.getElementById(tabId(nextIndex))?.focus())
}
</script>

<template>
  <section class="tabs-mdc my-5">
    <div class="tabs-header border-b" role="tablist">
      <button v-for="(label, index) in labels" :id="tabId(index)" :key="label" type="button" class="tab-btn border-b-2 font-medium" role="tab" :aria-selected="active === index" :aria-controls="panelId(index)" :tabindex="active === index ? 0 : -1" @click="active = index" @keydown="handleTabKeydown($event, index)">{{ label }}</button>
    </div>
    <div class="pt-3">
      <div v-for="(_, index) in labels" :id="panelId(index)" v-show="active === index" :key="index" role="tabpanel" :aria-labelledby="tabId(index)" tabindex="0"><slot :name="`tab-${index}`" /></div>
    </div>
  </section>
</template>

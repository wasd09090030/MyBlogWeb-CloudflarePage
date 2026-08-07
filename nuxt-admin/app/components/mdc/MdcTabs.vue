<script setup lang="ts">
const props = withDefaults(defineProps<{ labels?: string[] }>(), { labels: () => ['First', 'Second'] })
const active = ref(0)
const labels = computed(() => props.labels.length ? props.labels : ['First'])
</script>

<template>
  <section class="tabs-mdc my-5">
    <div class="flex flex-wrap gap-1 border-b border-default pb-2" role="tablist">
      <UButton v-for="(label, index) in labels" :key="label" size="xs" :color="active === index ? 'primary' : 'neutral'" :variant="active === index ? 'soft' : 'ghost'" role="tab" :aria-selected="active === index" @click="active = index">{{ label }}</UButton>
    </div>
    <div class="pt-3">
      <div v-for="(_, index) in labels" v-show="active === index" :key="index" role="tabpanel"><slot :name="`tab-${index}`" /></div>
    </div>
  </section>
</template>

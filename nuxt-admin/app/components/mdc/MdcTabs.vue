<script setup lang="ts">
const props = withDefaults(defineProps<{ labels?: string[] }>(), { labels: () => ['First', 'Second'] })
const active = ref(0)
const labels = computed(() => props.labels.length ? props.labels : ['First'])
</script>

<template>
  <section class="tabs-mdc my-5">
    <div class="tabs-header border-b" role="tablist">
      <button v-for="(label, index) in labels" :key="label" type="button" class="tab-btn border-b-2 font-medium" role="tab" :aria-selected="active === index" @click="active = index">{{ label }}</button>
    </div>
    <div class="pt-3">
      <div v-for="(_, index) in labels" v-show="active === index" :key="index" role="tabpanel"><slot :name="`tab-${index}`" /></div>
    </div>
  </section>
</template>

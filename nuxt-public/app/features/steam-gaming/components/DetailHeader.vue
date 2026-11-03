<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  meta?: string
  /** 返回列表页；默认回游戏档案首页。 */
  backTo?: string
  backLabel?: string
}>(), {
  backTo: '/games',
  backLabel: '游戏档案'
})
</script>

<template>
  <header class="sg-detail-head">
    <NuxtLink :to="backTo" class="sg-back">
      <Icon name="ph:arrow-left" size="13" />
      {{ backLabel }}
    </NuxtLink>
    <h1 class="sg-detail-title">{{ title }}</h1>
    <p v-if="meta" class="sg-detail-meta">{{ meta }}</p>
    <slot />
  </header>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  meta?: string
  /** 传入详情页路径后，右侧渲染「更多…」入口。 */
  moreTo?: string
  moreLabel?: string
}>()
</script>

<template>
  <div class="sg-sec">
    <span class="sg-icon-chip"><Icon :name="icon" size="15" /></span>
    <h2 class="sg-sec__title">{{ title }}</h2>
    <div class="sg-sec__end">
      <span v-if="meta" class="sg-sec__meta">{{ meta }}</span>
      <NuxtLink v-if="moreTo" :to="moreTo" class="sg-more">
        {{ moreLabel || '更多' }}
        <Icon name="ph:arrow-right" size="12" />
      </NuxtLink>
    </div>
  </div>
</template>

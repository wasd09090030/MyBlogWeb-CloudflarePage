<script setup lang="ts">
import ShowcaseFrame from '../components/ShowcaseFrame.vue'
import WishlistGrid from '../components/WishlistGrid.vue'
import type { SteamWishlistItem } from '../types'

const props = defineProps<{ items: SteamWishlistItem[]; span: number; moreTo?: string }>()

const longestWait = computed(() => Math.max(0, ...props.items.map(item => item.daysWaiting)))
const meta = computed(() => `${props.items.length} 款 · 最久等了 ${longestWait.value} 天`)
</script>

<template>
  <ShowcaseFrame title="愿望单" icon="ph:heart-straight-fill" :meta="meta" :span="span" :more-to="moreTo">
    <WishlistGrid :items="items" />
  </ShowcaseFrame>
</template>

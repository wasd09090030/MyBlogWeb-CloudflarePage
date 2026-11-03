<script setup lang="ts">
import GameCover from './GameCover.vue'
import type { SteamWishlistItem } from '../types'

defineProps<{
  items: SteamWishlistItem[]
  /** preview：首页展柜 3 列；detail：详情页自适应铺满。 */
  variant?: 'preview' | 'detail'
}>()

/** 固定成 2022.11.27，避免 SSR/CSR 时区差异导致的 hydration 不一致。 */
const addedOn = (value: string) => value.slice(0, 10).replaceAll('-', '.')
</script>

<template>
  <div class="sg-wishlist" :class="{ 'sg-wishlist--detail': variant === 'detail' }">
    <a
      v-for="item in items"
      :key="item.appid"
      class="sg-wish"
      :href="`https://store.steampowered.com/app/${item.appid}`"
      target="_blank"
      rel="noopener noreferrer"
    >
      <GameCover :appid="item.appid" :src="item.headerUrl" :alt="item.name" variant="capsule" ratio="16 / 9" />
      <span class="sg-wish__wait">等了 {{ item.daysWaiting }} 天</span>
      <div class="sg-wish__body">
        <h3 class="sg-wish__name">{{ item.name }}</h3>
        <span class="sg-wish__sub">{{ addedOn(item.addedAt) }} 加入</span>
      </div>
    </a>
  </div>
</template>

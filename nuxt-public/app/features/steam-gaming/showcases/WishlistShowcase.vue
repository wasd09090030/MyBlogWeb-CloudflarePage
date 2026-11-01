<script setup lang="ts">
import GameCover from '../components/GameCover.vue'
import ShowcaseFrame from '../components/ShowcaseFrame.vue'
import type { SteamWishlistItem } from '../types'

const props = defineProps<{ items: SteamWishlistItem[]; span: number }>()

const longestWait = computed(() => Math.max(0, ...props.items.map(item => item.daysWaiting)))
const meta = computed(() => `${props.items.length} 款 · 最久等了 ${longestWait.value} 天`)

/** 固定成 2022.11.27，避免 SSR/CSR 时区差异导致的 hydration 不一致。 */
const addedOn = (value: string) => value.slice(0, 10).replaceAll('-', '.')
</script>

<template>
  <ShowcaseFrame title="愿望单" icon="ph:heart-straight-fill" :meta="meta" :span="span">
    <div class="sg-wishlist">
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
  </ShowcaseFrame>
</template>

<script setup lang="ts">
import DetailHeader from '../components/DetailHeader.vue'
import LoadMore from '../components/LoadMore.vue'
import StateNotice from '../components/StateNotice.vue'
import WishlistGrid from '../components/WishlistGrid.vue'
import { useSteamWishlist } from '../composables/useSteamWishlist'

const { items, total, status, loadingMore, loadMore, retry } = useSteamWishlist()

const pending = computed(() => status.value === 'pending')
const failed = computed(() => status.value === 'error')
const empty = computed(() => status.value === 'success' && total.value === 0)
const meta = computed(() => {
  if (status.value !== 'success') return ''
  return total.value ? `共 ${total.value} 款 · 按加入时间排序` : '愿望单是空的'
})
</script>

<template>
  <main class="sg-page sg-detail">
    <DetailHeader title="愿望单" :meta="meta" />

    <div v-if="pending" class="sg-skel sg-detail-loading" />
    <StateNotice v-else-if="failed" kind="error" @retry="retry" />
    <StateNotice v-else-if="empty" kind="empty" />

    <section v-else class="sg-card sg-card--full sg-detail-card">
      <WishlistGrid :items="items" variant="detail" />
      <LoadMore :shown="items.length" :total="total" :loading="loadingMore" @load="loadMore" />
    </section>
  </main>
</template>

<style>
@import '~/assets/css/components/SteamGaming.desktop.css';
@import '~/assets/css/components/SteamGaming.mobile.css';
</style>

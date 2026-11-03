<script setup lang="ts">
import DetailHeader from '../components/DetailHeader.vue'
import LoadMore from '../components/LoadMore.vue'
import PlaytimeRankingList from '../components/PlaytimeRankingList.vue'
import StateNotice from '../components/StateNotice.vue'
import { useSteamPlaytime } from '../composables/useSteamPlaytime'
import { formatNumber } from '../utils/format'

const { games, total, totalMinutes, status, loadingMore, loadMore, retry } = useSteamPlaytime()

const pending = computed(() => status.value === 'pending')
const failed = computed(() => status.value === 'error')
const empty = computed(() => status.value === 'success' && total.value === 0)
const meta = computed(() => {
  if (status.value !== 'success') return ''
  if (!total.value) return '还没有游玩记录'
  return `共 ${formatNumber(total.value)} 款 · 合计 ${formatNumber(Math.round(totalMinutes.value / 60))} 小时`
})
</script>

<template>
  <main class="sg-page sg-detail">
    <DetailHeader title="游玩时长" :meta="meta" />

    <div v-if="pending" class="sg-skel sg-detail-loading" />
    <StateNotice v-else-if="failed" kind="error" @retry="retry" />
    <StateNotice v-else-if="empty" kind="empty" />

    <section v-else class="sg-card sg-card--full sg-detail-card">
      <PlaytimeRankingList :games="games" />
      <LoadMore :shown="games.length" :total="total" :loading="loadingMore" @load="loadMore" />
    </section>
  </main>
</template>

<style>
@import '~/assets/css/components/SteamGaming.desktop.css';
@import '~/assets/css/components/SteamGaming.mobile.css';
</style>

<script setup lang="ts">
import DetailHeader from '../components/DetailHeader.vue'
import LoadMore from '../components/LoadMore.vue'
import RatingRows from '../components/RatingRows.vue'
import RatingSummary from '../components/RatingSummary.vue'
import StateNotice from '../components/StateNotice.vue'
import { useSteamRatings } from '../composables/useSteamRatings'

/** 单次追加条数：详情页也不一次铺满整份评分。 */
const PAGE_SIZE = 24

const { data, status, refresh } = useSteamRatings()

const visible = ref(PAGE_SIZE)
const items = computed(() => data.value?.items ?? [])
const shownItems = computed(() => items.value.slice(0, visible.value))
const pending = computed(() => status.value === 'pending' || status.value === 'idle')
const failed = computed(() => status.value === 'error')
const empty = computed(() => status.value === 'success' && !data.value?.total)
const meta = computed(() => {
  const value = data.value
  if (status.value !== 'success' || !value) return ''
  if (!value.total) return '还没有评分'
  return `已评 ${value.total} 款 · 平均 ${value.average.toFixed(1)} 分`
})
</script>

<template>
  <main class="sg-page sg-detail">
    <DetailHeader title="我的评分" :meta="meta" />

    <div v-if="pending" class="sg-skel sg-detail-loading" />
    <StateNotice v-else-if="failed" kind="error" @retry="refresh" />
    <StateNotice v-else-if="empty" kind="empty" />

    <section v-else-if="data" class="sg-score sg-score--detail">
      <div class="sg-score__body">
        <RatingSummary :data="data" />
        <div class="sg-score__main">
          <RatingRows :items="shownItems" />
          <LoadMore
            :shown="shownItems.length"
            :total="items.length"
            :step="PAGE_SIZE"
            @load="visible += PAGE_SIZE"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style>
@import '~/assets/css/components/SteamGaming.desktop.css';
@import '~/assets/css/components/SteamGaming.mobile.css';
</style>

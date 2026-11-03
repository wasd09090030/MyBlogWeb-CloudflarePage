<script setup lang="ts">
import PlaytimeRankingList from '../components/PlaytimeRankingList.vue'
import ShowcaseFrame from '../components/ShowcaseFrame.vue'
import type { SteamRankedGame } from '../types'
import { formatNumber } from '../utils/format'

defineProps<{ games: SteamRankedGame[]; totalMinutes: number; span: number; moreTo?: string }>()
</script>

<template>
  <ShowcaseFrame
    title="游玩时长"
    icon="ph:chart-bar-fill"
    :meta="`Top ${games.length} · ${formatNumber(Math.round(totalMinutes / 60))} 小时`"
    :span="span"
    :more-to="moreTo"
  >
    <PlaytimeRankingList :games="games" />
  </ShowcaseFrame>
</template>

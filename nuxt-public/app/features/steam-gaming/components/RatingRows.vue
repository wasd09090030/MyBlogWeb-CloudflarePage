<script setup lang="ts">
import GameCover from './GameCover.vue'
import type { SteamRatedGame } from '../types'

defineProps<{ items: SteamRatedGame[] }>()

/** 刻度尺 10 格，按分数点亮；同时决定这一行的强调色档位。 */
function litCells(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)))
}

function tier(score: number): string {
  if (score >= 9) return 'sg-row--top'
  if (score >= 8) return 'sg-row--good'
  return 'sg-row--mid'
}
</script>

<template>
  <ol class="sg-score__list">
    <li
      v-for="item in items"
      :key="item.appid"
      class="sg-row"
      :class="tier(item.score)"
    >
      <GameCover
        :appid="item.appid"
        :src="item.headerUrl"
        :alt="item.name"
        variant="capsule"
        ratio="16 / 9"
        class="sg-row__cover"
      />
      <div class="sg-row__body">
        <b>{{ item.name }}</b>
        <span>{{ item.comment || `${item.minutesTotal > 0 ? Math.round(item.minutesTotal / 60) : 0} 小时 · 还没有写过短评` }}</span>
      </div>
      <div class="sg-scale" role="img" :aria-label="`${item.score} 分，满分 10 分`">
        <i v-for="cell in 10" :key="cell" :class="{ 'is-on': cell <= litCells(item.score) }" />
      </div>
      <div class="sg-row__score">{{ item.score.toFixed(1) }}</div>
    </li>
  </ol>
</template>

<script setup lang="ts">
import GameCover from './GameCover.vue'
import type { SteamRankedGame } from '../types'
import { formatHours } from '../utils/format'

const props = defineProps<{ games: SteamRankedGame[] }>()

const maxMinutes = computed(() => Math.max(1, ...props.games.map(game => game.minutesTotal)))
const width = (minutes: number) => `${Math.max(2, Math.round((minutes / maxMinutes.value) * 100))}%`
</script>

<template>
  <div class="sg-ranking">
    <a
      v-for="(game, index) in games"
      :key="game.appid"
      class="sg-rank"
      :href="`https://store.steampowered.com/app/${game.appid}`"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span class="sg-rank__no">{{ String(index + 1).padStart(2, '0') }}</span>
      <GameCover
        :appid="game.appid"
        :src="game.headerUrl"
        :alt="game.name"
        variant="poster2x"
        ratio="3 / 4"
        class="sg-rank__thumb"
      />
      <div class="sg-rank__body">
        <div class="sg-rank__name">
          <b>{{ game.name }}</b>
          <span>{{ Math.round(game.share * 100) }}%</span>
        </div>
        <div class="sg-rank__track"><i :style="{ width: width(game.minutesTotal) }" /></div>
      </div>
      <div class="sg-rank__hours">
        <b>{{ formatHours(game.minutesTotal) }}</b>
        <span>小时</span>
      </div>
    </a>
  </div>
</template>

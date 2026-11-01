<script setup lang="ts">
import GameCover from '../components/GameCover.vue'
import ShowcaseFrame from '../components/ShowcaseFrame.vue'
import type { SteamGame } from '../types'
import { formatHours } from '../utils/format'

defineProps<{ games: SteamGame[]; totalGames: number; span: number }>()
</script>

<template>
  <ShowcaseFrame title="完美通关" icon="ph:trophy-fill" :meta="`${games.length} 款 100%`" :span="span">
    <div class="sg-perfect">
      <a
        v-for="game in games"
        :key="game.appid"
        class="sg-perfect__row"
        :href="`https://store.steampowered.com/app/${game.appid}`"
        target="_blank"
        rel="noopener noreferrer"
      >
        <GameCover
          :appid="game.appid"
          :src="game.headerUrl"
          :alt="game.name"
          variant="capsule"
          ratio="16 / 9"
          class="sg-perfect__cover"
        />
        <div class="sg-perfect__name">
          <b>{{ game.name }}</b>
          <span>{{ game.achievementsUnlocked }} / {{ game.achievementsTotal }} · {{ formatHours(game.minutesTotal) }} 小时</span>
        </div>
        <div class="sg-perfect__pct">100%</div>
      </a>
    </div>
    <div class="sg-perfect__foot">
      共 {{ games.length }} 款 · 占库 {{ totalGames > 0 ? Math.round((games.length / totalGames) * 100) : 0 }}%
    </div>
  </ShowcaseFrame>
</template>

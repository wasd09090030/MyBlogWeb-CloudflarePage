<script setup lang="ts">
import GameCover from '../components/GameCover.vue'
import type { SteamGame } from '../types'
import { achievementsPercent, formatHours, relativeTime } from '../utils/format'

const props = defineProps<{ games: SteamGame[] }>()

const totalMinutes = computed(() => props.games.reduce((sum, game) => sum + (game.minutes2Weeks || 0), 0))
const longest = computed(() => Math.max(1, ...props.games.map(game => game.minutes2Weeks || 0)))
const leadingAppid = computed(() => props.games[0]?.appid ?? null)

const progress = (game: SteamGame) => `${Math.max(2, Math.round(((game.minutes2Weeks || 0) / longest.value) * 100))}%`
const achievementPct = (game: SteamGame) => achievementsPercent(game.achievementsUnlocked, game.achievementsTotal)
</script>

<template>
  <section class="sg-now" aria-label="最近在玩">
    <div class="sg-now__head">
      <div>
        <span class="sg-now__eyebrow">
          <Icon name="ph:game-controller-fill" size="13" />
          Now Playing
        </span>
        <h2 class="sg-now__title">最近在玩</h2>
        <p class="sg-now__sub">
          近 14 天有游玩的游戏，按时长排序 · 共 {{ formatHours(totalMinutes) }} 小时
        </p>
      </div>
      <div class="sg-now__meta">
        <span class="sg-chip">{{ games.length }} 款在玩</span>
      </div>
    </div>

    <div class="sg-now__rail">
      <a
        v-for="(game, index) in games"
        :key="game.appid"
        class="sg-play"
        :class="{ 'sg-play--lead': game.appid === leadingAppid }"
        :href="`https://store.steampowered.com/app/${game.appid}`"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div class="sg-play__art">
          <GameCover
            :appid="game.appid"
            :src="game.headerUrl"
            :alt="game.name"
            :variant="game.appid === leadingAppid ? 'hero' : 'poster2x'"
            ratio="auto"
            :eager="index === 0"
          />
        </div>
        <span class="sg-play__idx">{{ String(index + 1).padStart(2, '0') }}</span>
        <span v-if="game.appid === leadingAppid" class="sg-play__flag">
          <Icon name="ph:fire-fill" size="11" /> 本周最久
        </span>

        <div class="sg-play__body">
          <h3 class="sg-play__name">{{ game.name }}</h3>
          <div class="sg-play__hours">
            <b>{{ formatHours(game.minutes2Weeks) }}</b>
            <span>小时 · 本周</span>
          </div>
          <div class="sg-prog"><i :style="{ width: progress(game) }" /></div>
          <div class="sg-play__row">
            <span>{{ game.achievementsTotal ? `成就 ${game.achievementsUnlocked ?? 0} / ${game.achievementsTotal} · ${achievementPct(game)}%` : '无成就' }}</span>
            <span v-if="game.lastPlayedAt">{{ relativeTime(game.lastPlayedAt) }}</span>
          </div>
        </div>
      </a>
    </div>
  </section>
</template>

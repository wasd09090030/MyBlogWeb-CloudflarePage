<script setup lang="ts">
import GameCover from '../components/GameCover.vue'
import type { SteamFavoriteGame } from '../types'
import { achievementsPercent, formatHours, formatNumber, relativeTime } from '../utils/format'

const props = defineProps<{
  game: SteamFavoriteGame
  /** 档案总时长，用于算「占总时长」；为 0 时不显示该标签。 */
  totalMinutes: number
  gameCount: number
}>()

const percent = computed(() => achievementsPercent(props.game.achievementsUnlocked, props.game.achievementsTotal))
const score = computed(() => props.game.rating?.score ?? null)

/** 没写过短评时退回一句由数据生成的中性描述，不留空行。 */
const quote = computed(() => {
  if (props.game.rating?.comment) return props.game.rating.comment
  const hours = formatHours(props.game.minutesTotal)
  if (props.game.achievementsTotal) {
    return `累计 ${hours} 小时，集齐 ${props.game.achievementsUnlocked ?? 0} / ${props.game.achievementsTotal} 个成就。`
  }
  return `累计 ${hours} 小时的存档留在这里。`
})

const sharePercent = computed(() => {
  if (!props.totalMinutes) return null
  const value = (props.game.minutesTotal / props.totalMinutes) * 100
  if (!Number.isFinite(value) || value <= 0) return null
  return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10
})

const fullyCompleted = computed(() =>
  Boolean(props.game.achievementsTotal)
  && props.game.achievementsUnlocked === props.game.achievementsTotal
)

const chips = computed(() => {
  const list: Array<{ key: string; label: string; hot?: boolean }> = []
  if (sharePercent.value !== null) {
    list.push({ key: 'share', label: `占总时长 ${sharePercent.value}%`, hot: true })
  }
  if (fullyCompleted.value) list.push({ key: 'perfect', label: '全部成就已集齐' })
  if (props.game.lastPlayedAt) {
    list.push({ key: 'last', label: `上次游玩 ${relativeTime(props.game.lastPlayedAt)}` })
  }
  return list
})
</script>

<template>
  <section class="sg-hero" aria-labelledby="sg-favorite-title">
    <div class="sg-hero__bg" aria-hidden="true">
      <img
        v-if="game.appid"
        :src="`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`"
        alt=""
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
      >
    </div>
    <div class="sg-hero__scrim" aria-hidden="true" />

    <span class="sg-hero__eyebrow">
      <Icon name="game-icons:laurel-crown" size="14" />
      All-time Favorite · 从 {{ formatNumber(gameCount) }} 款里选出的这一款
    </span>

    <h2 id="sg-favorite-title" class="sg-hero__title">{{ game.name }}</h2>
    <p class="sg-hero__quote">{{ quote }}</p>

    <div class="sg-hero__art">
      <div class="sg-hero__frame">
        <GameCover
          :appid="game.appid"
          :src="game.headerUrl"
          :alt="game.name"
          variant="capsule"
          eager
        />
      </div>
      <div
        v-if="score !== null"
        class="sg-medal"
        role="img"
        :aria-label="`我的评分 ${score} 分，满分 10 分`"
      >
        <b>{{ score.toFixed(1) }}</b>
        <span>/ 10</span>
      </div>
    </div>

    <ul class="sg-hero__stats">
      <li><b>{{ formatHours(game.minutesTotal) }}<em> h</em></b><span>总时长</span></li>
      <li>
        <b v-if="game.achievementsTotal">{{ game.achievementsUnlocked ?? 0 }} / {{ game.achievementsTotal }}</b>
        <b v-else>—</b>
        <span>成就</span>
      </li>
      <li><b>{{ formatHours(game.minutes2Weeks) }}<em> h</em></b><span>近两周</span></li>
      <li><b>{{ game.achievementsTotal ? `${percent}%` : '—' }}</b><span>完成度</span></li>
    </ul>

    <div v-if="chips.length" class="sg-hero__foot">
      <span
        v-for="chip in chips"
        :key="chip.key"
        class="sg-chip"
        :class="{ 'sg-chip--hot': chip.hot }"
      >
        <Icon v-if="chip.hot" name="ph:fire-fill" size="12" />
        {{ chip.label }}
      </span>
    </div>
  </section>
</template>

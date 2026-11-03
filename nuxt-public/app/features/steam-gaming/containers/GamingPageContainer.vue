<script setup lang="ts">
import ShowcaseSkeleton from '../components/ShowcaseSkeleton.vue'
import StateNotice from '../components/StateNotice.vue'
import CompletionistShowcase from '../showcases/CompletionistShowcase.vue'
import CollectorShowcase from '../showcases/CollectorShowcase.vue'
import FavoriteShowcase from '../showcases/FavoriteShowcase.vue'
import PlaytimeRankingShowcase from '../showcases/PlaytimeRankingShowcase.vue'
import RarestAchievementShowcase from '../showcases/RarestAchievementShowcase.vue'
import RatingShowcase from '../showcases/RatingShowcase.vue'
import RecentShowcase from '../showcases/RecentShowcase.vue'
import WishlistShowcase from '../showcases/WishlistShowcase.vue'
import { formatHours, formatNumber, relativeTime } from '../utils/format'
import type {
  SteamAchievement,
  SteamCollectorData,
  SteamFavoriteGame,
  SteamGame,
  SteamRankedGame,
  SteamRatingData,
  SteamShowcase,
  SteamWishlistItem
} from '../types'
import { useSteamOverview } from '../composables/useSteamOverview'

const { overview, status, refresh } = useSteamOverview()

const showcases = computed(() => (overview.value?.showcases ?? []).filter(item => !item.empty))
const profile = computed(() => overview.value?.profile ?? null)

/** 有独立详情页的展柜：首页只放预览，入口由后台开关与数据量共同决定。 */
const DETAIL_PATHS: Partial<Record<string, string>> = {
  rating: '/games/ratings',
  'top-playtime': '/games/playtime',
  wishlist: '/games/wishlist'
}

function shownCount(item: SteamShowcase): number {
  switch (item.type) {
    case 'rating': return (item.data as SteamRatingData | null)?.items?.length ?? 0
    case 'top-playtime': return (item.data as { games?: SteamGame[] } | null)?.games?.length ?? 0
    case 'wishlist': return Array.isArray(item.data) ? item.data.length : 0
    default: return 0
  }
}

function moreTo(item: SteamShowcase): string | undefined {
  const path = DETAIL_PATHS[item.type]
  if (!path || item.config.more === false) return undefined
  if (item.total <= shownCount(item)) return undefined
  // 详情页沿用首页配置的排序，避免两处榜单顺序不一致。
  return item.type === 'top-playtime' && item.config.sort === 'recent' ? `${path}?sort=recent` : path
}

const cards = computed(() => showcases.value.map(item => ({ item, moreTo: moreTo(item) })))
const pending = computed(() => {
  // `idle` 是 server:false 在 SSR 阶段的状态：首屏先出骨架，避免闪现「暂无数据」。
  const state = status.value
  return (state === 'pending' || state === 'idle') && !overview.value?.showcases?.length
})
const failed = computed(() => status.value === 'error')
const noticeKind = computed<'empty' | 'privacy' | 'unconfigured' | 'error' | null>(() => {
  if (failed.value) return 'error'
  const state = overview.value?.status
  if (state === 'privacy_blocked') return 'privacy'
  if (state === 'unconfigured') return 'unconfigured'
  if (state === 'empty') return 'empty'
  if (!pending.value && (!profile.value || showcases.value.length === 0)) return 'empty'
  return null
})
const stale = computed(() => Boolean(overview.value?.stale) || overview.value?.status === 'stale')

const achievementRate = computed(() => {
  const value = profile.value
  if (!value || value.achievementsTotal <= 0) return 0
  return Math.round((value.achievementsUnlocked / value.achievementsTotal) * 100)
})
</script>

<template>
  <main class="sg-page">
    <ShowcaseSkeleton v-if="pending" />
    <StateNotice v-else-if="noticeKind" :kind="noticeKind" @retry="refresh" />

    <template v-else-if="profile">
      <section class="sg-rail" aria-label="Steam 档案概览">
        <div class="sg-rail__id">
          <div class="sg-avatar">
            <img
              v-if="profile.avatarUrl"
              :src="profile.avatarUrl"
              :alt="profile.personaName"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            >
            <span v-else aria-hidden="true">{{ profile.personaName.charAt(0) }}</span>
          </div>
          <div class="sg-rail__name">
            <strong>{{ profile.personaName }}</strong>
            <span v-if="profile.level" class="sg-level">LV {{ profile.level }}</span>
          </div>
        </div>

        <ul class="sg-rail__stats">
          <li><b>{{ formatNumber(profile.gameCount) }}</b><span>游戏</span></li>
          <li><b>{{ formatNumber(Math.round(profile.totalMinutes / 60)) }}<em> h</em></b><span>总时长</span></li>
          <li><b>{{ formatHours(profile.minutes2Weeks) }}<em> h</em></b><span>近两周</span></li>
          <li><b>{{ formatNumber(profile.achievementsUnlocked) }}</b><span>成就 · {{ achievementRate }}%</span></li>
        </ul>

        <div class="sg-rail__end">
          <div v-if="overview?.syncedAt" class="sg-sync" :class="{ 'sg-sync--stale': stale }" aria-live="polite">
            <span class="sg-sync__dot" />
            <span>{{ stale ? '快照过期' : '已同步' }} · {{ relativeTime(overview.syncedAt) }}</span>
          </div>
          <a
            v-if="profile.profileUrl"
            class="sg-link"
            :href="profile.profileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="simple-icons:steam" size="13" />
            在 Steam 查看 ↗
          </a>
        </div>
      </section>

      <div class="sg-flow">
        <template v-for="card in cards" :key="card.item.type">
          <FavoriteShowcase
            v-if="card.item.type === 'favorite'"
            :game="card.item.data as SteamFavoriteGame"
            :total-minutes="profile.totalMinutes"
            :game-count="profile.gameCount"
          />
          <RatingShowcase
            v-else-if="card.item.type === 'rating'"
            :data="card.item.data as SteamRatingData"
            :more-to="card.moreTo"
          />
          <RecentShowcase
            v-else-if="card.item.type === 'recent'"
            :games="card.item.data as SteamGame[]"
          />
          <CollectorShowcase
            v-else-if="card.item.type === 'collector'"
            :data="card.item.data as SteamCollectorData"
            :span="card.item.span"
          />
          <PlaytimeRankingShowcase
            v-else-if="card.item.type === 'top-playtime'"
            :games="(card.item.data as { games: SteamRankedGame[] }).games"
            :total-minutes="(card.item.data as { totalMinutes: number }).totalMinutes"
            :span="card.item.span"
            :more-to="card.moreTo"
          />
          <CompletionistShowcase
            v-else-if="card.item.type === 'completionist'"
            :games="card.item.data as SteamGame[]"
            :total-games="profile.gameCount"
            :span="card.item.span"
          />
          <RarestAchievementShowcase
            v-else-if="card.item.type === 'rarest-achievement'"
            :achievements="card.item.data as SteamAchievement[]"
            :span="card.item.span"
          />
          <WishlistShowcase
            v-else-if="card.item.type === 'wishlist'"
            :items="card.item.data as SteamWishlistItem[]"
            :span="card.item.span"
            :more-to="card.moreTo"
          />
        </template>
      </div>

      <p class="sg-provenance">
        <Icon name="ph:database" size="13" />
        <span><b>数据来源</b> · Steam Web API</span>
        <span>·</span>
        <span>每天 05:00 自动同步一次，页面只读快照</span>
        <template v-if="overview?.syncedAt">
          <span>·</span>
          <span>最后成功同步 {{ relativeTime(overview.syncedAt) }}</span>
        </template>
      </p>
    </template>
  </main>
</template>

<style>
@import '~/assets/css/components/SteamGaming.desktop.css';
@import '~/assets/css/components/SteamGaming.mobile.css';
</style>

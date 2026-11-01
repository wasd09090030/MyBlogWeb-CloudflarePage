<script setup lang="ts">
import ShowcaseFrame from '../components/ShowcaseFrame.vue'
import type { SteamAchievement } from '../types'

const props = defineProps<{ achievements: SteamAchievement[]; span: number }>()

function tone(percent: number | null): string {
  if (percent === null) return 'sg-rarity--common'
  if (percent <= 5) return 'sg-rarity--epic'
  if (percent <= 25) return 'sg-rarity--rare'
  return 'sg-rarity--common'
}

const width = (percent: number | null) => `${Math.max(3, Math.min(100, percent ?? 0))}%`
const hero = computed(() => props.achievements[0] ?? null)
const rest = computed(() => props.achievements.slice(1))
</script>

<template>
  <ShowcaseFrame title="最稀有成就" icon="ph:diamond-fill" meta="按全球解锁率" :span="span">
    <div class="sg-rarest">
      <article v-if="hero" class="sg-rare sg-rare--lead">
        <div class="sg-rare__top">
          <span class="sg-rare__badge">
            <img
              v-if="hero.iconUrl"
              :src="hero.iconUrl"
              :alt="`${hero.displayName} 图标`"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            >
            <Icon v-else name="game-icons:achievement" size="24" />
          </span>
          <div class="sg-rare__meta">
            <span class="sg-rare__game">{{ hero.game }}</span>
            <h3 class="sg-rare__name">{{ hero.displayName }}</h3>
          </div>
        </div>
        <p class="sg-rare__desc">{{ hero.description || '这个成就只有很少的玩家拿到。' }}</p>
        <div class="sg-rarity" :class="tone(hero.percent)">
          <div class="sg-rarity__track"><i :style="{ width: width(hero.percent) }" /></div>
          <span class="sg-rarity__val">{{ hero.percent?.toFixed(1) ?? '—' }}% 解锁</span>
        </div>
      </article>

      <article v-for="item in rest" :key="`${item.appid}-${item.apiName}`" class="sg-rare">
        <div class="sg-rare__top">
          <span class="sg-rare__badge">
            <img
              v-if="item.iconUrl"
              :src="item.iconUrl"
              :alt="`${item.displayName} 图标`"
              loading="lazy"
              decoding="async"
              referrerpolicy="no-referrer"
            >
            <Icon v-else name="game-icons:achievement" size="18" />
          </span>
          <div class="sg-rare__meta">
            <span class="sg-rare__game">{{ item.game }}</span>
            <h3 class="sg-rare__name">{{ item.displayName }}</h3>
          </div>
        </div>
        <p class="sg-rare__desc">{{ item.description || '—' }}</p>
        <div class="sg-rarity" :class="tone(item.percent)">
          <div class="sg-rarity__track"><i :style="{ width: width(item.percent) }" /></div>
          <span class="sg-rarity__val">{{ item.percent?.toFixed(1) ?? '—' }}%</span>
        </div>
      </article>
    </div>
  </ShowcaseFrame>
</template>

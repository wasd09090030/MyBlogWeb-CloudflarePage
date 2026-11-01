<script setup lang="ts">
import GameCover from '../components/GameCover.vue'
import SectionHeader from '../components/SectionHeader.vue'
import type { SteamRatingData } from '../types'

const props = defineProps<{ data: SteamRatingData }>()

/** 刻度尺 10 格，按分数点亮；同时决定这一行的强调色档位。 */
function litCells(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)))
}

function tier(score: number): string {
  if (score >= 9) return 'sg-row--top'
  if (score >= 8) return 'sg-row--good'
  return 'sg-row--mid'
}

const peak = computed(() => Math.max(1, props.data.peakCount))
const average = computed(() => props.data.average.toFixed(1))
const maxScore = computed(() => props.data.best?.score ?? 0)
</script>

<template>
  <section class="sg-score" aria-label="我的评分">
    <SectionHeader
      icon="ph:seal-check-fill"
      title="我的评分"
      :meta="`已评 ${data.total} 款 · 平均 ${average} 分`"
    />

    <div class="sg-score__body">
      <aside class="sg-score__aside">
        <div class="sg-score__peak">
          <span class="sg-score__num">{{ maxScore.toFixed(1) }}<em> / 10</em></span>
          <span class="sg-score__label"><Icon name="ph:medal-fill" size="12" /> 最高分</span>
          <span v-if="data.best" class="sg-score__game">{{ data.best.name }}</span>
        </div>

        <div class="sg-hist">
          <div v-for="bucket in data.distribution" :key="bucket.key" class="sg-hist__row">
            <span class="sg-hist__key">{{ bucket.label }}</span>
            <span class="sg-hist__track">
              <i :style="{ width: `${Math.round((bucket.count / peak) * 100)}%` }" />
            </span>
            <span class="sg-hist__val">{{ bucket.count }}</span>
          </div>
        </div>
      </aside>

      <ol class="sg-score__list">
        <li
          v-for="item in data.items"
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
    </div>
  </section>
</template>

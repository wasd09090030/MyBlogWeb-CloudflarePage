<script setup lang="ts">
import type { SteamRatingData } from '../types'

const props = defineProps<{ data: SteamRatingData }>()

const peak = computed(() => Math.max(1, props.data.peakCount))
const maxScore = computed(() => props.data.best?.score ?? 0)
</script>

<template>
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
</template>

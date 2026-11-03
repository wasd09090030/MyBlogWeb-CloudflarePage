<script setup lang="ts">
import RatingRows from '../components/RatingRows.vue'
import RatingSummary from '../components/RatingSummary.vue'
import SectionHeader from '../components/SectionHeader.vue'
import type { SteamRatingData } from '../types'

const props = defineProps<{ data: SteamRatingData; moreTo?: string }>()

const average = computed(() => props.data.average.toFixed(1))
</script>

<template>
  <section class="sg-score" aria-label="我的评分">
    <SectionHeader
      icon="ph:seal-check-fill"
      title="我的评分"
      :meta="`已评 ${data.total} 款 · 平均 ${average} 分`"
      :more-to="moreTo"
    />

    <div class="sg-score__body">
      <RatingSummary :data="data" />
      <RatingRows :items="data.items" />
    </div>
  </section>
</template>

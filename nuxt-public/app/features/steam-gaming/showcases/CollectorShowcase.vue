<script setup lang="ts">
import GameCover from '../components/GameCover.vue'
import ShowcaseFrame from '../components/ShowcaseFrame.vue'
import type { SteamCollectorData } from '../types'
import { formatHours, formatNumber } from '../utils/format'

defineProps<{ data: SteamCollectorData; span: number }>()
</script>

<template>
  <ShowcaseFrame title="游戏收藏家" icon="ph:books-fill" :meta="`最近入库 ${data.recent.length} 款`" :span="span">
    <div class="sg-collector">
      <div class="sg-collector__total">
        <b>{{ formatNumber(data.gameCount) }}</b>
        <span>款游戏 · {{ formatNumber(data.totalMinutes / 60) }} 小时</span>
      </div>

      <div class="sg-collector__main">
        <div class="sg-collector__rows">
          <div class="sg-collector__row"><span>平均单款</span><b>{{ formatHours(data.averageMinutes) }} 小时</b></div>
          <div class="sg-collector__row"><span>完美通关</span><b>{{ data.perfectCount }} 款</b></div>
          <div class="sg-collector__row"><span>近两周</span><b>{{ formatHours(data.recent.reduce((sum, game) => sum + game.minutes2Weeks, 0)) }} 小时</b></div>
        </div>

        <div class="sg-shelf">
          <a
            v-for="game in data.recent.slice(0, 6)"
            :key="game.appid"
            class="sg-shelf__item"
            :href="`https://store.steampowered.com/app/${game.appid}`"
            target="_blank"
            rel="noopener noreferrer"
            :title="game.name"
          >
            <GameCover :appid="game.appid" :src="game.headerUrl" :alt="game.name" variant="capsule" ratio="16 / 9" />
            <span class="sg-shelf__name">{{ game.name }}</span>
          </a>
        </div>
      </div>
    </div>
  </ShowcaseFrame>
</template>

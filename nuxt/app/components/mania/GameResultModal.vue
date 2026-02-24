<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div class="w-full max-w-2xl mx-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
      <!-- 头部 -->
      <div class="relative h-32 bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/20"></div>
        <div class="relative text-center">
          <div class="text-sm text-white/80 mb-1">{{ rank }}</div>
          <div class="text-4xl font-black text-white">{{ scoreText }}</div>
        </div>
      </div>

      <!-- 主要信息 -->
      <div class="p-8 space-y-6">
        <!-- 歌曲信息 -->
        <div class="text-center space-y-1">
          <h2 class="text-2xl font-bold text-white">{{ songTitle }}</h2>
          <p class="text-slate-400">{{ artist }}</p>
          <div class="flex items-center justify-center gap-2 text-sm text-slate-500">
            <span>{{ creator }}</span>
            <span>·</span>
            <span>{{ version }}</span>
          </div>
        </div>

        <!-- 统计数据 -->
        <div class="grid grid-cols-2 gap-4">
          <!-- 准确度 -->
          <div class="bg-slate-800/50 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-cyan-400">{{ Math.round(accuracy) }}%</div>
            <div class="text-xs text-slate-400 mt-1">准确度</div>
          </div>
          
          <!-- 最大连击 -->
          <div class="bg-slate-800/50 rounded-lg p-4 text-center">
            <div class="text-3xl font-bold text-pink-400">{{ maxCombo }}</div>
            <div class="text-xs text-slate-400 mt-1">最大连击</div>
          </div>
        </div>

        <!-- 判定统计 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-yellow-300">PERFECT</span>
            <span class="font-mono text-white">{{ stats.perfect }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-green-400">GREAT</span>
            <span class="font-mono text-white">{{ stats.great }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-blue-400">GOOD</span>
            <span class="font-mono text-white">{{ stats.good }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-purple-400">BAD</span>
            <span class="font-mono text-white">{{ stats.bad }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-red-500">MISS</span>
            <span class="font-mono text-white">{{ stats.miss }}</span>
          </div>
        </div>

        <!-- 按钮 -->
        <div class="grid grid-cols-2 gap-3 pt-4">
          <n-button type="primary" block size="large" @click="onRetry">
            <template #icon>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </template>
            重新游玩
          </n-button>
          <n-button secondary type="primary" block size="large" @click="onBack">
            <template #icon>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </template>
            返回选曲
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { NButton } from 'naive-ui'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  score: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  maxCombo: {
    type: Number,
    default: 0
  },
  stats: {
    type: Object,
    default: () => ({
      perfect: 0,
      great: 0,
      good: 0,
      bad: 0,
      miss: 0
    })
  },
  songTitle: {
    type: String,
    default: ''
  },
  artist: {
    type: String,
    default: ''
  },
  creator: {
    type: String,
    default: ''
  },
  version: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['retry', 'back'])

const scoreText = computed(() => {
  return props.score.toLocaleString()
})

const rank = computed(() => {
  const acc = props.accuracy
  if (acc >= 95) return 'SS'
  if (acc >= 90) return 'S'
  if (acc >= 80) return 'A'
  if (acc >= 70) return 'B'
  if (acc >= 60) return 'C'
  return 'D'
})

const onRetry = () => {
  emit('retry')
}

const onBack = () => {
  emit('back')
}
</script>

<style scoped>
/* 添加动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fixed {
  animation: slideIn 0.3s ease-out;
}
</style>

<template>
  <div class="min-h-screen bg-transparent text-slate-100">
    <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p class="text-sm text-slate-400">Osu! Mania Webgame 仿制</p>
        <h1 class="text-3xl font-bold text-gray-600">谱面列表</h1>
        <p class="text-slate-400 text-sm">仅有 Osu! Mania 谱面</p>
      </div>

      <!-- 按键设置 -->
      <div class="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
        <button
          class="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
          @click="showKeySettingsModal = true"
        >
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500 dark:text-slate-400">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
            </svg>
            <span class="text-sm font-medium text-slate-800 dark:text-slate-200">按键设置</span>
          </div>
          <span class="text-xs text-slate-600 dark:text-slate-500">点击设置</span>
        </button>
      </div>

      <ManiaKeyBindingModal v-model:show="showKeySettingsModal" />

      <n-spin :show="loading">
        <div v-if="!loading && beatmapSets.length === 0" class="text-center py-10 text-slate-400">
          暂无谱面
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="set in beatmapSets"
            :key="set.id"
            class="relative group rounded-2xl overflow-hidden bg-gray-900 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ring-1 ring-white/10"
          >
            <!-- 背景图 -->
            <div 
              class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              :style="{ backgroundImage: set.backgroundUrl ? `url(${set.backgroundUrl})` : 'none' }"
            >
              <div class="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30 group-hover:via-black/50 transition-colors duration-300"></div>
            </div>
            
            <!-- 内容区域 -->
            <div class="relative p-6 flex flex-col h-full min-h-[200px] justify-end z-10">
              
              <!-- 顶部信息：标题和作者 -->
              <div class="mb-4 transform transition-transform duration-300 group-hover:-translate-y-1">
                <h3 class="text-xl font-bold text-white mb-1 line-clamp-1 drop-shadow-md" :title="set.title">{{ set.title }}</h3>
                <p class="text-gray-300 text-xs font-medium">{{ set.artist }} <span class="mx-1 opacity-50">/</span> {{ set.creator }}</p>
              </div>

              <!-- 底部操作区 -->
              <div class="flex items-center gap-3">
                <!-- 难度选择 (Popselect) -->
                <div class="flex-1">
                  <n-popselect
                    v-model:value="selectedDifficulties[set.id]"
                    :options="getDifficultyOptions(set)"
                    scrollable
                    trigger="click"
                    placement="top-start"
                    @update:value="(val) => handleDifficultySelect(set.id, val)"
                  >
                    <div 
                      class="cursor-pointer bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-lg px-4 py-2.5 flex items-center justify-between transition-all duration-200 group/select"
                    >
                      <div class="flex items-center gap-2">
                        <div class="bg-white/20 p-1 rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
                            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-gray-100">
                          {{ selectedDifficulties[set.id]
                            ? getSelectedDifficultyLabel(set, selectedDifficulties[set.id])
                            : '选择难度' }}
                        </span>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 group-hover/select:text-white transition-colors">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </div>
                  </n-popselect>
                </div>

                <!-- 开始按钮 (仅当有选择时显示) -->
                <transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 translate-x-2"
                  enter-to-class="opacity-100 translate-x-0"
                  leave-active-class="transition duration-150 ease-in"
                  leave-from-class="opacity-100 translate-x-0"
                  leave-to-class="opacity-0 translate-x-2"
                >
                  <button
                    v-if="selectedDifficulties[set.id]"
                    @click.stop="startGame(set.id)"
                    :disabled="isPreloading"
                    class="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                    title="开始游戏"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"></path>
                    </svg>
                  </button>
                </transition>
              </div>
            </div>
          </div>
        </div>
      </n-spin>
    </div>
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="isPreloading"
        class="fixed bottom-6 right-6 z-50 w-64 sm:w-72 bg-black/70 border border-white/10 rounded-xl px-4 py-3 backdrop-blur-md shadow-lg"
      >
        <div class="text-xs text-slate-300 mb-2">{{ preloadLabel }}</div>
        <div class="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-200"
            :style="{ width: `${preloadProgress}%` }"
          />
        </div>
        <div class="mt-1 text-[11px] text-slate-400 text-right">{{ preloadProgress }}%</div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { NSpin, NPopselect } from 'naive-ui'

definePageMeta({
  ssr: false
})

const config = useRuntimeConfig()
const baseURL = config.public.apiBase
const loading = ref(true)
const beatmapSets = ref([])
const selectedDifficulties = ref({})
const showKeySettingsModal = ref(false)
const isPreloading = ref(false)
const preloadProgress = ref(0)
const preloadLabel = ref('准备资源...')

const fetchBeatmaps = async () => {
  loading.value = true
  try {
    const data = await $fetch(`${baseURL}/beatmaps`)
    const normalized = (data || []).map(set => ({
      ...set,
      backgroundUrl: normalizeAssetUrl(set.backgroundUrl)
    }))
    beatmapSets.value = normalized
    
    // 初始化选中难度状态
    normalized.forEach(set => {
      selectedDifficulties.value[set.id] = null
    })
  } catch (error) {
    console.error('加载谱面失败:', error)
  } finally {
    loading.value = false
  }
}

const getDifficultyOptions = (set) => {
  return set.difficulties.map(diff => ({
    label: `${diff.version} (${diff.columns}K) - OD${diff.overallDifficulty}`,
    value: diff.id
  }))
}

const handleDifficultySelect = (setId, value) => {
  const normalized = Array.isArray(value) ? value[0] : value
  selectedDifficulties.value[setId] = normalized || null
}

const getSelectedDifficultyLabel = (set, diffId) => {
  const diff = set.difficulties.find(item => item.id === diffId)
  if (!diff) return '已选择'
  return `${diff.version} (${diff.columns}K) - OD${diff.overallDifficulty}`
}

const preloadImage = (src) => {
  if (!src) return Promise.resolve(false)
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = src
  })
}

const preloadAudio = (src) => {
  if (!src) return Promise.resolve(false)
  return new Promise(resolve => {
    const audio = new Audio()
    audio.preload = 'auto'
    let timer = null
    const cleanup = () => {
      audio.removeEventListener('canplaythrough', onReady)
      audio.removeEventListener('loadeddata', onReady)
      audio.removeEventListener('error', onError)
      if (timer) clearTimeout(timer)
    }
    const onReady = () => {
      cleanup()
      resolve(true)
    }
    const onError = () => {
      cleanup()
      resolve(false)
    }
    audio.addEventListener('canplaythrough', onReady, { once: true })
    audio.addEventListener('loadeddata', onReady, { once: true })
    audio.addEventListener('error', onError, { once: true })
    audio.src = src
    audio.load()
    timer = setTimeout(() => {
      cleanup()
      resolve(false)
    }, 8000)
  })
}

const preloadGameAssets = async (diffId) => {
  const steps = []
  const updateProgress = (value, label) => {
    preloadProgress.value = Math.min(100, Math.max(0, Math.round(value)))
    if (label) preloadLabel.value = label
  }

  steps.push(async () => {
    updateProgress(5, '加载渲染引擎...')
    if (process.client) {
      await import('pixi.js')
    }
  })

  steps.push(async () => {
    updateProgress(35, '加载游戏纹理...')
    const texturePaths = [
      '/assets/textures/noteN.png',
      '/assets/textures/noteC.png',
      '/assets/textures/noteL.png',
      '/assets/textures/noteF.png',
      '/assets/textures/path.png',
      '/assets/textures/path_critical.png'
    ]
    await Promise.all(texturePaths.map(preloadImage))
  })

  steps.push(async () => {
    updateProgress(65, '加载谱面资源...')
    const data = await $fetch(`${baseURL}/beatmaps/difficulty/${diffId}`)
    const audioUrl = normalizeAssetUrl(data.audioUrl)
    const backgroundUrl = normalizeAssetUrl(data.backgroundUrl)
    await Promise.all([preloadImage(backgroundUrl), preloadAudio(audioUrl)])
  })

  for (let i = 0; i < steps.length; i++) {
    await steps[i]()
    updateProgress(((i + 1) / steps.length) * 100)
  }
}

const startGame = async (setId) => {
  const diffId = selectedDifficulties.value[setId]
  if (!diffId || isPreloading.value) {
    return
  }

  isPreloading.value = true
  preloadProgress.value = 0
  preloadLabel.value = '准备资源...'

  try {
    await preloadGameAssets(diffId)
    await navigateTo(`/mania/${diffId}`)
  } catch (error) {
    console.error('预加载资源失败:', error)
  } finally {
    isPreloading.value = false
  }
}

const normalizeAssetUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('/api/')) {
    return `${baseURL}${url.replace('/api', '')}`
  }
  return `${baseURL}/${url.replace(/^\/+/, '')}`
}

onMounted(() => {
  fetchBeatmaps()
})
</script>

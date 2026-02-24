<template>
  <n-modal
    v-model:show="showProxy"
    preset="card"
    :bordered="false"
    class="bg-white/95 text-slate-900 dark:bg-slate-900/95 dark:text-slate-100 backdrop-blur-xl shadow-2xl"
    style="width: 720px; max-width: 92vw;"
    :mask-closable="true"
  >
    <template #header>
      <div class="flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-cyan-600 dark:text-cyan-400">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
        </svg>
        <span class="font-semibold">按键设置</span>
      </div>
    </template>

    <div class="space-y-5">
      <div class="text-xs text-slate-600 dark:text-slate-400">
        点击键位开始录制，按 Esc 取消录制。设置会自动保存。
      </div>

      <div v-for="cols in columnsList" :key="cols" class="flex items-center gap-4">
        <span class="text-xs text-slate-600 dark:text-slate-500 font-mono w-6 shrink-0">{{ cols }}K</span>
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="(key, i) in keyBindingsConfig[cols]"
            :key="i"
            @click="startRecording(cols, i)"
            class="min-w-[3rem] h-9 px-2 rounded-lg font-mono text-sm font-bold transition-all duration-150 select-none"
            :class="recording && recording.cols === cols && recording.index === i
              ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-400/60 animate-pulse'
              : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 dark:border-white/10'"
          >
            {{ recording && recording.cols === cols && recording.index === i ? '...' : key }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <button
          @click="resetKeyBindings"
          class="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors underline underline-offset-2"
        >
          恢复默认
        </button>
        <div class="flex items-center gap-2">
          <n-button quaternary @click="closeModal">关闭</n-button>
        </div>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { NButton, NModal } from 'naive-ui'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:show'])

const showProxy = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const columnsList = [4, 5, 6, 7, 8]

const KEYBINDING_STORAGE_KEY = 'mania-keybindings'
const DEFAULT_BINDINGS = {
  4: ['D', 'F', 'J', 'K'],
  5: ['D', 'F', 'Space', 'J', 'K'],
  6: ['S', 'D', 'F', 'J', 'K', 'L'],
  7: ['S', 'D', 'F', 'Space', 'J', 'K', 'L'],
  8: ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';']
}

const recording = ref(null)
const keyBindingsConfig = ref(loadKeyBindings())

const closeModal = () => {
  showProxy.value = false
}

function cloneDefaults() {
  return Object.fromEntries(
    Object.entries(DEFAULT_BINDINGS).map(([k, v]) => [k, [...v]])
  )
}

function loadKeyBindings() {
  if (typeof localStorage === 'undefined') return cloneDefaults()
  try {
    const stored = JSON.parse(localStorage.getItem(KEYBINDING_STORAGE_KEY) || '{}')
    const result = {}
    for (const cols of columnsList) {
      result[cols] = (stored[cols] && Array.isArray(stored[cols]) && stored[cols].length === cols)
        ? [...stored[cols]]
        : [...DEFAULT_BINDINGS[cols]]
    }
    return result
  } catch {
    return cloneDefaults()
  }
}

function saveKeyBindings() {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEYBINDING_STORAGE_KEY, JSON.stringify(keyBindingsConfig.value))
}

function startRecording(cols, index) {
  recording.value = { cols, index }
}

function onRecordKeyDown(e) {
  if (!recording.value) return
  e.preventDefault()
  e.stopPropagation()

  if (e.key === 'Escape') {
    recording.value = null
    return
  }

  const { cols, index } = recording.value
  let keyName
  if (e.key === ' ' || e.code === 'Space') keyName = 'Space'
  else if (e.key.length === 1) keyName = e.key.toUpperCase()
  else keyName = e.key

  keyBindingsConfig.value[cols][index] = keyName
  saveKeyBindings()
  recording.value = null
}

function resetKeyBindings() {
  keyBindingsConfig.value = cloneDefaults()
  saveKeyBindings()
}

watch(() => props.show, (val) => {
  if (typeof window === 'undefined') return
  if (val) {
    keyBindingsConfig.value = loadKeyBindings()
    window.removeEventListener('keydown', onRecordKeyDown)
    window.addEventListener('keydown', onRecordKeyDown)
  } else {
    window.removeEventListener('keydown', onRecordKeyDown)
    recording.value = null
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onRecordKeyDown)
  }
})
</script>

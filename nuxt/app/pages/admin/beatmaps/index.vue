<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">谱面管理</h2>
        <p class="text-gray-500 dark:text-gray-400">仅支持 osu!mania，上传 .osz 后自动解析</p>
      </div>
    </div>

    <n-card>
      <template #header>
        <div class="flex items-center gap-2">
          <Icon name="cloud-arrow-up" size="md" />
          上传谱面
        </div>
      </template>
      <n-upload
        :custom-request="handleUpload"
        accept=".osz"
        :max="1"
        :show-file-list="false"
      >
        <n-upload-dragger class="!p-10 !rounded-xl !border-2 hover:!border-purple-500 !transition-colors">
          <div class="flex flex-col items-center gap-2">
            <Icon name="cloud-arrow-up" size="2xl" class="text-purple-500" />
            <p class="text-base font-medium">拖拽 .osz 到这里，或点击上传</p>
            <p class="text-sm text-gray-400">仅解析 osu!mania，其他模式将被忽略</p>
          </div>
        </n-upload-dragger>
      </n-upload>
      <div class="mt-4 flex items-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div class="flex items-center gap-2">
          <Icon name="folder-open" class="text-gray-400" />
          <span class="text-sm font-medium">上传路径:</span>
        </div>
        <n-input
          v-model:value="uploadPath"
          placeholder="可选 (如: beatmaps/2024)"
          size="small"
          class="w-64"
        />
        <div class="text-xs text-gray-400 ml-auto">
          将创建子文件夹: <span class="font-mono">{{ oszFolderPreview }}</span>
        </div>
      </div>
    </n-card>

    <n-card title="谱面列表">
      <n-spin :show="loading">
        <div v-if="!loading && beatmapSets.length === 0" class="text-center py-8 text-gray-400">
          <Icon name="inbox" size="3xl" class="mb-3 opacity-50" />
          <p>暂无谱面，请先上传 .osz</p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="set in beatmapSets"
            :key="set.id"
            class="rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="text-lg font-semibold text-gray-800 dark:text-white">{{ set.title }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ set.artist }} · {{ set.creator }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <n-tag v-if="set.previewTime !== null && set.previewTime !== undefined" type="info" size="small">
                  Preview {{ set.previewTime }}ms
                </n-tag>
                <n-tag type="success" size="small">共 {{ set.difficulties.length }} 个难度</n-tag>
                <n-button size="small" type="error" quaternary @click="confirmDelete(set)">
                  <template #icon>
                    <Icon name="trash" size="sm" />
                  </template>
                  删除
                </n-button>
              </div>
            </div>
            <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div
                v-for="diff in set.difficulties"
                :key="diff.id"
                class="rounded-lg bg-gray-50 dark:bg-gray-800/60 p-3 flex flex-col gap-1"
              >
                <div class="flex items-center justify-between">
                  <span class="font-medium text-gray-700 dark:text-gray-200">{{ diff.version }}</span>
                  <n-tag size="small" type="warning">{{ diff.columns }}K</n-tag>
                </div>
                <p class="text-xs text-gray-500">OD {{ diff.overallDifficulty }} · Notes {{ diff.noteCount }}</p>
                <n-button size="small" secondary @click="goPlay(diff.id)">
                  进入试玩
                </n-button>
              </div>
            </div>
          </div>
        </div>
      </n-spin>
    </n-card>

    <n-modal v-model:show="showDeleteModal" preset="dialog" type="warning" title="确认删除">
      <div class="space-y-3">
        <p>确定要删除谱面集「{{ setToDelete?.title }}」吗？此操作不可撤销。</p>
        <div class="flex justify-end gap-2">
          <n-button @click="showDeleteModal = false">取消</n-button>
          <n-button type="error" :loading="deleting" @click="handleDelete">确认删除</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
import JSZip from 'jszip'
import { NCard, NUpload, NUploadDragger, NSpin, NTag, NButton, NInput, NModal, useMessage } from 'naive-ui'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const message = useMessage()
const config = useRuntimeConfig()
const baseURL = config.public.apiBase
const authStore = useAuthStore()
const imagebedApi = useImagebed()

const loading = ref(false)
const deleting = ref(false)
const beatmapSets = ref([])
const uploadPath = ref('')
const lastOszFolder = ref('')
const showDeleteModal = ref(false)
const setToDelete = ref(null)
const allowedExtensions = new Set([
  '.osu',
  '.ogg',
  '.mp3',
  '.wav',
  '.flac',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.bmp',
  '.gif'
])

const normalizePath = (value) => (value || '').replace(/\\/g, '/').replace(/^\/+/, '')
const getExtension = (value) => {
  const index = value.lastIndexOf('.')
  return index >= 0 ? value.slice(index).toLowerCase() : ''
}
const getDirName = (value) => {
  const index = value.lastIndexOf('/')
  return index >= 0 ? value.slice(0, index) : ''
}
const normalizeFolder = (value) => (value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
const buildUploadFolder = (...segments) => segments.map(normalizeFolder).filter(Boolean).join('/')
const getOszBaseName = (value) => {
  const safeValue = (value || '').replace(/\\/g, '/')
  const base = safeValue.split('/').pop() || ''
  return base.replace(/\.osz$/i, '').trim()
}
const sanitizeFolderName = (value) => {
  const normalized = (value || '').trim()
  if (!normalized) return ''
  return normalized
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
}
const createStorageKey = (fileName) => {
  const baseName = sanitizeFolderName(getOszBaseName(fileName))
  if (baseName) {
    return baseName
  }
  const uuid = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
  return `set-${uuid.replace(/-/g, '')}`
}
const oszFolderPreview = computed(() => lastOszFolder.value || 'osz文件名')

const fetchBeatmaps = async () => {
  loading.value = true
  try {
    const data = await $fetch(`${baseURL}/beatmaps`)
    beatmapSets.value = data || []
  } catch (error) {
    console.error('加载谱面失败:', error)
    message.error('加载谱面失败')
  } finally {
    loading.value = false
  }
}

const handleUpload = async ({ file, onError, onFinish }) => {
  if (!file?.file) {
    onError?.()
    return
  }

  try {
    loading.value = true
    const configData = await imagebedApi.getConfig()
    if (!configData?.domain || !configData?.apiToken) {
      throw new Error('请先在图床管理中配置 Domain 和 API Token')
    }

    const storageKey = createStorageKey(file.file.name)
    lastOszFolder.value = storageKey
    const zip = await JSZip.loadAsync(file.file)
    const entries = Object.values(zip.files).filter(entry => !entry.dir)

    const uploadedFiles = []
    const uploadedMap = new Set()
    const osuFiles = []

    const baseUploadFolder = buildUploadFolder(
      configData.uploadFolder,
      uploadPath.value,
      storageKey
    )

    for (const entry of entries) {
      const entryPath = normalizePath(entry.name)
      const extension = getExtension(entryPath)
      if (!allowedExtensions.has(extension)) {
        continue
      }

      if (extension === '.osu') {
        const content = await entry.async('string')
        osuFiles.push({ path: entryPath, content })
        continue
      }

      if (uploadedMap.has(entryPath)) {
        continue
      }

      const blob = await entry.async('blob')
      const fileName = entryPath.split('/').pop() || entryPath
      const uploadFile = new File([blob], fileName, {
        type: blob.type || 'application/octet-stream'
      })
      const uploadFolder = buildUploadFolder(baseUploadFolder, getDirName(entryPath))

      const result = await imagebedApi.uploadImage(uploadFile, {
        domain: configData.domain,
        apiToken: configData.apiToken,
        uploadFolder
      })

      uploadedFiles.push({ path: entryPath, src: result.src })
      uploadedMap.add(entryPath)
    }

    if (osuFiles.length === 0) {
      throw new Error('未找到 .osu 文件')
    }

    await authStore.authFetch('/beatmaps/import', {
      method: 'POST',
      body: {
        sourceFileName: file.file.name,
        storageKey,
        uploadPath: normalizeFolder(uploadPath.value),
        uploadedFiles,
        osuFiles
      }
    })
    message.success('上传成功，已解析 osu!mania 谱面')
    await fetchBeatmaps()
    onFinish?.()
  } catch (error) {
    console.error('上传失败:', error)
    message.error(error?.data?.error || error?.message || '上传失败')
    onError?.()
  } finally {
    loading.value = false
  }
}

const confirmDelete = (set) => {
  setToDelete.value = set
  showDeleteModal.value = true
}

const handleDelete = async () => {
  if (!setToDelete.value) return
  deleting.value = true
  try {
    await authStore.authFetch(`/beatmaps/${setToDelete.value.id}`, {
      method: 'DELETE'
    })
    message.success('谱面已删除')
    showDeleteModal.value = false
    setToDelete.value = null
    await fetchBeatmaps()
  } catch (error) {
    console.error('删除谱面失败:', error)
    message.error(error?.data?.error || error?.message || '删除谱面失败')
  } finally {
    deleting.value = false
  }
}

const goPlay = (difficultyId) => {
  navigateTo(`/mania/${difficultyId}`)
}

onMounted(fetchBeatmaps)
</script>

<template>
  <div class="gallery-manager">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-white">画廊管理</h2>
      <div class="flex gap-2">
        <n-button type="warning" :loading="isRefreshingDimensions" @click="refreshAllDimensions">
          <template #icon>
            <Icon name="arrow-path" size="sm" />
          </template>
          刷新宽高
        </n-button>
        <n-button type="success" @click="showBatchImportModal = true">
          <template #icon>
            <Icon name="arrow-up-tray" size="sm" />
          </template>
          批量导入
        </n-button>
        <n-button type="primary" @click="showCreateModal">
          <template #icon>
            <Icon name="plus-circle" size="sm" />
          </template>
          添加图片
        </n-button>
      </div>
    </div>

    <n-card class="mb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <Icon name="cog-6-tooth" size="sm" class="text-gray-500" />
          <span class="font-semibold text-gray-700 dark:text-gray-200">缩略图设置（Cloudflare）</span>
          <n-tag :type="cfConfigForm.isEnabled ? 'success' : 'default'" size="small">
            {{ cfConfigForm.isEnabled ? '已启用' : '未启用' }}
          </n-tag>
        </div>
        <div class="flex gap-2">
          <n-button size="small" quaternary :loading="isLoadingCfConfig" @click="loadCfConfig">
            <template #icon>
              <Icon name="arrow-path" size="sm" />
            </template>
            刷新
          </n-button>
          <n-button size="small" type="primary" :loading="isSavingCfConfig" @click="saveCfConfig">
            保存设置
          </n-button>
        </div>
      </div>

      <n-spin :show="isLoadingCfConfig">
        <n-form :model="cfConfigForm" label-placement="left" label-width="120">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <n-form-item label="启用缩略图">
              <n-switch v-model:value="cfConfigForm.isEnabled" />
            </n-form-item>
            <n-form-item label="使用 Worker">
              <n-switch v-model:value="cfConfigForm.useWorker" />
            </n-form-item>
            <n-form-item label="强制 HTTPS">
              <n-switch v-model:value="cfConfigForm.useHttps" />
            </n-form-item>
            <n-form-item label="Zone 域名">
              <n-input v-model:value="cfConfigForm.zoneDomain" placeholder="imgbed.test.test 或 https://imgbed.test.test" />
            </n-form-item>
            <n-form-item v-if="cfConfigForm.useWorker" label="Worker 域名">
              <n-input v-model:value="cfConfigForm.workerBaseUrl" placeholder="https://imgworker.wasd09090030.top" />
            </n-form-item>
            <n-form-item v-if="cfConfigForm.useWorker" label="签名有效期(秒)">
              <n-input-number v-model:value="cfConfigForm.tokenTtlSeconds" :min="60" />
            </n-form-item>
            <n-form-item label="缩放模式">
              <n-select v-model:value="cfConfigForm.fit" :options="fitOptions" filterable />
            </n-form-item>
            <n-form-item label="缩略图宽度">
              <n-input-number v-model:value="cfConfigForm.width" :min="0" />
            </n-form-item>
            <n-form-item label="图片质量">
              <n-input-number v-model:value="cfConfigForm.quality" :min="0" :max="100" />
            </n-form-item>
            <n-form-item label="输出格式">
              <n-select v-model:value="cfConfigForm.format" :options="formatOptions" filterable />
            </n-form-item>
            <n-form-item label="签名参数名">
              <n-input v-model:value="cfConfigForm.signatureParam" placeholder="sig" />
            </n-form-item>
            <n-form-item label="签名 Token">
              <n-input v-model:value="cfConfigForm.signatureToken" placeholder="与 WAF 规则匹配的 token" />
            </n-form-item>
            <n-form-item label="签名 Secret">
              <n-input
                v-model:value="cfConfigForm.signatureSecret"
                type="password"
                show-password-on="click"
                placeholder="可选 HMAC 密钥"
              />
            </n-form-item>
          </div>
        </n-form>
        <p class="text-xs text-gray-500 mt-3">
          提示：使用 Worker 时必须配置“签名 Secret”并设置有效期；仅用 Token 只用于 WAF 规则匹配，不具备验签安全性。
        </p>
      </n-spin>
    </n-card>

    <n-spin :show="loading">
      <div v-if="!loading && galleries.length === 0" class="text-center py-16 text-gray-400">
        <Icon name="images" size="3xl" class="mb-3 opacity-50" />
        <h4 class="text-xl mb-2">暂无图片</h4>
        <p>点击上方按钮添加第一张图片</p>
      </div>

      <template v-else>
        <GalleryFilterBar
          :active-tab="activeTab"
          :sort-by="sortBy"
          :total-count="galleries.length"
          :game-count="gameCount"
          :artwork-count="artworkCount"
          :sort-options="sortOptions"
          :on-update-tab="(v) => (activeTab = v)"
          :on-update-sort="(v) => (sortBy = v)"
        />

        <GalleryCardGrid
          :galleries="filteredAndSortedGalleries"
          :sort-by="sortBy"
          :dragged-gallery="draggedGallery"
          :drag-over-gallery="dragOverGallery"
          :drag-position="dragPosition"
          :handle-drag-start="handleDragStart"
          :handle-drag-over="handleDragOver"
          :handle-drop="handleDrop"
          :handle-drag-end="handleDragEnd"
          :edit-gallery="editGallery"
          :toggle-active="toggleActive"
          :confirm-delete="confirmDelete"
          :format-dimensions="formatDimensions"
          :format-date="formatDate"
          :handle-image-error="handleImageError"
        />
      </template>
    </n-spin>

    <GalleryEditModal
      :show="showGalleryModal"
      :is-edit="isEdit"
      :is-saving="isSaving"
      :is-valid-preview="isValidPreview"
      :gallery-form="galleryForm"
      :on-update-show="(v) => (showGalleryModal = v)"
      :on-update-image-url="(v) => (galleryForm.imageUrl = v)"
      :on-update-sort-order="(v) => (galleryForm.sortOrder = v)"
      :on-update-tag="(v) => (galleryForm.tag = v)"
      :on-update-active="(v) => (galleryForm.isActive = v)"
      :on-update-created-at="(v) => (galleryForm.createdAt = v)"
      :on-preview-error="() => (isValidPreview = false)"
      :on-preview-load="() => (isValidPreview = true)"
      :on-cancel="closeGalleryModal"
      :on-save="saveGallery"
    />

    <n-modal v-model:show="showDeleteModal" preset="dialog" type="warning" title="确认删除">
      <template #default>
        <p>确定要删除这张图片吗？</p>
        <p class="text-gray-500 text-sm">此操作无法撤销。</p>
      </template>
      <template #action>
        <n-button @click="showDeleteModal = false">取消</n-button>
        <n-button type="error" :loading="isDeleting" @click="deleteGalleryItem">删除</n-button>
      </template>
    </n-modal>

    <n-modal v-model:show="showBatchImportModal" preset="card" title="批量导入图片" style="width: 600px;">
      <n-form>
        <n-form-item label="图片URL列表">
          <n-input
            v-model:value="batchImportUrls"
            type="textarea"
            :rows="10"
            placeholder="每行一个图片URL，例如：
https://example.com/image1.jpg
https://example.com/image2.jpg
https://example.com/image3.jpg"
          />
        </n-form-item>

        <n-form-item>
          <n-checkbox v-model:checked="batchImportActive">
            导入后立即在前端显示
          </n-checkbox>
        </n-form-item>

        <n-form-item label="类型">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">艺术作品</span>
            <n-switch v-model:value="batchImportTag" checked-value="game" unchecked-value="artwork">
              <template #checked>游戏截屏</template>
              <template #unchecked>艺术作品</template>
            </n-switch>
            <span class="text-sm text-gray-500">游戏截屏</span>
          </div>
        </n-form-item>

        <n-alert v-if="batchPreviewUrls.length > 0" type="info">
          将导入 {{ batchPreviewUrls.length }} 张图片
        </n-alert>
      </n-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showBatchImportModal = false">取消</n-button>
          <n-button
            type="success"
            :loading="isBatchImporting"
            :disabled="batchPreviewUrls.length === 0"
            @click="handleBatchImport"
          >
            导入 {{ batchPreviewUrls.length }} 张图片
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { useAdminGalleryFeature } from '~/features/gallery-admin/composables/useAdminGalleryFeature'
import GalleryFilterBar from '~/features/gallery-admin/components/gallery/GalleryFilterBar.vue'
import GalleryCardGrid from '~/features/gallery-admin/components/gallery/GalleryCardGrid.vue'
import GalleryEditModal from '~/features/gallery-admin/components/gallery/GalleryEditModal.vue'
import { mapErrorToUserMessage } from '~/shared/errors'

const message = useMessage()
// 设计说明：本容器承接原 pages/admin/gallery/index 的业务状态与副作用。
// 这样页面入口只负责路由编排，复杂逻辑集中在 feature 层，便于维护与回归。
const {
  getAllGalleries,
  createGallery,
  updateGallery,
  deleteGallery,
  toggleActive: toggleActiveApi,
  batchImport,
  updateSort,
  refreshDimensions
} = useAdminGalleryFeature()
const cfConfigApi = useCfImageConfig()

const galleries = ref([])
const loading = ref(true)
const isSaving = ref(false)
const isDeleting = ref(false)
const isBatchImporting = ref(false)
const isRefreshingDimensions = ref(false)
const isLoadingCfConfig = ref(false)
const isSavingCfConfig = ref(false)
const isEdit = ref(false)
const galleryToDelete = ref(null)
const isValidPreview = ref(true)
const draggedGallery = ref(null)
const dragOverGallery = ref(null)
const dragPosition = ref('before')
const lastDragMoveKey = ref('')

const activeTab = ref('all')
const sortBy = ref('manual')

const showGalleryModal = ref(false)
const showDeleteModal = ref(false)
const showBatchImportModal = ref(false)

const batchImportUrls = ref('')
const batchImportActive = ref(true)
const batchImportTag = ref('artwork')

const defaultCfConfig = {
  isEnabled: true,
  zoneDomain: '',
  useHttps: true,
  fit: 'scale-down',
  width: 300,
  quality: 50,
  format: 'webp',
  signatureParam: 'sig',
  useWorker: false,
  workerBaseUrl: '',
  tokenTtlSeconds: 3600,
  signatureToken: '',
  signatureSecret: ''
}

const cfConfigForm = ref({ ...defaultCfConfig })

const fitOptions = [
  { label: 'scale-down', value: 'scale-down' },
  { label: 'cover', value: 'cover' },
  { label: 'contain', value: 'contain' },
  { label: 'fill', value: 'fill' },
  { label: 'crop', value: 'crop' },
  { label: 'pad', value: 'pad' }
]

const formatOptions = [
  { label: 'webp', value: 'webp' },
  { label: 'avif', value: 'avif' },
  { label: 'jpeg', value: 'jpeg' },
  { label: 'png', value: 'png' },
  { label: 'auto', value: 'auto' }
]

const sortOptions = [
  { label: '手动排序', value: 'manual' },
  { label: '最新上传', value: 'newest' },
  { label: '最早上传', value: 'oldest' }
]

const galleryForm = reactive({
  id: null,
  imageUrl: '',
  sortOrder: null,
  isActive: true,
  tag: 'artwork',
  createdAt: null
})

const gameCount = computed(() => galleries.value.filter(g => g.tag === 'game').length)
const artworkCount = computed(() => galleries.value.filter(g => g.tag === 'artwork').length)

const filteredAndSortedGalleries = computed(() => {
  let filtered = [...galleries.value]

  if (activeTab.value === 'game') {
    filtered = filtered.filter(g => g.tag === 'game')
  } else if (activeTab.value === 'artwork') {
    filtered = filtered.filter(g => g.tag === 'artwork')
  }

  if (sortBy.value === 'newest') {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } else if (sortBy.value === 'oldest') {
    filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  return filtered
})

const batchPreviewUrls = computed(() => {
  if (!batchImportUrls.value) return []
  return batchImportUrls.value
    .split('\n')
    .map(url => url.trim())
    .filter(url => url.length > 0)
})

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDimensions = (gallery) => {
  if (!gallery) return '-'
  if (gallery.imageWidth && gallery.imageHeight) {
    return `${gallery.imageWidth}x${gallery.imageHeight}`
  }
  return '-'
}

const fetchGalleries = async () => {
  loading.value = true
  try {
    galleries.value = await getAllGalleries()
  } catch (error) {
    console.error('获取画廊失败:', error)
    message.error(mapErrorToUserMessage(error, '获取画廊失败'))
  } finally {
    loading.value = false
  }
}

const showCreateModal = () => {
  isEdit.value = false
  galleryForm.id = null
  galleryForm.imageUrl = ''
  galleryForm.sortOrder = null
  galleryForm.isActive = true
  galleryForm.tag = 'artwork'
  isValidPreview.value = true
  showGalleryModal.value = true
}

const editGallery = (gallery) => {
  isEdit.value = true
  galleryForm.id = gallery.id
  galleryForm.imageUrl = gallery.imageUrl
  galleryForm.sortOrder = gallery.sortOrder ?? null
  galleryForm.isActive = gallery.isActive
  galleryForm.tag = gallery.tag || 'artwork'
  galleryForm.createdAt = gallery.createdAt ?? null
  isValidPreview.value = true
  showGalleryModal.value = true
}

const closeGalleryModal = () => {
  showGalleryModal.value = false
  galleryForm.id = null
  galleryForm.imageUrl = ''
  galleryForm.sortOrder = null
  galleryForm.isActive = true
  galleryForm.tag = 'artwork'
  galleryForm.createdAt = null
}

const saveGallery = async () => {
  if (!galleryForm.imageUrl?.trim()) {
    message.warning('请输入图片URL')
    return
  }

  isSaving.value = true
  try {
    const normalizedSortOrder = Number(galleryForm.sortOrder)
    const payload = {
      imageUrl: galleryForm.imageUrl,
      isActive: galleryForm.isActive,
      tag: galleryForm.tag,
      sortOrder: Number.isInteger(normalizedSortOrder) && normalizedSortOrder > 0
        ? normalizedSortOrder
        : undefined,
      ...(isEdit.value && galleryForm.createdAt ? { createdAt: galleryForm.createdAt } : {})
    }

    if (isEdit.value) {
      await updateGallery(galleryForm.id, payload)
      message.success('图片更新成功！')
    } else {
      await createGallery(payload)
      message.success('图片创建成功！')
    }

    closeGalleryModal()
    fetchGalleries()
  } catch (error) {
    console.error('保存画廊失败:', error)
    message.error(mapErrorToUserMessage(error, '保存画廊失败'))
  } finally {
    isSaving.value = false
  }
}

const toggleActive = async (gallery) => {
  try {
    await toggleActiveApi(gallery.id)
    gallery.isActive = !gallery.isActive
    message.success(gallery.isActive ? '图片已显示' : '图片已隐藏')
  } catch (error) {
    console.error('切换状态失败:', error)
    message.error(mapErrorToUserMessage(error, '切换状态失败'))
  }
}

const confirmDelete = (gallery) => {
  galleryToDelete.value = gallery
  showDeleteModal.value = true
}

const deleteGalleryItem = async () => {
  if (!galleryToDelete.value) return

  isDeleting.value = true
  try {
    await deleteGallery(galleryToDelete.value.id)
    showDeleteModal.value = false
    galleryToDelete.value = null
    fetchGalleries()
    message.success('图片已删除')
  } catch (error) {
    console.error('删除画廊失败:', error)
    message.error(mapErrorToUserMessage(error, '删除画廊失败'))
  } finally {
    isDeleting.value = false
  }
}

const handleBatchImport = async () => {
  if (batchPreviewUrls.value.length === 0) return

  isBatchImporting.value = true
  try {
    await batchImport({
      imageUrls: batchPreviewUrls.value,
      isActive: batchImportActive.value,
      tag: batchImportTag.value
    })
    showBatchImportModal.value = false
    batchImportUrls.value = ''
    batchImportTag.value = 'artwork'
    fetchGalleries()
    message.success(`成功导入 ${batchPreviewUrls.value.length} 张图片`)
  } catch (error) {
    console.error('批量导入失败:', error)
    message.error(mapErrorToUserMessage(error, '批量导入失败'))
  } finally {
    isBatchImporting.value = false
  }
}

const refreshAllDimensions = async () => {
  isRefreshingDimensions.value = true
  try {
    const result = await refreshDimensions()
    await fetchGalleries()
    message.success(`刷新完成：成功 ${result.updated} / ${result.total}，失败 ${result.failed}`)
  } catch (error) {
    console.error('刷新宽高失败:', error)
    message.error(mapErrorToUserMessage(error, '刷新宽高失败'))
  } finally {
    isRefreshingDimensions.value = false
  }
}

const handleDragStart = (event, gallery) => {
  if (sortBy.value !== 'manual') return
  draggedGallery.value = gallery
  dragOverGallery.value = null
  dragPosition.value = 'before'
  lastDragMoveKey.value = ''
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragOver = (event, targetGallery) => {
  if (sortBy.value !== 'manual') return
  if (!draggedGallery.value || draggedGallery.value.id === targetGallery.id) return

  event.dataTransfer.dropEffect = 'move'

  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) return

  const rect = currentTarget.getBoundingClientRect()
  const nextDragPosition = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  const moveKey = `${targetGallery.id}-${nextDragPosition}`

  dragOverGallery.value = targetGallery
  dragPosition.value = nextDragPosition

  if (lastDragMoveKey.value === moveKey) return

  const draggedIndex = galleries.value.findIndex(g => g.id === draggedGallery.value.id)
  const targetIndex = galleries.value.findIndex(g => g.id === targetGallery.id)
  if (draggedIndex === -1 || targetIndex === -1) return

  const [movedGallery] = galleries.value.splice(draggedIndex, 1)
  let insertIndex = targetIndex
  if (draggedIndex < targetIndex) {
    insertIndex -= 1
  }
  if (nextDragPosition === 'after') {
    insertIndex += 1
  }

  galleries.value.splice(insertIndex, 0, movedGallery)
  lastDragMoveKey.value = moveKey
}

const handleDrop = async (event) => {
  event.preventDefault()
  if (sortBy.value !== 'manual') {
    message.warning('请切换到"手动排序"模式才能拖拽调整顺序')
    return
  }
  if (!draggedGallery.value) return

  const hasOrderChanged = galleries.value.some((gallery, index) => (gallery.sortOrder || 0) !== index + 1)
  if (!hasOrderChanged) return

  try {
    const sortData = galleries.value.map((g, index) => ({
      id: g.id,
      sortOrder: index + 1
    }))
    await updateSort(sortData)
    galleries.value = galleries.value.map((gallery, index) => ({
      ...gallery,
      sortOrder: index + 1
    }))
    message.success('排序已更新')
  } catch (error) {
    console.error('更新排序失败:', error)
    message.error(mapErrorToUserMessage(error, '更新排序失败'))
    // 降级策略：排序持久化失败时回拉服务端顺序，避免前端临时顺序与后端不一致。
    fetchGalleries()
  }
}

const handleDragEnd = () => {
  draggedGallery.value = null
  dragOverGallery.value = null
  dragPosition.value = 'before'
  lastDragMoveKey.value = ''
}

const handleImageError = (event) => {
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23eee" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3E加载失败%3C/text%3E%3C/svg%3E'
}

const loadCfConfig = async () => {
  isLoadingCfConfig.value = true
  try {
    const config = await cfConfigApi.getConfig()
    cfConfigForm.value = {
      ...defaultCfConfig,
      ...config
    }
  } catch (error) {
    console.error('获取缩略图配置失败:', error)
    message.error(mapErrorToUserMessage(error, '获取缩略图配置失败'))
  } finally {
    isLoadingCfConfig.value = false
  }
}

const saveCfConfig = async () => {
  isSavingCfConfig.value = true
  try {
    const payload = {
      ...cfConfigForm.value,
      width: cfConfigForm.value.width ?? 0,
      quality: cfConfigForm.value.quality ?? 0,
      tokenTtlSeconds: cfConfigForm.value.tokenTtlSeconds ?? 3600
    }
    await cfConfigApi.saveConfig(payload)
    message.success('缩略图配置已保存')
  } catch (error) {
    console.error('保存缩略图配置失败:', error)
    message.error(mapErrorToUserMessage(error, '保存缩略图配置失败'))
  } finally {
    isSavingCfConfig.value = false
  }
}

onMounted(() => {
  // 首屏并行加载策略：画廊数据与 CF 配置同时初始化，任何单项失败都不阻塞另一项。
  fetchGalleries()
  loadCfConfig()
})
</script>

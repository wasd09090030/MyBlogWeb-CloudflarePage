<template>
  <div class="image-processor">
    <!-- 隐私提示 -->
    <n-alert type="success" :bordered="false" class="privacy-notice">
      <template #icon>
        <Icon name="shield-check" size="md" />
      </template>
      所有图像处理均在您的浏览器本地完成，文件不会上传到任何服务器
    </n-alert>

    <n-tabs v-model:value="activeTab" type="segment" animated>
      <n-tab-pane name="convert" tab="格式转换">
        <div class="processor-content">
          <div class="input-section">
            <div
              class="upload-area"
              :class="{ 'has-image': sourceImage, 'drag-over': isDragOver }"
              @click="triggerFileInput"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileSelect"
                hidden
              />
              <template v-if="!sourceImage">
                <Icon name="cloud-arrow-up" size="2xl" class="upload-icon" />
                <p class="upload-text">拖拽图片到此处，或点击选择</p>
                <p class="upload-hint">支持 PNG、JPG、WebP、AVIF、GIF、BMP</p>
              </template>
              <template v-else>
                <img :src="sourceImage" class="preview-image" alt="原图预览" />
                <div class="image-info">
                  <span>{{ imageInfo.name }}</span>
                  <span>{{ imageInfo.width }} × {{ imageInfo.height }}</span>
                  <span>{{ formatFileSize(imageInfo.size) }}</span>
                </div>
              </template>
            </div>
            <div v-if="sourceImage" class="action-buttons">
              <n-button @click="clearImage" quaternary>
                <template #icon><Icon name="trash" size="sm" /></template>
                清除
              </n-button>
            </div>
          </div>

          <div class="settings-section">
            <n-form label-placement="left" label-width="80">
              <n-form-item label="目标格式">
                <n-select
                  v-model:value="convertSettings.format"
                  :options="formatOptions"
                  style="width: 200px"
                />
              </n-form-item>
              <n-form-item v-if="convertSettings.format !== 'png'" label="质量">
                <n-slider
                  v-model:value="convertSettings.quality"
                  :min="1"
                  :max="100"
                  :step="1"
                  style="width: 200px"
                />
                <span class="slider-value">{{ convertSettings.quality }}%</span>
              </n-form-item>
            </n-form>
          </div>

          <div v-if="outputImage" class="output-section">
            <h4 class="section-title">输出预览</h4>
            <img :src="outputImage" class="output-preview" alt="输出预览" />
            <div class="output-info">
              <div class="size-comparison">
                <span>{{ formatFileSize(imageInfo.size) }}</span>
                <Icon name="arrow-right" size="sm" />
                <span :class="{ 'size-reduced': outputSize < imageInfo.size }">
                  {{ formatFileSize(outputSize) }}
                </span>
                <n-tag v-if="outputSize < imageInfo.size" type="success" size="small">
                  -{{ Math.round((1 - outputSize / imageInfo.size) * 100) }}%
                </n-tag>
              </div>
            </div>
            <n-button type="primary" @click="downloadOutput" :loading="isProcessing">
              <template #icon><Icon name="download" size="sm" /></template>
              下载图片
            </n-button>
          </div>

          <div v-if="sourceImage && !outputImage" class="convert-action">
            <n-button type="primary" size="large" @click="convertImage" :loading="isProcessing">
              <template #icon><Icon name="arrow-path" size="sm" /></template>
              转换格式
            </n-button>
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="compress" tab="图像压缩">
        <div class="processor-content">
          <div class="input-section">
            <div
              class="upload-area"
              :class="{ 'has-image': sourceImage, 'drag-over': isDragOver }"
              @click="triggerFileInput"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop.prevent="handleDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileSelect"
                hidden
              />
              <template v-if="!sourceImage">
                <Icon name="cloud-arrow-up" size="2xl" class="upload-icon" />
                <p class="upload-text">拖拽图片到此处，或点击选择</p>
                <p class="upload-hint">支持 PNG、JPG、WebP、AVIF、GIF、BMP</p>
              </template>
              <template v-else>
                <img :src="sourceImage" class="preview-image" alt="原图预览" />
                <div class="image-info">
                  <span>{{ imageInfo.name }}</span>
                  <span>{{ imageInfo.width }} × {{ imageInfo.height }}</span>
                  <span>{{ formatFileSize(imageInfo.size) }}</span>
                </div>
              </template>
            </div>
            <div v-if="sourceImage" class="action-buttons">
              <n-button @click="clearImage" quaternary>
                <template #icon><Icon name="trash" size="sm" /></template>
                清除
              </n-button>
            </div>
          </div>

          <div class="settings-section">
            <n-form label-placement="left" label-width="100">
              <n-form-item label="压缩质量">
                <n-slider
                  v-model:value="compressSettings.quality"
                  :min="1"
                  :max="100"
                  :step="1"
                  style="width: 200px"
                />
                <span class="slider-value">{{ compressSettings.quality }}%</span>
              </n-form-item>
              <n-form-item label="最大宽度">
                <n-input-number
                  v-model:value="compressSettings.maxWidth"
                  :min="0"
                  :max="10000"
                  placeholder="不限制"
                  style="width: 150px"
                />
                <span class="input-hint">px (0=不限制)</span>
              </n-form-item>
              <n-form-item label="最大高度">
                <n-input-number
                  v-model:value="compressSettings.maxHeight"
                  :min="0"
                  :max="10000"
                  placeholder="不限制"
                  style="width: 150px"
                />
                <span class="input-hint">px (0=不限制)</span>
              </n-form-item>
              <n-form-item label="输出格式">
                <n-select
                  v-model:value="compressSettings.format"
                  :options="formatOptions"
                  style="width: 200px"
                />
              </n-form-item>
            </n-form>
          </div>

          <div v-if="outputImage" class="output-section">
            <h4 class="section-title">压缩结果</h4>
            <img :src="outputImage" class="output-preview" alt="压缩预览" />
            <div class="output-info">
              <div class="size-comparison">
                <span>{{ formatFileSize(imageInfo.size) }}</span>
                <Icon name="arrow-right" size="sm" />
                <span :class="{ 'size-reduced': outputSize < imageInfo.size }">
                  {{ formatFileSize(outputSize) }}
                </span>
                <n-tag v-if="outputSize < imageInfo.size" type="success" size="small">
                  -{{ Math.round((1 - outputSize / imageInfo.size) * 100) }}%
                </n-tag>
              </div>
              <div v-if="outputDimensions" class="dimension-info">
                {{ outputDimensions.width }} × {{ outputDimensions.height }}
              </div>
            </div>
            <n-button type="primary" @click="downloadOutput" :loading="isProcessing">
              <template #icon><Icon name="download" size="sm" /></template>
              下载图片
            </n-button>
          </div>

          <div v-if="sourceImage && !outputImage" class="convert-action">
            <n-button type="primary" size="large" @click="compressImage" :loading="isProcessing">
              <template #icon><Icon name="arrows-pointing-in" size="sm" /></template>
              压缩图片
            </n-button>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useMessage } from 'naive-ui'
import imageCompression from 'browser-image-compression'
import { useImageProcessorWorker } from '~/composables/useImageProcessorWorker'

const message = useMessage()
const { convertImage: workerConvert, checkSupport: workerCheckSupport, isAvailable: isWorkerAvailable } = useImageProcessorWorker()

// Refs
const fileInput = ref(null)

// State
const activeTab = ref('convert')
const isDragOver = ref(false)
const isProcessing = ref(false)
const sourceImage = ref(null)
const sourceFile = ref(null)
const outputImage = ref(null)
const outputSize = ref(0)
const outputDimensions = ref(null)
const outputBlob = ref(null)

const imageInfo = ref({
  name: '',
  width: 0,
  height: 0,
  size: 0,
  type: ''
})

// Settings
const convertSettings = ref({
  format: 'webp',
  quality: 85
})

const compressSettings = ref({
  quality: 80,
  maxWidth: 0,
  maxHeight: 0,
  format: 'webp'
})

// Options
const formatOptions = [
  { label: 'WebP (推荐)', value: 'webp' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'PNG', value: 'png' },
  { label: 'AVIF', value: 'avif' }
]

// Methods
function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event) {
  const file = event.target.files?.[0]
  if (file) {
    loadImage(file)
  }
}

function handleDrop(event) {
  isDragOver.value = false
  const file = event.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) {
    loadImage(file)
  } else {
    message.warning('请拖入图片文件')
  }
}

function loadImage(file) {
  sourceFile.value = file
  outputImage.value = null
  outputBlob.value = null
  outputDimensions.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    sourceImage.value = e.target.result

    // Get image dimensions
    const img = new Image()
    img.onload = () => {
      imageInfo.value = {
        name: file.name,
        width: img.width,
        height: img.height,
        size: file.size,
        type: file.type
      }
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
}

function clearImage() {
  sourceImage.value = null
  sourceFile.value = null
  outputImage.value = null
  outputBlob.value = null
  outputDimensions.value = null
  imageInfo.value = { name: '', width: 0, height: 0, size: 0, type: '' }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getMimeType(format) {
  const mimeTypes = {
    'png': 'image/png',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'avif': 'image/avif'
  }
  return mimeTypes[format] || 'image/png'
}

function getFileExtension(format) {
  return format === 'jpeg' ? 'jpg' : format
}

// Check if browser supports the format
async function checkFormatSupport(format) {
  if (format === 'png' || format === 'jpeg') return true

  // 优先使用 Worker 检测（更准确，不阻塞主线程）
  if (isWorkerAvailable()) {
    try {
      const support = await workerCheckSupport()
      return support.formats[format] || false
    } catch { /* fall through */ }
  }

  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const dataUrl = canvas.toDataURL(getMimeType(format), 0.5)
  return dataUrl.startsWith(`data:${getMimeType(format)}`)
}

// Convert image format（Worker 加速，自动降级）
async function convertImage() {
  if (!sourceFile.value) return

  isProcessing.value = true

  try {
    const format = convertSettings.value.format

    // Check format support
    const supported = await checkFormatSupport(format)
    if (!supported) {
      message.warning(`您的浏览器不支持导出 ${format.toUpperCase()} 格式，将使用 WebP 代替`)
      convertSettings.value.format = 'webp'
    }

    const quality = convertSettings.value.quality / 100

    // 使用 Worker 进行格式转换（OffscreenCanvas），自动降级到主线程
    const result = await workerConvert(sourceFile.value, {
      format: convertSettings.value.format,
      quality
    })

    outputBlob.value = result.blob
    outputSize.value = result.size
    outputImage.value = URL.createObjectURL(result.blob)

    message.success('格式转换完成')
  } catch (error) {
    console.error('Convert error:', error)
    message.error('转换失败: ' + error.message)
  } finally {
    isProcessing.value = false
  }
}

// Compress image
async function compressImage() {
  if (!sourceFile.value) return

  isProcessing.value = true

  try {
    const format = compressSettings.value.format

    // Check format support
    const supported = await checkFormatSupport(format)
    if (!supported) {
      message.warning(`您的浏览器不支持导出 ${format.toUpperCase()} 格式，将使用 WebP 代替`)
      compressSettings.value.format = 'webp'
    }

    const options = {
      maxSizeMB: 10,
      maxWidthOrHeight: Math.max(
        compressSettings.value.maxWidth || Infinity,
        compressSettings.value.maxHeight || Infinity
      ) || undefined,
      useWebWorker: true,
      initialQuality: compressSettings.value.quality / 100,
      fileType: getMimeType(compressSettings.value.format)
    }

    // Handle max dimensions
    if (compressSettings.value.maxWidth > 0 || compressSettings.value.maxHeight > 0) {
      const maxW = compressSettings.value.maxWidth || Infinity
      const maxH = compressSettings.value.maxHeight || Infinity

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = imageInfo.value.width
      let newHeight = imageInfo.value.height

      if (newWidth > maxW) {
        newHeight = (maxW / newWidth) * newHeight
        newWidth = maxW
      }
      if (newHeight > maxH) {
        newWidth = (maxH / newHeight) * newWidth
        newHeight = maxH
      }

      options.maxWidthOrHeight = Math.max(newWidth, newHeight)
    }

    const compressedFile = await imageCompression(sourceFile.value, options)

    // If we need a specific format different from original, convert it
    const mimeType = getMimeType(compressSettings.value.format)
    let finalBlob = compressedFile

    if (compressedFile.type !== mimeType) {
      // 使用 Worker 进行格式转换（OffscreenCanvas），自动降级
      const result = await workerConvert(compressedFile, {
        format: compressSettings.value.format,
        quality: compressSettings.value.quality / 100
      })
      finalBlob = result.blob
    }

    outputBlob.value = finalBlob
    outputSize.value = finalBlob.size
    outputImage.value = URL.createObjectURL(finalBlob)

    // Get output dimensions
    const img = new Image()
    img.src = outputImage.value
    await new Promise(resolve => { img.onload = resolve })
    outputDimensions.value = { width: img.width, height: img.height }

    message.success('压缩完成')
  } catch (error) {
    console.error('Compress error:', error)
    message.error('压缩失败: ' + error.message)
  } finally {
    isProcessing.value = false
  }
}

// Download output
function downloadOutput() {
  if (!outputBlob.value) return

  const url = URL.createObjectURL(outputBlob.value)
  const baseName = imageInfo.value.name.replace(/\.[^.]+$/, '')
  const format = activeTab.value === 'convert'
    ? convertSettings.value.format
    : compressSettings.value.format
  const ext = getFileExtension(format)
  const suffix = activeTab.value === 'convert' ? '_converted' : '_compressed'

  const link = document.createElement('a')
  link.href = url
  link.download = `${baseName}${suffix}.${ext}`
  link.click()

  URL.revokeObjectURL(url)
}

// Watch for tab changes
watch(activeTab, () => {
  // Clear output when switching tabs
  outputImage.value = null
  outputBlob.value = null
  outputDimensions.value = null
})

// Cleanup
onBeforeUnmount(() => {
  if (outputImage.value) {
    URL.revokeObjectURL(outputImage.value)
  }
})
</script>

<style scoped>
.image-processor {
  max-width: 900px;
  margin: 0 auto;
}

.privacy-notice {
  margin-bottom: 1.5rem;
  border-radius: 12px;
}

.processor-content {
  padding: 1.5rem 0;
}

.input-section {
  margin-bottom: 1.5rem;
}

.upload-area {
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-secondary);
}

.upload-area:hover,
.upload-area.drag-over {
  border-color: var(--accent-primary);
  background: rgba(100, 108, 255, 0.05);
}

.upload-area.has-image {
  padding: 1rem;
}

.upload-icon {
  color: var(--text-tertiary);
  margin-bottom: 1rem;
}

.upload-text {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.upload-hint {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin: 0;
}

.preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: contain;
}

.image-info {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.slider-value {
  margin-left: 1rem;
  min-width: 50px;
  color: var(--text-secondary);
}

.input-hint {
  margin-left: 0.5rem;
  color: var(--text-tertiary);
  font-size: 0.875rem;
}

.output-section {
  text-align: center;
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.section-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.output-preview {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: contain;
  margin-bottom: 1rem;
}

.output-info {
  margin-bottom: 1rem;
}

.size-comparison {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.95rem;
  color: var(--text-secondary);
}

.size-reduced {
  color: var(--accent-success);
  font-weight: 600;
}

.dimension-info {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-tertiary);
}

.convert-action {
  text-align: center;
  padding-top: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .upload-area {
    padding: 2rem 1rem;
  }

  .settings-section {
    padding: 1rem;
  }

  .image-info {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>

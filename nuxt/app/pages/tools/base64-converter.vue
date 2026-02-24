<template>
  <div class="base64-converter-page">
    <div class="page-header">
      <n-breadcrumb>
        <n-breadcrumb-item @click="navigateTo('/')">首页</n-breadcrumb-item>
        <n-breadcrumb-item @click="navigateTo('/tools')">工具箱</n-breadcrumb-item>
        <n-breadcrumb-item>Base64 转换</n-breadcrumb-item>
      </n-breadcrumb>

      <h1 class="page-title">
        <Icon name="code" size="lg" class="me-2" />
        图片 Base64 互转
      </h1>
      <p class="page-description">图片与 Base64 编码互相转换，本地处理保护隐私</p>
    </div>

    <div class="converter-container">
      <!-- 模式切换 -->
      <n-tabs v-model:value="mode" type="segment" animated>
        <n-tab-pane name="imageToBase64" tab="图片 → Base64">
          <div class="converter-section">
            <n-upload
              :custom-request="handleImageUpload"
              :show-file-list="false"
              accept="image/*"
              class="upload-area"
            >
              <n-upload-dragger>
                <div class="upload-content">
                  <Icon name="cloud-upload" size="xl" class="upload-icon" />
                  <p class="upload-text">点击或拖拽图片到此处</p>
                  <p class="upload-hint">支持 PNG、JPG、GIF、WebP 等格式</p>
                </div>
              </n-upload-dragger>
            </n-upload>

            <!-- 图片预览 -->
            <div v-if="imagePreview" class="preview-section">
              <h3>图片预览</h3>
              <div class="image-preview">
                <img :src="imagePreview" alt="预览" />
              </div>
              <div class="image-info">
                <n-tag type="info">{{ imageInfo.name }}</n-tag>
                <n-tag type="success">{{ formatFileSize(imageInfo.size) }}</n-tag>
                <n-tag type="warning">{{ imageInfo.type }}</n-tag>
              </div>
            </div>

            <!-- Base64 输出 -->
            <div v-if="base64Output" class="output-section">
              <div class="output-header">
                <h3>Base64 编码</h3>
                <div class="output-actions">
                  <n-checkbox v-model:checked="includeDataUri">包含 Data URI 前缀</n-checkbox>
                  <n-button size="small" @click="copyToClipboard(getBase64Output)">
                    <Icon name="clipboard" size="sm" class="me-1" />
                    复制
                  </n-button>
                </div>
              </div>
              <n-input
                v-model:value="displayBase64"
                type="textarea"
                :rows="6"
                readonly
                class="base64-output"
              />
              <p class="output-info">编码长度：{{ getBase64Output.length }} 字符</p>
            </div>
          </div>
        </n-tab-pane>

        <n-tab-pane name="base64ToImage" tab="Base64 → 图片">
          <div class="converter-section">
            <n-input
              v-model:value="base64Input"
              type="textarea"
              :rows="6"
              placeholder="粘贴 Base64 编码（可包含或不包含 Data URI 前缀）"
              class="base64-input"
            />

            <div class="action-buttons">
              <n-button type="primary" @click="convertBase64ToImage" :disabled="!base64Input.trim()">
                <Icon name="arrow-down" size="sm" class="me-1" />
                转换为图片
              </n-button>
              <n-button @click="base64Input = ''">清空</n-button>
            </div>

            <!-- 转换后的图片预览 -->
            <div v-if="convertedImage" class="preview-section">
              <h3>转换结果</h3>
              <div class="image-preview">
                <img :src="convertedImage" alt="转换结果" @error="handleImageError" />
              </div>
              <div class="action-buttons">
                <n-button type="primary" @click="downloadImage">
                  <Icon name="download" size="sm" class="me-1" />
                  下载图片
                </n-button>
              </div>
            </div>

            <n-alert v-if="convertError" type="error" :title="convertError" class="mt-4" />
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  ssr: false
})

import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()

// 模式
const mode = ref('imageToBase64')

// 图片转 Base64
const imagePreview = ref('')
const base64Output = ref('')
const imageInfo = ref({ name: '', size: 0, type: '' })
const includeDataUri = ref(true)

// Base64 转图片
const base64Input = ref('')
const convertedImage = ref('')
const convertError = ref('')

// 计算显示的 Base64
const displayBase64 = computed(() => getBase64Output.value)
const getBase64Output = computed(() => {
  if (!base64Output.value) return ''
  if (includeDataUri.value) {
    return base64Output.value
  }
  // 移除 Data URI 前缀
  const match = base64Output.value.match(/^data:image\/[^;]+;base64,(.+)$/)
  return match ? match[1] : base64Output.value
})

// 处理图片上传
const handleImageUpload = ({ file }) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
    base64Output.value = e.target.result
    imageInfo.value = {
      name: file.name,
      size: file.file.size,
      type: file.file.type
    }
  }
  reader.readAsDataURL(file.file)
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 复制到剪贴板
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (err) {
    message.error('复制失败')
  }
}

// Base64 转图片
const convertBase64ToImage = () => {
  convertError.value = ''
  let input = base64Input.value.trim()
  
  // 如果没有 Data URI 前缀，尝试添加
  if (!input.startsWith('data:image')) {
    // 尝试检测图片类型
    input = `data:image/png;base64,${input}`
  }
  
  // 验证 Base64
  try {
    const base64Part = input.replace(/^data:image\/[^;]+;base64,/, '')
    atob(base64Part)
    convertedImage.value = input
  } catch (e) {
    convertError.value = '无效的 Base64 编码，请检查输入'
    convertedImage.value = ''
  }
}

// 处理图片加载错误
const handleImageError = () => {
  convertError.value = '无法加载图片，请检查 Base64 编码是否正确'
  convertedImage.value = ''
}

// 下载图片
const downloadImage = () => {
  if (!convertedImage.value) return
  
  const link = document.createElement('a')
  link.href = convertedImage.value
  link.download = `image_${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  message.success('图片下载成功')
}

// SEO
useHead({
  title: '图片 Base64 互转 - 工具箱',
  meta: [
    { name: 'description', content: '在线图片与 Base64 编码互转工具，支持多种图片格式，本地处理保护隐私' },
    { name: 'keywords', content: 'Base64,图片转换,Data URI,在线工具' }
  ]
})
</script>

<style scoped>
.base64-converter-page {
  padding: 2rem 0;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 1rem 0 0.5rem;
  display: flex;
  align-items: center;
}

.page-description {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.converter-container {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.converter-section {
  padding: 1rem 0;
}

.upload-area {
  margin-bottom: 1.5rem;
}

.upload-content {
  padding: 2rem;
  text-align: center;
}

.upload-icon {
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.upload-text {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.upload-hint {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.preview-section {
  margin: 1.5rem 0;
}

.preview-section h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.image-preview {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 1rem;
}

.image-preview img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
}

.image-info {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.output-section {
  margin-top: 1.5rem;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.output-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.output-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.output-info {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 0.5rem;
}

.base64-input {
  margin-bottom: 1rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin: 1rem 0;
}

.mt-4 {
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .output-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

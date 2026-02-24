<template>
  <div class="password-generator-page">
    <div class="page-header">
      <n-breadcrumb>
        <n-breadcrumb-item @click="navigateTo('/')">首页</n-breadcrumb-item>
        <n-breadcrumb-item @click="navigateTo('/tools')">工具箱</n-breadcrumb-item>
        <n-breadcrumb-item>密码生成器</n-breadcrumb-item>
      </n-breadcrumb>

      <h1 class="page-title">
        <Icon name="key" size="lg" class="me-2" />
        高强度密码生成器
      </h1>
      <p class="page-description">生成安全随机密码，本地生成确保安全</p>
    </div>

    <div class="generator-container">
      <!-- 密码显示区域 -->
      <div class="password-display">
        <n-input
          v-model:value="password"
          type="text"
          readonly
          size="large"
          class="password-input"
          :style="{ fontFamily: 'monospace', fontSize: '1.2rem' }"
        >
          <template #suffix>
            <div class="password-actions">
              <n-button quaternary circle @click="copyPassword" :disabled="!password">
                <Icon name="clipboard" />
              </n-button>
              <n-button quaternary circle @click="generatePassword">
                <Icon name="refresh" />
              </n-button>
            </div>
          </template>
        </n-input>
        
        <!-- 密码强度指示器 -->
        <div class="strength-indicator">
          <div class="strength-bar">
            <div 
              class="strength-fill" 
              :style="{ width: strengthPercent + '%', backgroundColor: strengthColor }"
            ></div>
          </div>
          <span class="strength-text" :style="{ color: strengthColor }">{{ strengthText }}</span>
        </div>
      </div>

      <!-- 生成选项 -->
      <n-card class="options-card">
        <div class="option-group">
          <label class="option-label">密码长度: {{ options.length }}</label>
          <n-slider 
            v-model:value="options.length" 
            :min="8" 
            :max="64" 
            :step="1"
            @update:value="generatePassword"
          />
        </div>

        <n-divider />

        <div class="checkbox-group">
          <n-checkbox 
            v-model:checked="options.uppercase" 
            @update:checked="generatePassword"
          >
            大写字母 (A-Z)
          </n-checkbox>
          <n-checkbox 
            v-model:checked="options.lowercase" 
            @update:checked="generatePassword"
          >
            小写字母 (a-z)
          </n-checkbox>
          <n-checkbox 
            v-model:checked="options.numbers" 
            @update:checked="generatePassword"
          >
            数字 (0-9)
          </n-checkbox>
          <n-checkbox 
            v-model:checked="options.symbols" 
            @update:checked="generatePassword"
          >
            特殊符号 (!@#$%^&*...)
          </n-checkbox>
        </div>

        <n-divider />

        <div class="checkbox-group">
          <n-checkbox 
            v-model:checked="options.excludeAmbiguous" 
            @update:checked="generatePassword"
          >
            排除易混淆字符 (0, O, l, 1, I)
          </n-checkbox>
          <n-checkbox 
            v-model:checked="options.excludeSimilar" 
            @update:checked="generatePassword"
          >
            排除相似字符 ({}[]()\/'"`)
          </n-checkbox>
        </div>
      </n-card>

      <!-- 批量生成 -->
      <n-card class="batch-card">
        <div class="batch-header">
          <h3>批量生成</h3>
          <div class="batch-controls">
            <n-input-number 
              v-model:value="batchCount" 
              :min="1" 
              :max="20" 
              size="small"
              style="width: 100px"
            />
            <n-button type="primary" size="small" @click="generateBatch">
              生成
            </n-button>
          </div>
        </div>
        
        <div v-if="batchPasswords.length" class="batch-list">
          <div 
            v-for="(pwd, index) in batchPasswords" 
            :key="index" 
            class="batch-item"
          >
            <code class="batch-password">{{ pwd }}</code>
            <n-button quaternary size="tiny" @click="copyText(pwd)">
              <Icon name="clipboard" size="sm" />
            </n-button>
          </div>
        </div>
      </n-card>

      <!-- 提示信息 -->
      <n-alert type="info" title="安全提示" class="security-tips">
        <ul>
          <li>密码在您的浏览器本地生成，不会传输到任何服务器</li>
          <li>建议使用至少 16 位包含多种字符类型的密码</li>
          <li>请使用密码管理器安全存储您的密码</li>
          <li>不要在多个网站使用相同密码</li>
        </ul>
      </n-alert>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  ssr: false
})

import { ref, computed, onMounted } from 'vue'
import { useMessage } from 'naive-ui'

const message = useMessage()

// 密码选项
const options = ref({
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
  excludeSimilar: false
})

// 当前密码
const password = ref('')

// 批量生成
const batchCount = ref(5)
const batchPasswords = ref([])

// 字符集
const charSets = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
}

const ambiguousChars = '0O1lI'
const similarChars = '{}[]()\\\/\'"``'

// 生成密码
const generatePassword = () => {
  let chars = ''
  
  if (options.value.uppercase) chars += charSets.uppercase
  if (options.value.lowercase) chars += charSets.lowercase
  if (options.value.numbers) chars += charSets.numbers
  if (options.value.symbols) chars += charSets.symbols
  
  // 排除字符
  if (options.value.excludeAmbiguous) {
    chars = chars.split('').filter(c => !ambiguousChars.includes(c)).join('')
  }
  if (options.value.excludeSimilar) {
    chars = chars.split('').filter(c => !similarChars.includes(c)).join('')
  }
  
  if (!chars) {
    password.value = ''
    return
  }
  
  // 使用 crypto.getRandomValues 生成安全随机数
  const array = new Uint32Array(options.value.length)
  crypto.getRandomValues(array)
  
  password.value = Array.from(array)
    .map(x => chars[x % chars.length])
    .join('')
}

// 批量生成
const generateBatch = () => {
  batchPasswords.value = []
  for (let i = 0; i < batchCount.value; i++) {
    generatePassword()
    batchPasswords.value.push(password.value)
  }
}

// 计算密码强度
const passwordStrength = computed(() => {
  if (!password.value) return 0
  
  let score = 0
  const pwd = password.value
  
  // 长度评分
  if (pwd.length >= 8) score += 1
  if (pwd.length >= 12) score += 1
  if (pwd.length >= 16) score += 1
  if (pwd.length >= 24) score += 1
  
  // 字符类型评分
  if (/[a-z]/.test(pwd)) score += 1
  if (/[A-Z]/.test(pwd)) score += 1
  if (/[0-9]/.test(pwd)) score += 1
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 2
  
  return Math.min(score, 9)
})

const strengthPercent = computed(() => (passwordStrength.value / 9) * 100)

const strengthColor = computed(() => {
  const score = passwordStrength.value
  if (score <= 3) return '#f5222d'
  if (score <= 5) return '#faad14'
  if (score <= 7) return '#52c41a'
  return '#1890ff'
})

const strengthText = computed(() => {
  const score = passwordStrength.value
  if (score <= 3) return '弱'
  if (score <= 5) return '中等'
  if (score <= 7) return '强'
  return '非常强'
})

// 复制密码
const copyPassword = async () => {
  await copyText(password.value)
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (err) {
    message.error('复制失败')
  }
}

// 初始化生成一个密码
onMounted(() => {
  generatePassword()
})

// SEO
useHead({
  title: '高强度密码生成器 - 工具箱',
  meta: [
    { name: 'description', content: '在线生成安全随机密码，支持自定义长度和字符类型，本地生成确保安全' },
    { name: 'keywords', content: '密码生成器,随机密码,安全密码,在线工具' }
  ]
})
</script>

<style scoped>
.password-generator-page {
  padding: 2rem 0;
  max-width: 700px;
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

.generator-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.password-display {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.password-input {
  margin-bottom: 1rem;
}

.password-actions {
  display: flex;
  gap: 0.25rem;
}

.strength-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.strength-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 3px;
}

.strength-text {
  font-size: 0.9rem;
  font-weight: 600;
  min-width: 60px;
}

.options-card {
  border-radius: 16px;
}

.option-group {
  margin-bottom: 0.5rem;
}

.option-label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.batch-card {
  border-radius: 16px;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.batch-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.batch-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.batch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.batch-password {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--text-primary);
  word-break: break-all;
}

.security-tips {
  border-radius: 12px;
}

.security-tips ul {
  margin: 0;
  padding-left: 1.25rem;
}

.security-tips li {
  margin: 0.25rem 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }
  
  .batch-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>

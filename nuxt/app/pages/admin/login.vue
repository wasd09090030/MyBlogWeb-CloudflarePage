<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md">
      <n-card title="管理员登录" class="shadow-lg">
        <n-form ref="formRef" :model="formData" :rules="rules" @submit.prevent="login">
          <n-form-item label="管理员密码" path="password">
            <n-input
              v-model:value="formData.password"
              type="password"
              placeholder="请输入管理员密码"
              show-password-on="click"
              size="large"
              @keyup.enter="login"
            />
          </n-form-item>
          
          <n-alert v-if="error" type="error" :title="error" class="mb-4" closable @close="error = ''" />
          
          <div class="flex flex-col gap-3">
            <n-button
              type="primary"
              block
              size="large"
              :loading="isLoggingIn"
              @click="login"
            >
              登录
            </n-button>
            <NuxtLink to="/" class="text-center text-primary hover:underline">
              返回首页
            </NuxtLink>
          </div>
        </n-form>
      </n-card>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  ssr: false,
  layout: false
})

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref(null)
const formData = ref({
  password: ''
})
const error = ref('')
const isLoggingIn = ref(false)

const rules = {
  password: {
    required: true,
    message: '请输入密码',
    trigger: 'blur'
  }
}

const login = async () => {
  isLoggingIn.value = true
  error.value = ''
  
  try {
    const result = await authStore.login('admin', formData.value.password)
    
    if (result.success) {
      router.push('/admin')
    } else {
      error.value = result.message
    }
  } catch (err) {
    console.error('Login error:', err)
    error.value = '登录过程中发生错误，请稍后重试'
  } finally {
    isLoggingIn.value = false
  }
}

// 如果已登录，跳转到仪表板
onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAdmin) {
    router.push('/admin')
  }
})
</script>

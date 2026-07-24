<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
    <div class="w-full max-w-md">
      <UCard class="shadow-lg">
        <template #header>
          <h3 class="text-lg font-semibold">管理员登录</h3>
        </template>
        <UForm :state="formData" :schema="schema" @submit="login">
          <input
            class="sr-only"
            type="text"
            name="username"
            autocomplete="username"
            value="admin"
            tabindex="-1"
            aria-hidden="true"
          />
          <UFormField label="管理员密码" name="password">
            <UInput
              v-model="formData.password"
              type="password"
              placeholder="请输入管理员密码"
              :ui="{ base: 'w-full' }"
              @keyup.enter="login"
            />
          </UFormField>

          <UAlert
            v-if="error"
            :title="error"
            color="error"
            class="my-4"
            closeable
            @close="error = ''"
          />

          <div class="flex flex-col gap-3">
            <UButton
              type="submit"
              color="primary"
              block
              size="lg"
              :loading="isLoggingIn"
            >
              登录
            </UButton>
            <a :href="siteUrl" class="text-center text-primary hover:underline">
              返回首页
            </a>
          </div>
        </UForm>
      </UCard>
    </div>
  </div>
</template>

<script setup>
import * as v from 'valibot'

definePageMeta({
  ssr: false,
  layout: false
})

const router = useRouter()
const authStore = useAuthStore()
const { public: publicConfig } = useRuntimeConfig()
const siteUrl = publicConfig.siteUrl || '/'

const formData = ref({
  password: ''
})
const error = ref('')
const isLoggingIn = ref(false)

const schema = v.object({
  password: v.pipe(v.string(), v.minLength(1, '请输入密码'))
})

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

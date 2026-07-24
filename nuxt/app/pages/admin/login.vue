<template>
  <div class="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden bg-default text-highlighted">
    <!-- 签名背景：双层径向 emerald 光晕 + 巨型半透明 monogram -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 z-0"
    >
      <div
        class="absolute inset-0"
        style="background: radial-gradient(circle at 18% 28%, color-mix(in oklab, var(--ui-primary) 22%, transparent) 0%, transparent 45%), radial-gradient(circle at 82% 72%, color-mix(in oklab, var(--ui-primary) 16%, transparent) 0%, transparent 50%);"
      />
      <div
        class="absolute -inset-x-12 top-1/2 -translate-y-1/2 flex items-center justify-center"
      >
        <span
          class="font-display font-bold select-none"
          :class="isDark ? 'text-white/[0.035]' : 'text-emerald-950/[0.05]'"
          style="font-size: clamp(16rem, 32vw, 30rem); line-height: 1; letter-spacing: -0.08em;"
        >
          W
        </span>
      </div>
    </div>

    <div class="relative z-10 w-full max-w-sm">
      <!-- 品牌行 -->
      <div class="flex flex-col items-center gap-3 mb-6">
        <span
          class="flex items-center justify-center size-12 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-1 ring-primary/30"
        >
          <span class="font-display font-bold text-3xl leading-none tracking-tight">W</span>
        </span>
        <div class="text-center space-y-1">
          <p class="font-display text-lg font-semibold text-highlighted tracking-tight">WyrmKk</p>
          <p class="text-xs uppercase tracking-[0.22em] text-muted">Admin Console</p>
        </div>
      </div>

      <UCard
        :ui="{
          root: 'bg-elevated/95 ring ring-default shadow-xl shadow-black/20 overflow-hidden',
          header: 'px-7 pt-7 pb-0 border-0',
          body: 'px-7 pt-6 pb-7'
        }"
      >
        <template #header>
          <div class="space-y-1.5">
            <h1 class="font-display text-xl font-semibold text-highlighted tracking-tight">
              管理员登录
            </h1>
            <p class="text-sm text-muted">输入管理员密码以继续访问后台</p>
          </div>
        </template>

        <UForm
          :state="formData"
          :schema="schema"
          @submit="login"
          class="space-y-0"
        >
          <input
            class="sr-only"
            type="text"
            name="username"
            autocomplete="username"
            value="admin"
            tabindex="-1"
            aria-hidden="true"
          />
          <UFormField
            label="管理员密码"
            name="password"
            required
            class="space-y-2"
          >
            <UInput
              v-model="formData.password"
              type="password"
              placeholder="请输入管理员密码"
              autocomplete="current-password"
              autofocus
              size="lg"
              :ui="{ base: 'h-11 text-sm' }"
              @keyup.enter="login"
            >
              <template #leading>
                <UIcon name="i-lucide-lock" class="size-4 text-muted" />
              </template>
            </UInput>
          </UFormField>

          <UAlert
            v-if="error"
            :title="error"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            closeable
            class="mt-4"
            @close="error = ''"
          />

          <UButton
            type="submit"
            color="primary"
            block
            size="lg"
            icon="i-lucide-log-in"
            :loading="isLoggingIn"
            class="mt-6"
          >
            登录
          </UButton>

          <USeparator class="my-5" />

          <div class="flex items-center justify-between gap-3 text-xs">
            <span class="inline-flex items-center gap-1.5 text-muted font-mono">
              <UIcon name="i-lucide-clock" class="size-3" />
              {{ sessionInfo }}
            </span>
            <a
              :href="siteUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              返回前台
              <UIcon name="i-lucide-external-link" class="size-3" />
            </a>
          </div>
        </UForm>
      </UCard>

      <p class="mt-6 text-center text-xs text-muted">
        © {{ new Date().getFullYear() }} WyrmKk · Powered by Nuxt
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({
  ssr: false,
  layout: false
})

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// admin 后台默认深色模式（设计本就是为深色调优）
onMounted(() => {
  if (colorMode.preference === 'system') {
    colorMode.preference = 'dark'
  }
})

const router = useRouter()
const authStore = useAuthStore()
const { public: publicConfig } = useRuntimeConfig()
const siteUrl = publicConfig.siteUrl || '/'

const formData = ref({ password: '' })
const error = ref('')
const isLoggingIn = ref(false)

const sessionInfo = ref('—')
let sessionTimer = null

onMounted(() => {
  const tick = () => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    sessionInfo.value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  }
  tick()
  sessionTimer = setInterval(tick, 1000)

  authStore.initialize().then(() => {
    if (authStore.isAdmin) router.push('/admin')
  })
})

onBeforeUnmount(() => {
  if (sessionTimer) clearInterval(sessionTimer)
})

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
</script>

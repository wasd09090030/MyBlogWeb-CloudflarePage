<template>
  <div class="max-w-xl mx-auto space-y-6">
    <!-- 页面标题 -->
    <header class="space-y-1.5">
      <p class="text-xs uppercase tracking-[0.18em] text-muted font-medium">账号</p>
      <h1 class="font-display text-2xl font-semibold text-highlighted tracking-tight">修改密码</h1>
      <p class="text-sm text-muted">
        建议使用至少 6 位字符，并避免与最近使用过的密码重复。
      </p>
    </header>

    <UCard
      variant="subtle"
      :ui="{ root: 'ring ring-default/40', body: 'p-6 sm:p-8' }"
    >
      <UForm :state="formData" :schema="schema" @submit="changePassword" class="space-y-5">
        <UFormField label="当前密码" name="currentPassword" required>
          <UInput
            v-model="formData.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password-on="click"
            autocomplete="current-password"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <USeparator />

        <UFormField
          label="新密码"
          name="newPassword"
          required
          help="至少 6 位，建议同时包含字母与数字"
        >
          <UInput
            v-model="formData.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password-on="click"
            autocomplete="new-password"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField label="确认新密码" name="confirmPassword" required>
          <UInput
            v-model="formData.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password-on="click"
            autocomplete="new-password"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UAlert
          v-if="error"
          :title="error"
          color="error"
          variant="subtle"
          icon="heroicons:exclamation-circle"
          closeable
          @close="error = ''"
        />
        <UAlert
          v-if="success"
          :title="success"
          color="success"
          variant="subtle"
          icon="heroicons:check-circle"
          closeable
          @close="success = ''"
        />

        <div class="flex items-center justify-end gap-2 pt-2">
          <UButton
            type="button"
            variant="ghost"
            color="neutral"
            :disabled="isChanging"
            @click="resetForm"
          >
            清空
          </UButton>
          <UButton
            type="submit"
            color="primary"
            icon="heroicons:shield-check"
            :loading="isChanging"
          >
            更新密码
          </UButton>
        </div>
      </UForm>
    </UCard>

    <UCard
      variant="subtle"
      :ui="{ root: 'ring ring-default/40', body: 'p-5 sm:p-6' }"
    >
      <div class="flex gap-3">
        <UIcon name="heroicons:information-circle" class="size-5 text-primary shrink-0 mt-0.5" />
        <div class="text-sm text-toned space-y-1">
          <p class="font-medium text-highlighted">修改密码后您仍保持登录状态</p>
          <p class="text-muted">
            旧密码将立即失效，但当前会话不会被强制登出。请妥善保管新密码。
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'

definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const authStore = useAuthStore()

const formData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const error = ref('')
const success = ref('')
const isChanging = ref(false)

const schema = v.object({
  currentPassword: v.pipe(v.string(), v.minLength(1, '请输入当前密码')),
  newPassword: v.pipe(v.string(), v.minLength(6, '密码长度至少 6 位')),
  confirmPassword: v.pipe(v.string(), v.minLength(1, '请确认新密码'))
})

const resetForm = () => {
  formData.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  error.value = ''
  success.value = ''
}

const changePassword = async () => {
  error.value = ''
  success.value = ''

  if (formData.value.newPassword !== formData.value.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }

  if (formData.value.newPassword === formData.value.currentPassword) {
    error.value = '新密码不能与当前密码相同'
    return
  }

  isChanging.value = true

  try {
    const result = await authStore.changePassword(
      formData.value.currentPassword,
      formData.value.newPassword
    )

    if (result.success) {
      success.value = result.message || '密码修改成功'
      resetForm()
    } else {
      error.value = result.message
    }
  } catch (err) {
    console.error('Change password error:', err)
    error.value = '密码修改过程中发生错误，请稍后重试'
  } finally {
    isChanging.value = false
  }
}
</script>
<template>
  <div class="max-w-lg mx-auto">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">修改管理员密码</h3>
      </template>
      <UForm :state="formData" :schema="schema" @submit="changePassword">
        <UFormField label="当前密码" name="currentPassword">
          <UInput
            v-model="formData.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password-on="click"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField label="新密码" name="newPassword">
          <UInput
            v-model="formData.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password-on="click"
            :ui="{ base: 'w-full' }"
          />
        </UFormField>

        <UFormField label="确认新密码" name="confirmPassword">
          <UInput
            v-model="formData.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password-on="click"
            :ui="{ base: 'w-full' }"
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
        <UAlert
          v-if="success"
          :title="success"
          color="success"
          class="my-4"
          closeable
          @close="success = ''"
        />

        <UButton
          type="submit"
          color="primary"
          block
          :loading="isChanging"
        >
          修改密码
        </UButton>
      </UForm>
    </UCard>
  </div>
</template>

<script setup>
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
  newPassword: v.pipe(v.string(), v.minLength(6, '密码长度至少6位')),
  confirmPassword: v.pipe(v.string(), v.minLength(1, '请确认新密码'))
})

const changePassword = async () => {
  error.value = ''
  success.value = ''

  // 额外验证
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
      // 清空表单
      formData.value = {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
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

<template>
  <div class="max-w-lg mx-auto">
      <n-card title="修改管理员密码">
        <n-form ref="formRef" :model="formData" :rules="rules" @submit.prevent="changePassword">
          <n-form-item label="当前密码" path="currentPassword">
            <n-input
              v-model:value="formData.currentPassword"
              type="password"
              placeholder="请输入当前密码"
              show-password-on="click"
            />
          </n-form-item>

          <n-form-item label="新密码" path="newPassword">
            <n-input
              v-model:value="formData.newPassword"
              type="password"
              placeholder="请输入新密码（至少6位）"
              show-password-on="click"
            />
          </n-form-item>

          <n-form-item label="确认新密码" path="confirmPassword">
            <n-input
              v-model:value="formData.confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              show-password-on="click"
            />
          </n-form-item>

          <n-alert v-if="error" type="error" :title="error" class="mb-4" closable @close="error = ''" />
          <n-alert v-if="success" type="success" :title="success" class="mb-4" closable @close="success = ''" />

          <n-button
            type="primary"
            block
            :loading="isChanging"
            @click="changePassword"
          >
            修改密码
          </n-button>
        </n-form>
      </n-card>
    </div>
</template>

<script setup>
definePageMeta({
  ssr: false,
  layout: 'admin',
  middleware: 'admin-auth'
})

const authStore = useAuthStore()

const formRef = ref(null)
const formData = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const error = ref('')
const success = ref('')
const isChanging = ref(false)

const validatePasswordSame = (rule, value) => {
  return value === formData.value.newPassword
}

const rules = {
  currentPassword: {
    required: true,
    message: '请输入当前密码',
    trigger: 'blur'
  },
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validatePasswordSame, message: '两次输入的密码不一致', trigger: 'blur' }
  ]
}

const changePassword = async () => {
  error.value = ''
  success.value = ''

  // 额外验证
  if (formData.value.newPassword !== formData.value.confirmPassword) {
    error.value = '两次输入的新密码不一致'
    return
  }

  if (formData.value.newPassword.length < 6) {
    error.value = '新密码长度至少6位'
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

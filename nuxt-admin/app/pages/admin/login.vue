<script setup lang="ts">
import * as v from 'valibot'
definePageMeta({ layout: 'login', middleware: 'admin-auth' })
const toast = useToast()
const router = useRouter()
const pending = ref(false)
const errorMessage = ref('')
const state = reactive({ username: '', password: '' })
const schema = v.object({ username: v.pipe(v.string(), v.minLength(1, '请输入用户名')), password: v.pipe(v.string(), v.minLength(1, '请输入密码')) })
async function submit() {
  const validation = v.safeParse(schema, state)
  if (!validation.success) {
    errorMessage.value = validation.issues[0]?.message || '请输入用户名和密码'
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/admin/api/auth/login', { method: 'POST', body: state, credentials: 'include' })
    await router.push('/admin')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || error?.message || '登录失败，请检查凭据'
    toast.add({ title: errorMessage.value, color: 'error' })
  } finally { pending.value = false }
}
</script>

<template>
  <UCard class="w-full max-w-sm"><template #header><div class="space-y-1"><p class="text-sm text-muted">WyrmKk</p><h1 class="text-xl font-semibold">登录管理后台</h1></div></template>
    <UAlert v-if="errorMessage" color="error" variant="soft" :title="errorMessage" class="mb-4" />
    <UForm :schema="schema" :state="state" class="space-y-4"><UFormField label="用户名" name="username"><UInput v-model="state.username" class="w-full" autocomplete="username" /></UFormField><UFormField label="密码" name="password"><UInput v-model="state.password" class="w-full" type="password" autocomplete="current-password" /></UFormField><UButton type="button" block :loading="pending" @click="submit">登录</UButton></UForm>
  </UCard>
</template>

<script setup lang="ts">
import type { Comment } from '~/types/admin'
definePageMeta({ layout: 'admin', middleware: 'admin-auth', keepalive: true })
const api = useAdminApi(); const toast = useToast(); const pendingOnly = ref(false)
const { data: comments, refresh } = await useAsyncData('admin-comments', () => api.get<Comment[]>('comments/admin/all'))
const visible = computed(() => (comments.value || []).filter(comment => !pendingOnly.value || comment.status === 'pending'))
async function status(comment: Comment, value: string) { await api.patch(`comments/admin/${comment.id}/status`, { status: value }); toast.add({ title: '评论状态已更新', color: 'success' }); await refresh() }
async function remove(comment: Comment) { if (!confirm('删除这条评论？')) return; await api.del(`comments/admin/${comment.id}`); await refresh() }
</script>
<template><div class="space-y-5"><div class="flex items-end justify-between"><div><p class="text-sm text-muted">互动管理</p><h2 class="text-2xl font-semibold">评论</h2></div><USwitch v-model="pendingOnly" label="仅待审核" /></div><div class="space-y-3"><UCard v-for="comment in visible" :key="comment.id"><div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div class="flex gap-2"><strong>{{ comment.author || '匿名访客' }}</strong><UBadge>{{ comment.status || 'pending' }}</UBadge></div><p class="mt-2 text-sm text-toned">{{ comment.content }}</p></div><div class="flex gap-1"><UButton size="xs" color="success" variant="soft" @click="status(comment, 'approved')">通过</UButton><UButton size="xs" color="warning" variant="soft" @click="status(comment, 'pending')">待审</UButton><UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="删除" @click="remove(comment)" /></div></div></UCard><UEmpty v-if="!visible.length" title="没有符合条件的评论" /></div></div></template>

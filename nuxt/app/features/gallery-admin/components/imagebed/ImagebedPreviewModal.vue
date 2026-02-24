<template>
  <n-modal :show="show" @update:show="onUpdateShow" preset="card" style="width: auto; max-width: 95vw; background: transparent; box-shadow: none;" :bordered="false">
    <div class="relative flex flex-col items-center">
      <img :src="previewUrl" class="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl bg-black/5" />
      <div class="mt-4 flex gap-3">
        <n-button secondary type="primary" @click="onCopy(previewUrl)">
          <template #icon><Icon name="clipboard" /></template>
          复制链接
        </n-button>
        <n-button secondary circle @click="onUpdateShow(false)">
          <template #icon><Icon name="x-mark" /></template>
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  previewUrl: string
  onUpdateShow: (value: boolean) => void
  onCopy: (value: string) => void
}>()
</script>

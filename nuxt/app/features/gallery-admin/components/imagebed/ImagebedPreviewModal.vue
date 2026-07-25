<template>
  <UModal
    :open="show"
    @update:open="onUpdateShow"
    :ui="{ content: 'sm:max-w-[95vw] bg-transparent dark:bg-transparent' }"
  >
    <template #content>
      <div class="relative flex flex-col items-center p-4">
        <img :src="previewUrl" class="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl bg-black/5" />
        <div class="mt-4 flex gap-3">
          <UButton variant="soft" color="primary" @click="onCopy(previewUrl)">
            <template #leading>
              <Icon name="clipboard" />
            </template>
            复制链接
          </UButton>
          <UButton variant="soft" color="neutral" icon square @click="onUpdateShow(false)">
            <Icon name="x-mark" />
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  previewUrl: string
  onUpdateShow: (value: boolean) => void
  onCopy: (value: string) => void
}>()
</script>

<template>
  <div class="h-full flex flex-col p-6 overflow-auto" @paste="handlePaste">
    <UFileUpload
      ref="uploadRef"
      :accept="acceptTypes"
      :disabled="!isConfigured"
      multiple
      class="mb-6"
    >
      <template #default>
        <div class="p-12 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer group">
          <div class="flex flex-col items-center gap-4">
            <div class="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <Icon name="cloud-arrow-up" size="4xl" />
            </div>
            <div class="text-center">
              <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200">点击或拖拽图片到此处</h3>
              <p class="text-gray-400 mt-1">或者直接 Ctrl+V 粘贴图片</p>
            </div>
            <div class="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              支持 JPG, PNG, GIF, WEBP, AVIF
            </div>
          </div>
        </div>
      </template>
    </UFileUpload>

    <div class="flex items-center gap-4 mb-6 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
      <div class="flex items-center gap-2">
        <Icon name="folder-open" class="text-gray-400" />
        <span class="text-sm font-medium">上传目录:</span>
      </div>
      <UInput
        :model-value="uploadFolder"
        @update:model-value="onUpdateUploadFolder"
        placeholder="默认目录 (如: images/2024)"
        size="sm"
        class="w-64"
      />
      <div class="text-xs text-gray-400 ml-auto">
        上传的文件将保存在: <span class="font-mono">{{ uploadFolder || '(根目录)' }}</span>
      </div>
    </div>

    <div v-if="uploadedFiles.length > 0" class="flex-1 flex flex-col min-h-0">
      <div class="flex justify-between items-center mb-3">
        <h3 class="font-medium flex items-center gap-2">
          <Icon name="check-circle" class="text-green-500" />
          本次上传 ({{ uploadedFiles.length }})
        </h3>
        <div class="flex gap-2">
          <UButton size="sm" variant="soft" color="neutral" @click="onClearUploaded">清空列表</UButton>
          <UButton size="sm" color="primary" @click="onCopyAllUrls">
            <template #leading>
              <Icon name="clipboard" />
            </template>
            复制全部链接
          </UButton>
        </div>
      </div>

      <div class="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
        <UTable :data="uploadedFiles" :columns="uploadedColumns" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isConfigured: boolean
  uploadRef: any
  acceptTypes: string
  uploadedFiles: any[]
  uploadedColumns: any[]
  uploadFolder: string
  onUpdateUploadFolder: (value: string) => void
  handlePaste: (event: ClipboardEvent) => void
  handleUpload: (payload: any) => Promise<void>
  onCopyAllUrls: () => Promise<void>
  onClearUploaded: () => void
}>()
</script>

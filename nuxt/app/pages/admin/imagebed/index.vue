<template>
  <div class="imagebed-manager h-[calc(100vh-6rem)] flex flex-col">
    <div class="flex justify-between items-center mb-4 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">图床管理</h2>
        <UBadge v-if="!isConfigured" color="warning" variant="subtle" size="sm">
          <Icon name="exclamation-triangle" class="mr-1" />
          未配置
        </UBadge>
      </div>
      <div class="flex gap-2">
        <UButton variant="solid" color="neutral" @click="showConfigModal = true">
          <template #leading>
            <Icon name="cog-6-tooth" />
          </template>
          设置
        </UButton>
      </div>
    </div>

    <UCard class="flex-1 overflow-hidden shadow-sm rounded-lg" :ui="{ body: 'p-0 flex flex-col h-full' }">
      <UTabs :items="tabItems" value="list" class="h-full" :ui="{ content: 'h-full overflow-hidden p-0' }">
        <template #list>
          <ImagebedFileArea
            :current-path="currentPath"
            :path-segments="pathSegments"
            :search-keyword="searchKeyword"
            :list-loading="listLoading"
            :items="items"
            :current-files="currentFiles"
            :current-folders="currentFolders"
            :total-count="totalCount"
            :current-page="currentPage"
            :page-size="pageSize"
            :selected-row-keys="selectedRowKeys"
            :view-mode="viewMode"
            :file-columns="fileColumns"
            :navigate-to="navigateTo"
            :get-path-up-to="getPathUpTo"
            :fetch-file-list="fetchFileList"
            :update-search-keyword="setSearchKeyword"
            :update-view-mode="setViewMode"
            :confirm-batch-delete="confirmBatchDelete"
            :toggle-selection="toggleSelection"
            :handle-check="handleCheck"
            :preview-file="previewFile"
            :copy-to-clipboard="copyToClipboard"
            :execute-delete-from-list="executeDeleteFromList"
            :confirm-delete-folder="confirmDeleteFolder"
            :handle-page-change="handlePageChange"
          />
        </template>

        <template #upload>
          <ImagebedUploadArea
            :is-configured="isConfigured"
            :upload-ref="uploadRef"
            :accept-types="acceptTypes"
            :uploaded-files="uploadedFiles"
            :uploaded-columns="uploadedColumns"
            :upload-folder="configForm.uploadFolder"
            :on-update-upload-folder="(v) => (configForm.uploadFolder = v)"
            :handle-paste="handlePaste"
            :handle-upload="handleUpload"
            :on-copy-all-urls="copyAllUrls"
            :on-clear-uploaded="clearUploaded"
          />
        </template>
      </UTabs>
    </UCard>

    <UModal v-model:open="showConfigModal" :title="'图床配置'" :description="'配置 Cloudflare R2 图床参数'">
      <template #body>
        <UForm :state="configForm" :schema="configSchema" label-placement="top" class="mt-4">
          <UFormField label="图床域名" name="domain">
            <UInput v-model="configForm.domain" placeholder="https://cdn.example.com" />
          </UFormField>
          <UFormField label="API Token" name="apiToken">
            <UInput v-model="configForm.apiToken" type="password" placeholder="Cloudflare R2 API Token" />
          </UFormField>
          <UFormField label="默认上传目录" name="uploadFolder">
            <UInput v-model="configForm.uploadFolder" placeholder="可选 (如: static/images)" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" @click="showConfigModal = false">取消</UButton>
          <UButton color="primary" :loading="savingConfig" @click="saveConfig">保存配置</UButton>
        </div>
      </template>
    </UModal>

    <ImagebedPreviewModal
      :show="showPreviewModal"
      :preview-url="previewUrl"
      :on-update-show="(v) => (showPreviewModal = v)"
      :on-copy="copyToClipboard"
    />
  </div>
</template>

<script setup lang="ts">
import * as v from 'valibot'
import ImagebedFileArea from '~/features/gallery-admin/components/imagebed/ImagebedFileArea.vue'
import ImagebedUploadArea from '~/features/gallery-admin/components/imagebed/ImagebedUploadArea.vue'
import ImagebedPreviewModal from '~/features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue'
import { useAdminImagebedPage } from '~/features/gallery-admin/composables/useAdminImagebedPage'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  // Phase 2: 与 admin 其他页面一致，避免 SSR hydration mismatch
  ssr: false
})

const configSchema = v.object({
  domain: v.pipe(v.string(), v.url('请输入有效的 URL')),
  apiToken: v.pipe(v.string(), v.minLength(1, '请输入 API Token')),
  uploadFolder: v.optional(v.string())
})

const tabItems = [
  { value: 'list', label: '媒体库', slot: 'list' },
  { value: 'upload', label: '上传图片', slot: 'upload' }
]

const {
  viewMode,
  currentPath,
  searchKeyword,
  listLoading,
  showConfigModal,
  savingConfig,
  showPreviewModal,
  previewUrl,
  items,
  currentFiles,
  currentFolders,
  totalCount,
  currentPage,
  pageSize,
  selectedRowKeys,
  uploadRef,
  uploadedFiles,
  acceptTypes,
  configFormRef,
  configForm,
  configRules,
  isConfigured,
  pathSegments,
  fileColumns,
  uploadedColumns,
  loadConfig,
  saveConfig,
  navigateTo,
  getPathUpTo,
  fetchFileList,
  handlePageChange,
  toggleSelection,
  handleCheck,
  previewFile,
  copyToClipboard,
  copyAllUrls,
  clearUploaded,
  setSearchKeyword,
  setViewMode,
  confirmDeleteFolder,
  confirmBatchDelete,
  executeDeleteFromList,
  handlePaste,
  handleUpload
} = useAdminImagebedPage()

onMounted(async () => {
  await loadConfig()
  if (isConfigured.value) {
    fetchFileList()
  } else {
    showConfigModal.value = true
  }
})
</script>

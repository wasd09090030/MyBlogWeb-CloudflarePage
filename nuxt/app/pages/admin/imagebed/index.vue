<template>
  <div class="imagebed-manager h-[calc(100vh-6rem)] flex flex-col">
    <div class="flex justify-between items-center mb-4 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-2xl font-bold text-gray-800 dark:text-white">图床管理</h2>
        <n-tag v-if="!isConfigured" type="warning" round size="small">
          未配置
          <template #icon><Icon name="exclamation-triangle" /></template>
        </n-tag>
      </div>
      <div class="flex gap-2">
        <n-button @click="showConfigModal = true">
          <template #icon><Icon name="cog-6-tooth" /></template>
          设置
        </n-button>
      </div>
    </div>

    <n-card content-style="padding: 0; display: flex; flex-direction: column; height: 100%;" class="flex-1 overflow-hidden shadow-sm rounded-lg">
      <n-tabs type="line" animated class="h-full flex flex-col" pane-class="h-full flex flex-col overflow-hidden p-0">
        <n-tab-pane name="list" tab="媒体库" display-directive="show">
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
        </n-tab-pane>

        <n-tab-pane name="upload" tab="上传图片">
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
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <n-modal v-model:show="showConfigModal" preset="dialog" title="图床配置" :show-icon="false">
      <n-form ref="configFormRef" :model="configForm" :rules="configRules" label-placement="top" class="mt-4">
        <n-form-item label="图床域名" path="domain">
          <n-input v-model:value="configForm.domain" placeholder="https://cdn.example.com" />
        </n-form-item>
        <n-form-item label="API Token" path="apiToken">
          <n-input v-model:value="configForm.apiToken" type="password" show-password-on="click" placeholder="Cloudflare R2 API Token" />
        </n-form-item>
        <n-form-item label="默认上传目录" path="uploadFolder">
          <n-input v-model:value="configForm.uploadFolder" placeholder="可选 (如: static/images)" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="showConfigModal = false">取消</n-button>
        <n-button type="primary" @click="saveConfig" :loading="savingConfig">保存配置</n-button>
      </template>
    </n-modal>

    <ImagebedPreviewModal
      :show="showPreviewModal"
      :preview-url="previewUrl"
      :on-update-show="(v) => (showPreviewModal = v)"
      :on-copy="copyToClipboard"
    />
  </div>
</template>

<script setup lang="ts">
import ImagebedFileArea from '~/features/gallery-admin/components/imagebed/ImagebedFileArea.vue'
import ImagebedUploadArea from '~/features/gallery-admin/components/imagebed/ImagebedUploadArea.vue'
import ImagebedPreviewModal from '~/features/gallery-admin/components/imagebed/ImagebedPreviewModal.vue'
import { useAdminImagebedPage } from '~/features/gallery-admin/composables/useAdminImagebedPage'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth']
})

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

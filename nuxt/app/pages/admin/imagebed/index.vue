<template>
  <div class="flex flex-col h-[calc(100vh-9rem)] gap-6">
    <!-- 页面标题 -->
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between shrink-0">
      <div class="space-y-1.5">
        <p class="text-xs uppercase tracking-[0.18em] text-muted font-medium">媒体</p>
        <div class="flex items-center gap-3">
          <h1 class="font-display text-2xl font-semibold text-highlighted tracking-tight">图床管理</h1>
          <UBadge
            v-if="!isConfigured"
            color="warning"
            variant="subtle"
            size="sm"
          >
            <Icon name="heroicons:exclamation-triangle" class="mr-1" />
            未配置
          </UBadge>
          <UBadge
            v-else
            color="success"
            variant="subtle"
            size="sm"
          >
            <Icon name="heroicons:check-circle" class="mr-1" />
            已就绪
          </UBadge>
        </div>
        <p class="text-sm text-muted">
          浏览、上传与管理 Cloudflare R2 上的图片资源。
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          icon="heroicons:arrow-left"
          size="sm"
          to="/admin"
        >
          返回仪表板
        </UButton>
        <UButton
          variant="soft"
          color="neutral"
          icon="heroicons:cog-6-tooth"
          @click="showConfigModal = true"
        >
          设置
        </UButton>
      </div>
    </header>

    <UCard
      variant="subtle"
      class="flex-1 overflow-hidden"
      :ui="{ root: 'ring ring-default/40 flex flex-col overflow-hidden', body: 'p-0 flex flex-col h-full' }"
    >
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

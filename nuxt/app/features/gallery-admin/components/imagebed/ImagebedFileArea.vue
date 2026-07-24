<template>
  <div class="flex flex-col h-full">
    <ImagebedToolbar
      :current-path="currentPath"
      :path-segments="pathSegments"
      :search-keyword="searchKeyword"
      :list-loading="listLoading"
      :selected-count="selectedRowKeys.length"
      :view-mode="viewMode"
      :on-navigate-to="navigateTo"
      :on-get-path-up-to="getPathUpTo"
      :on-refresh="fetchFileList"
      :on-update-search="updateSearchKeyword"
      :on-search-enter="fetchFileList"
      :on-batch-delete="confirmBatchDelete"
      :on-update-view-mode="updateViewMode"
    />

    <div class="flex-1 overflow-auto p-4 bg-white dark:bg-gray-900 relative">
      <div v-if="listLoading" class="flex justify-center items-center min-h-[200px]">
        <USpinner />
      </div>

      <div v-else-if="items.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400 py-12">
        <Icon name="folder-open" size="4xl" class="mb-4 opacity-30" />
        <p>文件夹为空</p>
      </div>

      <div v-else-if="viewMode === 'grid'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <div
          v-for="folder in currentFolders"
          :key="'folder-' + folder.name"
          class="group relative border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer bg-gray-50 dark:bg-gray-800"
          @click="navigateTo(folder.name)"
        >
          <div class="aspect-square flex items-center justify-center mb-2 text-yellow-500">
            <Icon name="folder" size="4xl" />
          </div>
          <div class="text-center text-xs truncate px-1 font-medium">{{ folder.displayName }}</div>

          <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon
              square
              @click.stop="handleDeleteFolderClick(folder)"
            >
              <Icon name="trash" />
            </UButton>
          </div>
        </div>

        <div
          v-for="file in currentFiles"
          :key="file.name"
          class="group relative border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md hover:border-blue-400 transition-all bg-white dark:bg-gray-800"
          :class="{ 'ring-2 ring-blue-500': selectedRowKeys.includes(file.name) }"
        >
          <div class="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" :class="{ 'opacity-100': selectedRowKeys.includes(file.name) }">
            <UCheckbox
              :model-value="selectedRowKeys.includes(file.name)"
              @update:model-value="toggleSelection(file.name, $event)"
              class="bg-white rounded-sm"
            />
          </div>

          <div class="aspect-square bg-gray-100 dark:bg-gray-900 relative overflow-hidden group/img">
            <img :src="file.fullUrl" :alt="file.displayName" class="w-full h-full object-cover" loading="lazy" />

            <div class="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-[1px]">
              <UButton variant="ghost" color="primary" icon square size="sm" @click="previewFile(file)">
                <Icon name="eye" />
              </UButton>
              <UButton variant="ghost" color="primary" icon square size="sm" @click="copyToClipboard(file.fullUrl)">
                <Icon name="clipboard" />
              </UButton>
            </div>
          </div>

          <div class="p-2 text-xs">
            <div class="truncate font-medium text-gray-700 dark:text-gray-200 mb-1" :title="file.name">{{ file.displayName }}</div>
            <div class="flex justify-between text-gray-400">
              <span>{{ file.size }}</span>
              <Icon
                name="trash"
                class="cursor-pointer hover:text-red-500 transition-colors"
                @click="handleDeleteFileClick(file)"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="min-w-full">
        <div v-if="currentFolders.length > 0" class="mb-2">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-2">文件夹</div>
          <div class="space-y-1">
            <div
              v-for="folder in currentFolders"
              :key="'list-folder-' + folder.name"
              class="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer group border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              @click="navigateTo(folder.name)"
            >
              <Icon name="folder" class="text-yellow-500 mr-3" size="lg" />
              <span class="flex-1 font-medium">{{ folder.displayName }}</span>
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                class="opacity-0 group-hover:opacity-100"
                @click.stop="handleDeleteFolderClick(folder)"
              >
                删除
              </UButton>
            </div>
          </div>
          <USeparator class="my-2" />
        </div>

        <UTable
          :data="currentFiles"
          :columns="fileColumns"
          :get-row-key="(row) => row.name"
        />
      </div>
    </div>

    <div class="p-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
      <div class="text-xs text-gray-500">
        共 {{ totalCount }} 个项目
      </div>
      <UPagination
        :page="currentPage"
        @update:page="handlePageChange"
        :total="totalCount"
        :items-per-page="pageSize"
        size="sm"
        :show-edges="false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ImagebedToolbar from './ImagebedToolbar.vue'

defineProps<{
  currentPath: string
  pathSegments: string[]
  searchKeyword: string
  listLoading: boolean
  items: any[]
  currentFiles: any[]
  currentFolders: any[]
  totalCount: number
  currentPage: number
  pageSize: number
  selectedRowKeys: string[]
  viewMode: string
  fileColumns: any[]
  navigateTo: (path: string) => void
  getPathUpTo: (index: number) => string
  fetchFileList: () => void
  updateSearchKeyword: (value: string) => void
  updateViewMode: (value: string) => void
  confirmBatchDelete: () => void
  toggleSelection: (key: string, checked: boolean) => void
  handleCheck: (keys: string[]) => void
  previewFile: (file: any) => void
  copyToClipboard: (text: string) => Promise<void>
  executeDeleteFromList: (row: any) => Promise<void>
  confirmDeleteFolder: (folderPath: string) => void
  handlePageChange: (page: number) => void
}>()

const emit = defineEmits<{
  (e: 'select-folder', folder: any): void
}>()

const handleDeleteFolderClick = (folder: any) => {
  if (window.confirm(`确定删除文件夹 "${folder.displayName}" 及其所有内容吗？`)) {
    confirmDeleteFolder(folder.name)
  }
}

const handleDeleteFileClick = (file: any) => {
  if (window.confirm('确定删除此文件吗？')) {
    executeDeleteFromList(file)
  }
}
</script>

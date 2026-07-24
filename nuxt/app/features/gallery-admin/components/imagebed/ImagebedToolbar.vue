<template>
  <div class="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
    <div class="flex flex-1 items-center gap-3 min-w-0">
      <nav class="flex items-center text-sm text-gray-600 dark:text-gray-300 overflow-hidden whitespace-nowrap">
        <UButton variant="ghost" color="neutral" size="sm" @click="onNavigateTo('')" :disabled="currentPath === ''">
          <template #leading>
            <Icon name="home" />
          </template>
          根目录
        </UButton>
        <template v-if="pathSegments.length">
          <span class="mx-1 text-gray-400">/</span>
          <div v-for="(segment, index) in pathSegments" :key="index" class="flex items-center">
            <UButton variant="ghost" color="neutral" size="sm" @click="onNavigateTo(onGetPathUpTo(index))" :disabled="index === pathSegments.length - 1">
              {{ segment }}
            </UButton>
            <span v-if="index < pathSegments.length - 1" class="mx-1 text-gray-400">/</span>
          </div>
        </template>
      </nav>

      <USeparator orientation="vertical" class="h-6" />

      <UButton variant="ghost" color="neutral" icon square size="sm" @click="onRefresh" :loading="listLoading" title="刷新">
        <Icon name="arrow-path" />
      </UButton>

      <UInput
        :model-value="searchKeyword"
        @update:model-value="onUpdateSearch"
        placeholder="搜索文件..."
        size="sm"
        class="w-48"
        @keyup.enter="onSearchEnter"
      >
        <template #leading>
          <Icon name="magnifying-glass" />
        </template>
      </UInput>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <UButton v-if="selectedCount > 0" color="error" variant="soft" size="sm" @click="onBatchDelete">
        <template #leading>
          <Icon name="trash" />
        </template>
        删除 ({{ selectedCount }})
      </UButton>

      <URadioGroup
        :model-value="viewMode"
        :items="viewModeOptions"
        @update:model-value="onUpdateViewMode"
        size="sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const viewModeOptions = [
  { value: 'list', label: '' },
  { value: 'grid', label: '' }
]

defineProps<{
  currentPath: string
  pathSegments: string[]
  searchKeyword: string
  listLoading: boolean
  selectedCount: number
  viewMode: string
  onNavigateTo: (path: string) => void
  onGetPathUpTo: (index: number) => string
  onRefresh: () => void
  onUpdateSearch: (value: string) => void
  onSearchEnter: () => void
  onBatchDelete: () => void
  onUpdateViewMode: (value: string) => void
}>()
</script>

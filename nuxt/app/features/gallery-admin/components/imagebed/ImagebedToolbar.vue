<template>
  <div class="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
    <div class="flex flex-1 items-center gap-3 min-w-0">
      <nav class="flex items-center text-sm text-gray-600 dark:text-gray-300 overflow-hidden whitespace-nowrap">
        <n-button text size="small" @click="onNavigateTo('')" :disabled="currentPath === ''">
          <Icon name="home" class="mr-1" /> 根目录
        </n-button>
        <template v-if="pathSegments.length">
          <span class="mx-1 text-gray-400">/</span>
          <div v-for="(segment, index) in pathSegments" :key="index" class="flex items-center">
            <n-button text size="small" @click="onNavigateTo(onGetPathUpTo(index))" :disabled="index === pathSegments.length - 1">
              {{ segment }}
            </n-button>
            <span v-if="index < pathSegments.length - 1" class="mx-1 text-gray-400">/</span>
          </div>
        </template>
      </nav>

      <n-divider vertical />

      <n-button quaternary circle size="small" @click="onRefresh" :loading="listLoading" title="刷新">
        <template #icon><Icon name="arrow-path" /></template>
      </n-button>

      <n-input
        :value="searchKeyword"
        @update:value="onUpdateSearch"
        placeholder="搜索文件..."
        clearable
        size="small"
        class="w-48"
        @keyup.enter="onSearchEnter"
      >
        <template #prefix><Icon name="magnifying-glass" /></template>
      </n-input>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <n-button v-if="selectedCount > 0" type="error" size="small" secondary @click="onBatchDelete">
        <template #icon><Icon name="trash" /></template>
        删除 ({{ selectedCount }})
      </n-button>

      <n-radio-group :value="viewMode" @update:value="onUpdateViewMode" size="small">
        <n-radio-button value="list">
          <Icon name="list-bullet" />
        </n-radio-button>
        <n-radio-button value="grid">
          <Icon name="squares-2x2" />
        </n-radio-button>
      </n-radio-group>
    </div>
  </div>
</template>

<script setup lang="ts">
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

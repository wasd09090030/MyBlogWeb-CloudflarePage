<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <UTabs
        :model-value="activeTab"
        :items="tabItems"
        @update:model-value="onUpdateTab"
        variant="pill"
      />

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">排序方式:</span>
        <USelect
          :model-value="sortBy"
          @update:model-value="onUpdateSort"
          :items="sortOptions"
          value-key="value"
          size="sm"
          class="w-44"
        />
      </div>
    </div>

    <UAlert
      icon="i-heroicons-information-circle"
      color="info"
      class="mb-4"
      title="提示：拖动图片卡片可以调整排序，松开后自动保存（仅在“手动排序”模式下生效）"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  activeTab: string
  sortBy: string
  totalCount: number
  gameCount: number
  artworkCount: number
  sortOptions: Array<{ label: string; value: string }>
  onUpdateTab: (value: string) => void
  onUpdateSort: (value: string) => void
}>()

const tabItems = computed(() => [
  {
    value: 'all',
    label: `全部 (${props.totalCount})`,
    icon: 'i-heroicons-squares-2x2'
  },
  {
    value: 'game',
    label: `游戏截图 (${props.gameCount})`,
    icon: 'i-heroicons-puzzle-piece'
  },
  {
    value: 'artwork',
    label: `艺术作品 (${props.artworkCount})`,
    icon: 'i-heroicons-paint-brush'
  }
])
</script>

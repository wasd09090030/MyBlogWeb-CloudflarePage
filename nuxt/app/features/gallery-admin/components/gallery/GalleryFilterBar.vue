<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <n-tabs :value="activeTab" @update:value="onUpdateTab" type="segment" animated>
        <n-tab-pane name="all" tab="全部">
          <template #tab>
            <div class="flex items-center gap-2">
              <Icon name="squares-2x2" size="sm" />
              <span>全部 ({{ totalCount }})</span>
            </div>
          </template>
        </n-tab-pane>
        <n-tab-pane name="game" tab="游戏截图">
          <template #tab>
            <div class="flex items-center gap-2">
              <Icon name="puzzle-piece" size="sm" />
              <span>游戏截图 ({{ gameCount }})</span>
            </div>
          </template>
        </n-tab-pane>
        <n-tab-pane name="artwork" tab="艺术作品">
          <template #tab>
            <div class="flex items-center gap-2">
              <Icon name="paint-brush" size="sm" />
              <span>艺术作品 ({{ artworkCount }})</span>
            </div>
          </template>
        </n-tab-pane>
      </n-tabs>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">排序方式:</span>
        <n-select
          :value="sortBy"
          @update:value="onUpdateSort"
          :options="sortOptions"
          style="width: 180px"
          size="small"
        />
      </div>
    </div>

    <n-alert type="info" class="mb-4">
      <template #icon>
        <Icon name="information-circle" size="md" />
      </template>
      提示：拖动图片卡片可以调整排序，松开后自动保存（仅在"手动排序"模式下生效）
    </n-alert>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeTab: string
  sortBy: string
  totalCount: number
  gameCount: number
  artworkCount: number
  sortOptions: Array<{ label: string; value: string }>
  onUpdateTab: (value: string) => void
  onUpdateSort: (value: string) => void
}>()
</script>

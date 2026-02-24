<template>
  <div>
    <!-- Search Button -->
<button
  @click="showModal = true"
  class="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/35 backdrop-blur-md border border-white/30 transition-all duration-300 text-white hover:text-white hover:scale-105 active:scale-95 btn-search"
  aria-label="Search"
>
      <Icon name="mdi:magnify" size="20" />
    </button>

    <!-- Search Modal -->
    <n-modal
      v-model:show="showModal"
      preset="card"
      style="width: 600px; max-width: 90vw; position: fixed; top: 100px; left: 50%; transform: translateX(-50%);"
      :bordered="false"
      class="search-modal bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl"
      size="huge"
      :mask-closable="true"
    >
      <template #header>
        <div class="flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <Icon name="mdi:magnify" size="24" class="text-primary-500" />
          <span class="font-medium">搜索文章</span>
        </div>
      </template>
      
      <div class="py-4">
        <n-input
          ref="searchInputRef"
          v-model:value="searchQuery"
          type="text"
          placeholder="输入关键词回车搜索..."
          size="large"
          clearable
          round
          class="text-lg"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <Icon name="mdi:magnify" class="text-gray-400" />
          </template>
        </n-input>
        
        <div class="mt-4 flex flex-wrap gap-2">
          <div class="text-xs text-gray-500 dark:text-gray-400 w-full mb-1">热门搜索:</div>
          <n-tag 
            v-for="tag in popularTags" 
            :key="tag" 
            size="small" 
            clickable 
            round
            @click="quickSearch(tag)"
            class="cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30"
          >
            {{ tag }}
          </n-tag>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showModal = false" quaternary>
            取消
          </n-button>
          <n-button type="primary" @click="handleSearch" :disabled="!searchQuery.trim()">
            搜索
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
const showModal = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)

// 热门搜索标签（可以是静态的或者从配置读取）
const popularTags = ['Vue', 'Nuxt', 'C#', '.NET', '动漫']

// 自动聚焦输入框
watch(showModal, async (val) => {
  if (val) {
    searchQuery.value = ''
    await nextTick()
    // Naive UI 的 Input 组件聚焦方法
    searchInputRef.value?.focus()
  }
})

const handleSearch = () => {
  const trimmedQuery = searchQuery.value.trim()
  
  if (!trimmedQuery) return
  
  showModal.value = false
  
  navigateTo({
    path: '/',
    query: { search: trimmedQuery }
  })
}

const quickSearch = (tag) => {
  searchQuery.value = tag
  handleSearch()
}
</script>

<style scoped>
.btn-search {
  /* 适当增加点击区域 */
  padding: 0.25rem;
  background-color: rgb(18, 167, 253);
}
/* 自定义模态框样式 */
:deep(.n-card-header) {
  padding-bottom: 0;
}

:deep(.n-input) {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark :deep(.n-input) {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>

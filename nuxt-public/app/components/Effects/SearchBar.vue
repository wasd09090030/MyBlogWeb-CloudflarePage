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
    <UModal
      v-model:open="showModal"
      :ui="{ content: 'sm:max-w-[600px] fixed top-[100px] left-1/2 -translate-x-1/2' }"
      :overlay="true"
    >
      <template #header>
        <div class="flex items-center gap-2 text-gray-800 dark:text-gray-100">
          <Icon name="mdi:magnify" size="24" class="text-primary-500" />
          <span class="font-medium">搜索文章</span>
        </div>
      </template>

      <template #body>
        <div class="py-4">
          <UInput
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="输入关键词回车搜索..."
            size="lg"
            :ui="{ base: 'text-lg rounded-lg' }"
            @keyup.enter="handleSearch"
          >
            <template #leading>
              <Icon name="mdi:magnify" class="text-gray-400" />
            </template>
          </UInput>

          <div class="mt-4 flex flex-wrap gap-2">
            <div class="text-xs text-gray-500 dark:text-gray-400 w-full mb-1">热门搜索:</div>
            <UBadge
              v-for="tag in popularTags"
              :key="tag"
              size="sm"
              variant="soft"
              color="primary"
              class="cursor-pointer"
              @click="quickSearch(tag)"
            >
              {{ tag }}
            </UBadge>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="showModal = false">
            取消
          </UButton>
          <UButton color="primary" :disabled="!searchQuery.trim()" @click="handleSearch">
            搜索
          </UButton>
        </div>
      </template>
    </UModal>
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
    // Nuxt UI 的 Input 组件聚焦方法
    searchInputRef.value?.focus?.()
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
</style>

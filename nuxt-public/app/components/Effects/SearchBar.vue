<template>
  <div class="search-entry">
    <button type="button" class="search-pill" aria-label="搜索文章" aria-haspopup="dialog" @click="showModal = true">
      <Icon name="mdi:magnify" size="18" />
      <span>搜索文章</span>
      <kbd class="search-pill__shortcut" aria-hidden="true">/</kbd>
    </button>

    <UModal v-model:open="showModal" title="搜索文章" :ui="{ content: 'sm:max-w-[42rem]', body: 'p-0' }">
      <template #header>
        <div class="search-dialog__heading">
          <span class="search-dialog__icon"><Icon name="mdi:magnify" size="20" /></span>
          <div>
            <p class="search-dialog__eyebrow">ARCHIVE</p>
            <h2 class="search-dialog__title">搜索文章</h2>
          </div>
        </div>
      </template>
      <template #body>
        <div class="search-dialog__body">
          <UInput ref="searchInputRef" v-model="searchQuery" type="text" placeholder="输入标题、标签或正文关键词" size="lg" class="search-dialog__input" @keyup.enter="handleSearch">
            <template #leading><Icon name="mdi:magnify" /></template>
          </UInput>
          <div class="search-dialog__tags" aria-label="常用搜索">
            <span class="search-dialog__tags-label">常用主题</span>
            <UButton v-for="tag in popularTags" :key="tag" size="xs" color="neutral" variant="outline" class="search-dialog__tag" @click="quickSearch(tag)">{{ tag }}</UButton>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="search-dialog__footer">
          <span class="search-dialog__hint">按 Enter 开始检索</span>
          <div class="flex gap-2">
            <UButton color="neutral" variant="ghost" @click="showModal = false">取消</UButton>
            <UButton color="primary" icon="mdi:magnify" :disabled="!searchQuery.trim()" @click="handleSearch">搜索</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup>
const showModal = ref(false)
const searchQuery = ref('')
const searchInputRef = ref(null)
const popularTags = ['Vue', 'Nuxt', 'C#', '.NET', '动漫']

watch(showModal, async (isOpen) => {
  if (!isOpen) return
  searchQuery.value = ''
  await nextTick()
  searchInputRef.value?.focus?.()
})

const handleSearch = () => {
  const trimmedQuery = searchQuery.value.trim()
  if (!trimmedQuery) return
  showModal.value = false
  navigateTo({ path: '/', query: { search: trimmedQuery } })
}

const quickSearch = (tag) => {
  searchQuery.value = tag
  handleSearch()
}
</script>

<style scoped>
@import '~/assets/css/components/SearchBar.desktop.css';
@import '~/assets/css/components/SearchBar.mobile.css';
</style>

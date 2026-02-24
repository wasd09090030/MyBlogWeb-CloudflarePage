<template>
  <div class="category-bar">
    <div class="category-bar-wrapper">
      <div class="category-list" id="category-list">
        <NuxtLink 
          to="/" 
          class="category-list-item"
          :class="{ active: !route.query.category }"
        >
          首页
        </NuxtLink>
        <NuxtLink 
          to="/?category=study" 
          class="category-list-item"
          :class="{ active: route.query.category === 'study' }"
        >
          学习
        </NuxtLink>
        <NuxtLink 
          to="/?category=game" 
          class="category-list-item"
          :class="{ active: route.query.category === 'game' }"
        >
          游戏
        </NuxtLink>
        <NuxtLink 
          to="/?category=work" 
          class="category-list-item"
          :class="{ active: route.query.category === 'work' }"
        >
          个人作品
        </NuxtLink>
        <NuxtLink 
          to="/?category=resource" 
          class="category-list-item"
          :class="{ active: route.query.category === 'resource' }"
        >
          资源分享
        </NuxtLink>
      </div>
    </div>
    <div class="category-bar-actions">
      <button 
        type="button" 
        class="view-toggle-btn"
        :class="{ active: isListView }"
        @click="$emit('update:viewMode', 'list')"
        title="列表视图"
      >
        <Icon name="view-stacked" size="sm" />
      </button>
      <button 
        type="button" 
        class="view-toggle-btn"
        :class="{ active: isGridView }"
        @click="$emit('update:viewMode', 'grid')"
        title="网格视图"
      >
        <Icon name="grid-3x3-gap-fill" size="sm" />
      </button>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()

const props = defineProps({
  viewMode: {
    type: String,
    default: 'list'
  }
})

defineEmits(['update:viewMode'])

const isListView = computed(() => props.viewMode === 'list')
const isGridView = computed(() => props.viewMode === 'grid')
</script>

<style scoped>
.view-toggle-btn {
  padding: 0.6rem;
  line-height: 0;
}
</style>
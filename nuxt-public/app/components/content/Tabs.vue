<template>
  <div class="tabs-mdc my-6">
    <!-- 标签头 -->
    <div class="tabs-header border-b mb-4" role="tablist">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab-btn font-medium transition-colors duration-200 border-b-2"
        type="button"
        role="tab"
        :aria-selected="activeTab === index"
        @click="activeTab = index"
      >
        {{ tab.label }}
      </button>
    </div>
    
    <!-- 标签内容 -->
    <div class="tabs-content">
      <div
        v-for="(tab, index) in tabs"
        :key="index"
        v-show="activeTab === index"
        class="tab-panel"
        role="tabpanel"
      >
        <slot :name="tab.slot" />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Tabs 标签页组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::tabs
 * ---
 * labels: ["方法一", "方法二", "方法三"]
 * ---
 * #tab-0
 * 这是第一个标签页的内容
 * 
 * #tab-1
 * 这是第二个标签页的内容
 * 
 * #tab-2
 * 这是第三个标签页的内容
 * ::
 */

const props = defineProps({
  labels: {
    type: Array,
    default: () => ['Tab 1', 'Tab 2', 'Tab 3']
  }
})

const slots = useSlots()
const activeTab = ref(0)

// 根据 slots 和 labels 生成标签配置
const tabs = computed(() => {
  const slotNames = Object.keys(slots).filter(name => name.startsWith('tab-'))
  return props.labels.map((label, index) => ({
    label,
    slot: `tab-${index}`
  }))
})
</script>

<style scoped>
.tab-btn {
  position: relative;
  outline: none;
}

.tab-btn:focus-visible {
  outline: 2px solid var(--article-prose-accent);
  outline-offset: 2px;
}

.tab-panel :deep(> *:first-child) {
  margin-top: 0;
}

.tab-panel :deep(> *:last-child) {
  margin-bottom: 0;
}
</style>

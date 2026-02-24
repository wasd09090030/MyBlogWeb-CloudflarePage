<template>
  <div class="tabs-mdc my-6">
    <!-- 标签头 -->
    <div class="tabs-header flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
      <button
        v-for="(tab, index) in tabs"
        :key="index"
        :class="[
          'tab-btn px-4 py-2 font-medium transition-all duration-200 border-b-2',
          activeTab === index
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
        ]"
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
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}

.tab-panel :deep(> *:first-child) {
  margin-top: 0;
}

.tab-panel :deep(> *:last-child) {
  margin-bottom: 0;
}
</style>

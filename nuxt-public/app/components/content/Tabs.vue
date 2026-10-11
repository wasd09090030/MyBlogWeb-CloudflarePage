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
        :id="tabId(index)"
        :aria-selected="activeTab === index"
        :aria-controls="panelId(index)"
        :tabindex="activeTab === index ? 0 : -1"
        @click="activeTab = index"
        @keydown="handleTabKeydown($event, index)"
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
        :id="panelId(index)"
        :aria-labelledby="tabId(index)"
        tabindex="0"
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

import { getCurrentInstance } from 'vue'

const props = defineProps({
  labels: {
    type: Array,
    default: () => ['Tab 1', 'Tab 2', 'Tab 3']
  }
})

const activeTab = ref(0)
const tabsId = `mdc-tabs-${getCurrentInstance()?.uid ?? 0}`

const tabId = (index) => `${tabsId}-tab-${index}`
const panelId = (index) => `${tabsId}-panel-${index}`

const handleTabKeydown = (event, index) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || tabs.value.length === 0) return

  event.preventDefault()

  const nextIndex = event.key === 'Home'
    ? 0
    : event.key === 'End'
      ? tabs.value.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.value.length) % tabs.value.length

  activeTab.value = nextIndex
  nextTick(() => document.getElementById(tabId(nextIndex))?.focus())
}

// 根据 slots 和 labels 生成标签配置
const tabs = computed(() => {
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

<template>
  <div :class="alertClasses" class="alert-mdc my-4 p-4 rounded-lg border-l-4 shadow-sm">
    <div class="flex items-start gap-3">
      <!-- 图标 -->
      <div class="flex-shrink-0 mt-0.5">
        <Icon :name="iconName" :class="iconColorClass" size="xl" />
      </div>
      
      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <!-- 标题 -->
        <h4 v-if="$slots.title" class="font-semibold mb-1 text-lg">
          <slot name="title" />
        </h4>
        
        <!-- 主要内容 -->
        <div class="alert-content">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Alert / Callout 组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::alert{type="info"}
 * #title
 * 标题文字
 * #default
 * 这是提示内容
 * ::
 * 
 * type 可选值：info, success, warning, error
 */

const props = defineProps({
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['info', 'success', 'warning', 'error'].includes(value)
  }
})

const alertConfig = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    icon: 'information-circle',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-500',
    icon: 'check-circle',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    icon: 'exclamation-triangle',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-500',
    icon: 'x-circle',
    iconColor: 'text-red-600 dark:text-red-400'
  }
}

const config = computed(() => alertConfig[props.type])
const alertClasses = computed(() => [config.value.bg, config.value.border])
const iconName = computed(() => config.value.icon)
const iconColorClass = computed(() => config.value.iconColor)
</script>

<style scoped>
.alert-content :deep(p:last-child) {
  margin-bottom: 0;
}

.alert-content :deep(ul),
.alert-content :deep(ol) {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
}
</style>

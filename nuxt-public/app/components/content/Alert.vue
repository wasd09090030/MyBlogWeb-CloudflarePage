<template>
  <div :class="`alert-mdc--${type}`" class="alert-mdc my-4 p-4">
    <div class="flex items-start gap-3">
      <!-- 图标 -->
      <div class="shrink-0 mt-0.5">
        <Icon :name="iconName" class="alert-icon" size="xl" />
      </div>
      
      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <!-- 标题 -->
        <h4 v-if="$slots.title" class="font-semibold mb-1 text-base">
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
    icon: 'heroicons:information-circle',
  },
  success: {
    icon: 'heroicons:check-circle',
  },
  warning: {
    icon: 'heroicons:exclamation-triangle',
  },
  error: {
    icon: 'heroicons:x-circle',
  }
}

const config = computed(() => alertConfig[props.type])
const iconName = computed(() => config.value.icon)
</script>

<style scoped>
.alert-mdc--info { --mdc-tone: var(--article-prose-accent); }
.alert-mdc--success { --mdc-tone: var(--article-prose-success); }
.alert-mdc--warning { --mdc-tone: var(--article-prose-warning); }
.alert-mdc--error { --mdc-tone: var(--article-prose-error); }
.alert-icon { color: var(--mdc-tone); }

.alert-content :deep(p:last-child) {
  margin-bottom: 0;
}

.alert-content :deep(ul),
.alert-content :deep(ol) {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
}
</style>

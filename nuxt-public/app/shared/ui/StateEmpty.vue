<template>
  <div class="empty-state" role="status" aria-live="polite">
    <slot>
      <Icon :name="icon" size="3xl" class="empty-state-icon text-muted mb-3" />
      <h3 v-if="title" class="empty-state-title text-muted">{{ title }}</h3>
      <p v-if="description" class="empty-state-description text-muted">{{ description }}</p>

      <div v-if="actions.length" class="empty-state-actions">
        <UButton
          v-for="(action, idx) in actions"
          :key="idx"
          :color="action.color || 'primary'"
          :variant="action.variant || 'solid'"
          @click="action.onClick"
        >
          {{ action.label }}
        </UButton>
      </div>
    </slot>
  </div>
</template>

<script setup>
/**
 * StateEmpty 适用场景：
 * - 列表/详情无数据时的统一占位态
 * - 允许通过 props 快速设置图标与文案、CTA（actions），或用 slot 完全自定义内容
 *
 * 不适用场景：
 * - 业务引导页（应使用专门引导组件）
 * - 需要复杂 CTA 组合的营销模块
 */
defineProps({
  icon: {
    type: String,
    default: 'heroicons:photo'
  },
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: '暂无数据'
  },
  actions: {
    type: Array,
    default: () => []
    // 每项形如：{ label: string, onClick: () => void, color?: string, variant?: string }
  }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1rem;
  text-align: center;
}

.empty-state-icon {
  display: block;
}

.empty-state-title {
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
  font-weight: 600;
}

.empty-state-description {
  margin: 0;
  font-size: 0.95rem;
  opacity: 0.85;
}

.empty-state-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
</style>

<template>
  <div class="steps-mdc my-6 p-4 overflow-hidden">
    <!-- 装饰性光晕效果 -->

    <!-- 内容区域 -->
    <div>
      <UStepper
        v-model="stepperIndex"
        :items="stepperItems"
        :orientation="vertical ? 'vertical' : 'horizontal'"
        :size="size === 'small' ? 'sm' : 'md'"
        :disabled="!clickable"
      />

      <!-- 控制按钮（可选） -->
      <div v-if="showControls" class="steps-controls flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700" :class="{ 'justify-center': vertical }">
        <UButton
          :disabled="currentStep <= 1"
          color="neutral"
          variant="soft"
          @click="prevStep"
        >
          <template #leading-icon>
            <Icon name="mdi:chevron-left" />
          </template>
          上一步
        </UButton>

        <UButton
          v-if="currentStep < stepsList.length"
          :disabled="currentStep >= stepsList.length"
          color="primary"
          @click="nextStep"
        >
          下一步
          <template #trailing-icon>
            <Icon name="mdi:chevron-right" />
          </template>
        </UButton>

        <UButton
          v-else
          color="success"
          @click="onComplete"
        >
          <template #leading-icon>
            <Icon name="mdi:check" />
          </template>
          完成
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Steps 步骤条组件 - MDC 语法
 *
 * 在 Markdown 中使用：
 * ::steps{current="2"}
 * ---
 * steps:
 *   - title: "第一步"
 *     description: "注册账号"
 *   - title: "第二步"
 *     description: "完善信息"
 *   - title: "第三步"
 *     description: "开始使用"
 * ---
 * ::
 *
 * 垂直布局带控制按钮：
 * ::steps{current="1" vertical showControls}
 * ---
 * steps:
 *   - title: "安装依赖"
 *     description: "npm install"
 * ::
 *
 * 可点击步骤：
 * ::steps{current="2" clickable showControls}
 */

const props = defineProps({
  // 当前步骤：1-based 索引（沿用历史 NaiveUI n-steps 的 1-based 语义；Nuxt UI UStepper 内部是 0-based，由 stepperIndex 计算属性双向转换）
  current: {
    type: [Number, String],
    default: 1
  },
  // 步骤状态（保留字段以兼容 MDC frontmatter；UStepper 通过颜色自动判断）
  status: {
    type: String,
    default: 'process',
    validator: (value) => ['process', 'finish', 'error', 'wait'].includes(value)
  },
  // 是否垂直布局
  vertical: {
    type: Boolean,
    default: false
  },
  // 尺寸: small | medium
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium'].includes(value)
  },
  // 步骤列表（从 YAML frontmatter 传入）
  steps: {
    type: Array,
    default: () => []
  },
  // 是否显示控制按钮
  showControls: {
    type: Boolean,
    default: false
  },
  // 是否可点击步骤跳转
  clickable: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:current', 'change', 'complete'])

// 对外 API 维持 1-based；UStepper 内部是 0-based，转换放在 stepperIndex
const currentStep = ref(Number(props.current) || 1)
const stepperIndex = computed({
  get: () => Math.max(0, currentStep.value - 1),
  set: (val) => {
    const oneBased = val + 1
    if (oneBased !== currentStep.value) {
      currentStep.value = oneBased
      emit('update:current', oneBased)
      emit('change', oneBased)
    }
  }
})

watch(() => props.current, (newVal) => {
  const parsed = Number(newVal) || 1
  if (parsed !== currentStep.value) {
    currentStep.value = parsed
  }
})

const stepsList = computed(() => props.steps || [])

// 将 props.steps（[{title, description}]）映射为 UStepper 期望的 items 格式
const stepperItems = computed(() => {
  return stepsList.value.map((step) => ({
    title: step.title,
    description: step.description
  }))
})

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    emit('update:current', currentStep.value)
    emit('change', currentStep.value)
  }
}

const nextStep = () => {
  if (currentStep.value < stepsList.value.length) {
    currentStep.value++
    emit('update:current', currentStep.value)
    emit('change', currentStep.value)
  }
}

const onComplete = () => {
  emit('complete')
}
</script>

<style scoped>
/* UStepper 暗色模式配色由组件内置类处理，无需 :deep 覆写 */

@media (max-width: 640px) {
  .steps-controls {
    justify-content: center;
  }
}
</style>

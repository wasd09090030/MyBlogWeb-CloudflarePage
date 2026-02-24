<template>
  <div class="star-rating-mdc my-4">
    <div class="star-rating-inner">
      <span v-if="label" class="star-rating-label text-gray-600 dark:text-gray-400">
        {{ label }}:
      </span>

      <n-rate
        :value="displayRating"
        :count="Number(maxStars)"
        :size="rateSize"
        :readonly="readonly"
        :allow-half="true"
        color="#facc15"
        class="star-rating-rate"
        @update:value="handleRateUpdate"
      />
    </div>
  </div>
</template>

<script setup>
/**
 * StarRating 星级评分组件 - MDC 语法
 * 
 * 在 Markdown 中使用：
 * ::star-rating{rating="4.5" maxStars="5" label="推荐指数" showScore}
 * ::
 * 
 * ::star-rating{rating="5" readonly}
 * 满分推荐！
 * ::
 */

const props = defineProps({
  rating: {
    type: [Number, String],
    default: 0
  },
  maxStars: {
    type: [Number, String],
    default: 5
  },
  size: {
    type: String,
    default: 'medium', // 'small' | 'medium' | 'large'
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  readonly: {
    type: Boolean,
    default: true
  },
  showScore: {
    type: Boolean,
    default: true
  },
  label: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:rating'])

const normalizeRating = (rating, maxStars) => {
  const parsed = Number(rating)
  const parsedMax = Number(maxStars)

  if (Number.isNaN(parsed)) return 0
  const max = Number.isNaN(parsedMax) ? 5 : parsedMax
  const clamped = Math.max(0, Math.min(parsed, max))
  return Math.round(clamped * 2) / 2
}

const currentRating = ref(normalizeRating(props.rating, props.maxStars))

watch(
  () => [props.rating, props.maxStars],
  ([rating, maxStars]) => {
    currentRating.value = normalizeRating(rating, maxStars)
  }
)

const displayRating = computed(() => normalizeRating(currentRating.value, props.maxStars))

const handleRateUpdate = (value) => {
  const nextValue = normalizeRating(value, props.maxStars)
  currentRating.value = nextValue

  if (!props.readonly) {
    emit('update:rating', nextValue)
  }
}

// 映射 size 到 n-rate 的尺寸
const rateSize = computed(() => {
  const sizeMap = {
    small: 18,
    medium: 24,
    large: 28
  }
  return sizeMap[props.size] || 24
})
</script>

<style scoped>
.star-rating-mdc {
  display: block;
}

.star-rating-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  line-height: 1;
}

.star-rating-label {
  display: inline-flex;
  align-items: center;
  font-size: 0.95rem;
  line-height: 1;
}

.star-rating-score {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  line-height: 1;
}

/* :deep(.star-rating-rate.n-rate) {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

:deep(.star-rating-rate .n-rate__item) {
  display: inline-flex;
  align-items: center;
} */
</style>

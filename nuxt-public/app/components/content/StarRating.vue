<template>
  <div class="star-rating-mdc my-4">
    <div class="star-rating-inner">
      <span v-if="label" class="star-rating-label">
        {{ label }}:
      </span>

      <div
        class="star-rating-row"
        :class="[`star-rating-size-${size}`, { 'star-rating-interactive': !readonly }]"
        role="img"
        :aria-label="`Rating: ${displayRating} of ${maxStars}`"
      >
        <button
          v-for="i in maxStars"
          :key="i"
          type="button"
          class="star-cell"
          :class="{ 'star-cell-readonly': readonly }"
          :disabled="readonly"
          :aria-label="readonly ? `${i} star${i > 1 ? 's' : ''}` : `Set rating to ${i}`"
          @click="handleClick(i)"
          @mouseenter="!readonly && (hoverIndex = i)"
          @mouseleave="!readonly && (hoverIndex = 0)"
        >
          <span class="star-base">
            <!-- 空星（背景） -->
            <Icon name="heroicons:star" class="star-icon star-empty" />
          </span>
          <span
            class="star-overlay"
            :style="{ width: fillWidthForStar(i) }"
          >
            <Icon name="heroicons:star-solid" class="star-icon star-filled" />
          </span>
        </button>
      </div>

      <span v-if="showScore" class="star-rating-score">
        {{ displayRating.toFixed(1) }} / {{ maxStars }}
      </span>
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
 *
 * 实现说明（Phase 1 改造）：
 * - 替换 n-rate，自实现以支持 half-star 渐变填充
 * - 只读模式默认；readonly=false 时支持点击与 hover
 * - 评分值以 0.5 步进，maxStars 上限 10
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
const hoverIndex = ref(0)

watch(
  () => [props.rating, props.maxStars],
  ([rating, maxStars]) => {
    currentRating.value = normalizeRating(rating, maxStars)
  }
)

const displayRating = computed(() => {
  if (hoverIndex.value > 0 && !props.readonly) {
    return hoverIndex.value
  }
  return currentRating.value
})

const handleClick = (value) => {
  if (props.readonly) return
  const next = normalizeRating(value, props.maxStars)
  currentRating.value = next
  emit('update:rating', next)
}

// 计算第 i 颗星的填充百分比（0% / 50% / 100%）
const fillWidthForStar = (i) => {
  const rating = displayRating.value
  const diff = rating - (i - 1)
  if (diff >= 1) return '100%'
  if (diff >= 0.5) return '50%'
  return '0%'
}

const maxStars = computed(() => {
  const parsed = Number(props.maxStars)
  if (Number.isNaN(parsed)) return 5
  return Math.min(10, Math.max(1, Math.floor(parsed)))
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
  color: rgb(75 85 99);
}

.dark .star-rating-label {
  color: rgb(156 163 175);
}

.star-rating-score {
  display: inline-flex;
  align-items: center;
  font-size: 0.85rem;
  line-height: 1;
  color: rgb(107 114 128);
}

.dark .star-rating-score {
  color: rgb(156 163 175);
}

.star-rating-row {
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
}

.star-rating-size-small {
  font-size: 1.125rem;
}

.star-rating-size-medium {
  font-size: 1.5rem;
}

.star-rating-size-large {
  font-size: 1.75rem;
}

.star-cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: transparent;
  border: 0;
  cursor: default;
  color: rgb(209 213 219);
  line-height: 1;
  transition: color 0.15s ease;
}

.star-rating-interactive .star-cell {
  cursor: pointer;
}

.star-rating-interactive .star-cell:hover {
  color: rgb(250 204 21);
}

.star-cell:disabled {
  cursor: default;
}

.star-base,
.star-overlay {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.star-overlay {
  overflow: hidden;
  width: 0;
  color: rgb(250 204 21);
}

.star-icon {
  width: 1em;
  height: 1em;
}

.star-empty {
  /* 灰色空星由 .star-cell 默认色提供 */
}
</style>
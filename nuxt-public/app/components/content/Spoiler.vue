<template>
  <div class="spoiler-mdc my-4" :class="{ 'is-revealed': revealed }">
    <!-- 警告条 -->
    <div class="spoiler-warning-bar" @click="toggle" role="button" :aria-expanded="revealed">
      <span class="spoiler-warning-icon">⚠️</span>
      <span class="spoiler-warning-label">{{ label }}</span>
      <span class="spoiler-toggle-hint">{{ revealed ? '点击隐藏' : '点击查看' }}</span>
      <span class="spoiler-chevron" :class="{ 'is-open': revealed }">▼</span>
    </div>

    <!-- 内容区 -->
    <div class="spoiler-body" :aria-hidden="!revealed">
      <!-- 遮罩层（未展开时） -->
      <div v-if="!revealed" class="spoiler-mask" @click="toggle">
        <div class="spoiler-mask-content">
          <span class="spoiler-mask-icon">👁</span>
          <span>{{ clickText }}</span>
        </div>
      </div>
      <!-- 实际内容（模糊 or 显示） -->
      <div class="spoiler-content" :class="{ blurred: !revealed }">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Spoiler 剧透遮罩组件 - MDC 语法
 *
 * ::spoiler{label="⚠ 剧情剧透" clickText="点击展示结局"}
 * 这里是被遮住的内容，可以包含任何 Markdown。
 * 主角最终**活了下来**。
 * ::
 */
const props = defineProps({
  /** 警告条标签文字 */
  label: { type: String, default: '⚠ 剧透警告' },
  /** 遮罩中央提示文字 */
  clickText: { type: String, default: '点击展示剧透内容' },
  /** 是否默认展开 */
  open: { type: Boolean, default: false }
})

const revealed = ref(props.open)

const toggle = () => {
  revealed.value = !revealed.value
}
</script>

<style scoped>
.spoiler-mdc {
  border-radius: 10px;
  overflow: hidden;
  border: 1.5px solid #f59e0b55;
  background: transparent;
}

/* 警告条 */
.spoiler-warning-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(90deg, #f59e0b22 0%, #fbbf2411 100%);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.spoiler-warning-bar:hover {
  background: linear-gradient(90deg, #f59e0b33 0%, #fbbf2422 100%);
}

.spoiler-warning-icon {
  font-size: 1rem;
}

.spoiler-warning-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #b45309;
  flex: 1;
}

:global(.dark) .spoiler-warning-label {
  color: #fbbf24;
}

.spoiler-toggle-hint {
  font-size: 0.75rem;
  color: #78716c;
  opacity: 0.8;
}

:global(.dark) .spoiler-toggle-hint {
  color: #a8a29e;
}

.spoiler-chevron {
  font-size: 0.7rem;
  color: #b45309;
  transition: transform 0.25s ease;
  display: inline-block;
}

.spoiler-chevron.is-open {
  transform: rotate(180deg);
}

/* 内容区 */
.spoiler-body {
  position: relative;
  padding: 1rem 1.25rem;
}

.spoiler-content {
  transition: filter 0.3s ease;
}

.spoiler-content.blurred {
  filter: blur(8px);
  pointer-events: none;
  user-select: none;
  /* 防止 Chromium 让模糊可读 */
  -webkit-user-select: none;
}

/* 遮罩 */
.spoiler-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 0 0 8px 8px;
}

.spoiler-mask-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid #f59e0b44;
  padding: 0.6rem 1.4rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #b45309;
  backdrop-filter: blur(2px);
  transition: background 0.15s, transform 0.15s;
}

:global(.dark) .spoiler-mask-content {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border-color: #fbbf2444;
}

.spoiler-mask-content:hover {
  background: rgba(245, 158, 11, 0.2);
  transform: scale(1.04);
}

.spoiler-mask-icon {
  font-size: 1.4rem;
}

/* 展开后平滑过渡 */
.is-revealed .spoiler-body {
  background: transparent;
}
</style>

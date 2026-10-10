<template>
  <div class="spoiler-mdc my-4" :class="{ 'is-revealed': revealed }">
    <!-- 警告条 -->
    <button type="button" class="spoiler-warning-bar" @click="toggle" :aria-expanded="revealed">
      <Icon name="heroicons:exclamation-triangle" class="spoiler-warning-icon shrink-0" />
      <span class="spoiler-warning-label">{{ label }}</span>
      <span class="spoiler-toggle-hint">{{ revealed ? '点击隐藏' : '点击查看' }}</span>
      <Icon name="heroicons:chevron-down" class="spoiler-chevron shrink-0" :class="{ 'is-open': revealed }" />
    </button>

    <!-- 内容区 -->
    <div class="spoiler-body">
      <!-- 遮罩层（未展开时） -->
      <button v-if="!revealed" type="button" class="spoiler-mask" @click="toggle" :aria-label="clickText">
        <div class="spoiler-mask-content">
          <Icon name="heroicons:eye" class="spoiler-mask-icon" />
          <span>{{ clickText }}</span>
        </div>
      </button>
      <!-- 实际内容（模糊 or 显示） -->
      <div class="spoiler-content" :class="{ blurred: !revealed }" :aria-hidden="!revealed" :inert="!revealed">
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
  overflow: hidden;
}

/* 警告条 */
.spoiler-warning-bar {
  display: flex;
  width: 100%;
  border: 0;
  text-align: start;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--article-prose-surface);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.spoiler-warning-bar:hover {
  background: var(--article-prose-hover);
}

.spoiler-warning-icon {
  font-size: 1rem;
}

.spoiler-warning-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--article-prose-heading);
  flex: 1;
}

.spoiler-toggle-hint {
  font-size: 0.75rem;
  color: var(--article-prose-muted);
  opacity: 0.8;
}

.spoiler-chevron {
  font-size: 0.7rem;
  color: var(--article-prose-muted);
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
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 0 0 var(--article-prose-radius) var(--article-prose-radius);
}

.spoiler-mask-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  background: var(--article-prose-card);
  border: 1px solid var(--article-prose-border);
  padding: 0.6rem 1.4rem;
  border-radius: var(--article-prose-radius);
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--article-prose-accent);
  backdrop-filter: blur(2px);
  transition: background 0.15s, transform 0.15s;
}

.spoiler-mask-content:hover {
  background: var(--article-prose-hover);
}

.spoiler-mask-icon {
  font-size: 1.4rem;
}

/* 展开后平滑过渡 */
.is-revealed .spoiler-body {
  background: transparent;
}
</style>

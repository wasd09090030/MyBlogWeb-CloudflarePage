<template>
  <div class="tag-cloud">
    <span
      v-for="tag in tags"
      :key="tag.name"
      class="tag-pill"
      :class="{ 'tag-pill--active': selectedTag === tag.name }"
      :style="{ fontSize: getTagSize(tag.count) }"
      @click="handleClick(tag.name)"
    >
      <span class="tag-hash">#</span>{{ tag.name }}
      <em class="tag-count">{{ tag.count }}</em>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { TagStat } from '~/features/archive/utils/archive'

const props = defineProps<{
  tags: TagStat[]
  selectedTag: string | null
}>()

const emit = defineEmits<{
  'update:selectedTag': [value: string | null]
}>()

function handleClick(name: string) {
  emit('update:selectedTag', props.selectedTag === name ? null : name)
}

/** 根据 count 在全量 tags 中的归一化位置映射为 5 个字号等级 */
function getTagSize(count: number): string {
  if (props.tags.length === 0) return '0.9rem'
  const counts = props.tags.map(t => t.count)
  const max = Math.max(...counts)
  const min = Math.min(...counts)
  const range = max - min
  if (range === 0) return '0.9rem'
  const n = (count - min) / range
  
  if (n < 0.2) return '0.75rem'
  if (n < 0.4) return '0.9rem'
  if (n < 0.6) return '1.05rem'
  if (n < 0.8) return '1.2rem'
  return '1.35rem'
}
</script>

<style scoped>
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 0.5rem;
  align-items: center; /* 确保不同字号的中心对齐，视觉上更稳健 */
  line-height: 1.2;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.35em 0.8em;
  border-radius: 100px; /* MD3 全圆角 Chip */
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.2, 0, 0, 1);
  font-weight: 500;
  
  /* 默认 MD3 Tonal 风格 */
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.tag-hash {
  opacity: 0.5;
  margin-right: 0.15em;
  font-weight: 400;
}

.tag-count {
  font-style: normal;
  font-size: 0.75em;
  font-weight: 600;
  margin-left: 0.35em;
  background: var(--article-muted-chip-bg);
  color: var(--article-muted-chip-text);
  padding: 0.15em 0.45em;
  border-radius: 12px;
  line-height: 1;
  transition: background 0.3s, color 0.3s;
}

/* Hover 浮起态 (MD3 Elevation & State Layer) */
.tag-pill:hover {
  background-color: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-color-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.tag-pill:hover .tag-count {
  background: var(--bg-primary);
  color: var(--text-secondary);
}

/* Active 激活态 (MD3 Primary Container/Primary) */
.tag-pill--active {
  background-color: var(--primary-color, #6366f1) !important;
  color: #fff !important;
  box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35) !important;
  transform: translateY(-2px);
}

.tag-pill--active .tag-hash {
  opacity: 0.8;
}

.tag-pill--active .tag-count {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}
</style>

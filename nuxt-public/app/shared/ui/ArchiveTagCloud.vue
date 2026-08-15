<template>
  <div class="tag-cloud">
    <span
      v-for="tag in tags"
      :key="tag.name"
      class="tag-link"
      :class="{ 'tag-link--active': selectedTag === tag.name }"
      :style="{ fontSize: getTagSize(tag.count) }"
      @click="handleClick(tag.name)"
    >
      <span class="tag-hash">#</span>{{ tag.name }}
      
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
  gap: 2px 20px;
  align-items: baseline;
  line-height: 2.1;
}

.tag-link {
  display: inline;
  font-family: var(--serif, 'Playfair Display', 'Noto Serif SC', 'Songti SC', Georgia, serif);
  color: var(--ink-soft, #4a423a);
  text-decoration: none;
  line-height: 2.1;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s, text-decoration-color 0.2s;

  



}

.tag-hash {
  opacity: 0.5;
  margin-right: 0.15em;
  font-weight: 400;
}



/* Hover 浮起态 (MD3 Elevation & State Layer) */
.tag-link:hover {
  color: var(--accent, #b3372a);
  text-decoration: underline;
  text-underline-offset: 5px;
}



/* Active 激活态 (MD3 Primary Container/Primary) */
.tag-link--active {

  color: var(--accent, #b3372a);
  text-decoration: underline;
  text-underline-offset: 5px;
  font-weight: 700;


}

.tag-link--active .tag-hash {
  opacity: 0.8;
}
/*
}




}
*/</style>

<template>
  <section class="game-gallery-section">
    <div class="game-section-header">
      <h2 class="game-section-title">Game screenshots</h2>
      <p class="game-section-subtitle">按月份归档（最新优先）</p>
    </div>

    <div v-if="groupedImages.length === 0" class="game-empty">
      暂无游戏截屏
    </div>

    <div v-for="group in groupedImages" :key="group.key" class="game-month-group">
      <div class="game-month-title">{{ group.label }}</div>
      <div class="game-grid">
        <button
          v-for="(image, index) in group.items"
          :key="`${image.id ?? image.imageUrl ?? 'game'}-${index}`"
          type="button"
          class="game-card"
          :style="getAspectRatioStyle(image)"
          @click="$emit('image-click', image)"
        >
          <img
            :src="image.thumbnailUrl || image.imageUrl"
            :alt="image.title || '游戏截屏'"
            loading="lazy"
          />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

defineEmits(['image-click'])

const getTimestamp = (image) => {
  const dateValue = image?.createdAt || image?.created_at || image?.created || 0
  const parsed = new Date(dateValue)
  const time = parsed.getTime()
  return Number.isFinite(time) ? time : 0
}

const getMonthKey = (timestamp) => {
  if (!timestamp) return { key: 'unknown', label: '未知月份' }
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return { key: 'unknown', label: '未知月份' }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  return {
    key: `${year}-${month}`,
    label: `${year}年${month}月`
  }
}

const sortedImages = computed(() => {
  return [...props.images].sort((a, b) => getTimestamp(b) - getTimestamp(a))
})

const groupedImages = computed(() => {
  const map = new Map()
  for (const image of sortedImages.value) {
    const timestamp = getTimestamp(image)
    const { key, label } = getMonthKey(timestamp)
    if (!map.has(key)) {
      map.set(key, { key, label, items: [] })
    }
    map.get(key).items.push(image)
  }
  return Array.from(map.values())
})

const getAspectRatioStyle = (image) => {
  const width = Number(image?.imageWidth || image?.width || 0)
  const height = Number(image?.imageHeight || image?.height || 0)
  if (width > 0 && height > 0) {
    return { aspectRatio: `${width} / ${height}` }
  }
  return { aspectRatio: '4 / 3' }
}
</script>

<style scoped>
.game-gallery-section {
  width: 100%;
  padding: 2.5rem 2rem 4rem;
}

.game-section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.game-section-title {
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0 0 0.4rem;
  color: #1f2937;
}

.game-section-subtitle {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(55, 65, 81, 0.7);
}

.game-empty {
  text-align: center;
  color: rgba(55, 65, 81, 0.6);
  padding: 2rem 0;
}

.game-month-group {
  margin-bottom: 2.5rem;
}

.game-month-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.85);
  margin-bottom: 1rem;
}

.game-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1rem;
}

.game-card {
  background: transparent;
  border: none;
  border-radius: 14px;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.game-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.game-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 28px rgba(15, 23, 42, 0.18);
}

@media (max-width: 768px) {
  .game-gallery-section {
    padding: 2rem 1rem 3rem;
  }

  .game-section-title {
    font-size: 1.3rem;
  }

  .game-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}

:global(.dark-theme) .game-section-title {
  color: rgba(248, 250, 252, 0.9);
}

:global(.dark-theme) .game-section-subtitle,
:global(.dark-theme) .game-month-title,
:global(.dark-theme) .game-empty {
  color: rgba(226, 232, 240, 0.75);
}
</style>

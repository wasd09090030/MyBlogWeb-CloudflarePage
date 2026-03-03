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
          @click="$emit('image-click', image)"
        >
          <template v-if="hasImage(image, index)">
            <ImageLoadingPlaceholder :show="!isImageLoaded(image, index)" />
            <img
              :src="image.thumbnailUrl || image.imageUrl"
              :alt="image.title || '游戏截屏'"
              loading="lazy"
              @load="handleImageLoad(image, index)"
              @error="handleImageError(image, index, $event)"
            />
          </template>
          <div v-else class="game-card-fallback">
            <Icon name="image" size="lg" />
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

defineEmits(['image-click'])
const imageLoadedMap = ref({})
const imageErrorMap = ref({})

const getImageKey = (image, index) => String(image?.id ?? image?.imageUrl ?? index)
const hasImage = (image, index) => {
  const imageUrl = image?.thumbnailUrl || image?.imageUrl
  if (!imageUrl) return false
  return !imageErrorMap.value[getImageKey(image, index)]
}
const isImageLoaded = (image, index) => Boolean(imageLoadedMap.value[getImageKey(image, index)])
const handleImageLoad = (image, index) => {
  imageLoadedMap.value[getImageKey(image, index)] = true
}
const handleImageError = (image, index, event) => {
  const fallbackUrl = image?.imageUrl
  const target = event?.target
  if (fallbackUrl && target instanceof HTMLImageElement) {
    const currentSrc = target.getAttribute('src') || ''
    if (currentSrc !== fallbackUrl) {
      target.src = fallbackUrl
      return
    }
  }
  const imageKey = getImageKey(image, index)
  imageErrorMap.value[imageKey] = true
  imageLoadedMap.value[imageKey] = true
}

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

watch(
  () => props.images.map((image, index) => getImageKey(image, index)),
  () => {
    imageLoadedMap.value = {}
    imageErrorMap.value = {}
  },
  { immediate: true }
)

</script>

<style scoped>
.game-gallery-section {
  width: 100%;
  padding: 2.5rem 2rem 4rem;
}

.game-section-header {
  text-align: center;
  margin-bottom: 2rem;
  margin-top: 5%;
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
  gap: 0;
}

.game-card {
  background: transparent;
  border: none;
  border-radius: 0;
  overflow: hidden;
  padding: 0;
  cursor: pointer;
  position: relative;
  height: clamp(180px, 20vw, 260px);
  transition: none;
}

.game-card-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.78);
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.62), rgba(15, 23, 42, 0.4));
}

.game-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.game-card:hover {
  transform: none;
  box-shadow: none;
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

  .game-card {
    height: 170px;
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

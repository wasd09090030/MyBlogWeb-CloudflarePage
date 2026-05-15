<template>
  <section ref="sectionRef" class="gallery-masonry">
    <div
      ref="containerRef"
      class="gallery-masonry__columns"
      :style="{
        '--gallery-masonry-gap': `${columnGap}px`,
        '--gallery-masonry-column-count': String(columns.length || 1)
      }"
    >
      <div
        v-for="column in columns"
        :key="`masonry-column-${column.index}`"
        class="gallery-masonry__column"
      >
        <article
          v-for="item in column.items"
          :key="item._masonry.key"
          class="gallery-masonry__card"
          :ref="(el) => observeCard(el)"
          @click="$emit('image-click', item)"
        >
          <div
            class="gallery-masonry__media"
            :style="{ aspectRatio: item._masonry.aspectRatioStyle }"
          >
            <template v-if="hasImage(item)">
              <ImageLoadingPlaceholder :show="!isImageLoaded(item)" />
              <img
                :src="item.thumbnailUrl || item.imageUrl"
                :alt="item.title || '画廊图片'"
                class="gallery-masonry__image"
                loading="lazy"
                @load="handleImageLoad(item, $event)"
                @error="handleImageError(item, $event)"
              />
            </template>
            <div v-else class="gallery-masonry__fallback">
              <Icon name="image" size="xl" />
            </div>
          </div>
        </article>
      </div>
    </div>

    <div ref="infiniteScrollTrigger" class="infinite-scroll-trigger">
      <div v-if="isLoadingMore" class="loading-indicator fade-in">
        <div class="loading-spinner"></div>
        <span>加载更多图片...</span>
      </div>
      <div v-else-if="!hasMore && displayedCount > 0" class="end-message fade-in">
        <Icon name="check-circle" size="md" />
        <span>已加载全部 {{ displayedCount }} 张图片</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'
import {
  buildMasonryColumns,
  getGalleryImageDimensions,
  getGalleryImageKey,
  getMasonryColumnCount,
  getStableGalleryShuffle
} from '~/features/gallery-public/utils/masonryLayout'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  initialLoadCount: {
    type: Number,
    default: 20
  },
  loadMoreCount: {
    type: Number,
    default: 10
  }
})

const emit = defineEmits(['image-click', 'load-more'])

const sectionRef = ref(null)
const containerRef = ref(null)
const infiniteScrollTrigger = ref(null)

const columnGap = 10

const displayedCount = ref(props.initialLoadCount)
const isLoadingMore = ref(false)
const hasMore = computed(() => displayedCount.value < props.images.length)

const columns = ref([])
const columnCount = ref(5)
const containerWidth = ref(0)
const initialized = ref(false)

const imageLoadedMap = ref({})
const imageErrorMap = ref({})
const measuredSizeMap = ref({})
const itemObserver = ref(null)
let infiniteScrollObserver = null
let resizeObserver = null
let scheduledFrame = 0

const shuffledImages = computed(() => getStableGalleryShuffle(props.images))
const displayedImages = computed(() => shuffledImages.value.slice(0, displayedCount.value))

const getImageKey = (image, index = 0) => getGalleryImageKey(image, index)

const hasImage = (image) => {
  const imageUrl = image?.thumbnailUrl || image?.imageUrl
  if (!imageUrl) return false
  return !imageErrorMap.value[getImageKey(image)]
}

const isImageLoaded = (image) => Boolean(imageLoadedMap.value[getImageKey(image)])

const updateMetrics = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  if (!width) return

  containerWidth.value = width
  columnCount.value = getMasonryColumnCount(width)
}

const rebuildLayout = () => {
  if (!containerWidth.value) {
    columns.value = []
    return
  }

  const totalGap = columnGap * Math.max(0, columnCount.value - 1)
  const columnWidth = Math.max(1, (containerWidth.value - totalGap) / columnCount.value)

  columns.value = buildMasonryColumns(displayedImages.value, {
    columnCount: columnCount.value,
    columnWidth,
    gap: columnGap,
    measuredSizes: measuredSizeMap.value
  })
}

const scheduleLayout = () => {
  if (scheduledFrame) {
    cancelAnimationFrame(scheduledFrame)
  }

  scheduledFrame = requestAnimationFrame(() => {
    scheduledFrame = 0
    updateMetrics()
    rebuildLayout()
  })
}

const handleImageLoad = (image, event) => {
  const imageKey = getImageKey(image)
  imageLoadedMap.value[imageKey] = true

  const target = event?.target
  if (!(target instanceof HTMLImageElement)) return

  const dimensions = {
    width: target.naturalWidth,
    height: target.naturalHeight
  }
  const current = measuredSizeMap.value[imageKey]
  const hasMetadata = getGalleryImageDimensions(image)

  if (dimensions.width > 0 && dimensions.height > 0 && (
    !current ||
    current.width !== dimensions.width ||
    current.height !== dimensions.height
  )) {
    measuredSizeMap.value = {
      ...measuredSizeMap.value,
      [imageKey]: dimensions
    }

    if (!hasMetadata) {
      scheduleLayout()
    }
  }
}

const handleImageError = (image, event) => {
  const fallbackUrl = image?.imageUrl
  const target = event?.target
  if (fallbackUrl && target instanceof HTMLImageElement) {
    const currentSrc = target.getAttribute('src') || ''
    if (currentSrc !== fallbackUrl) {
      target.src = fallbackUrl
      return
    }
  }

  const imageKey = getImageKey(image)
  imageErrorMap.value[imageKey] = true
  imageLoadedMap.value[imageKey] = true
  scheduleLayout()
}

const observeCard = (element) => {
  if (element && itemObserver.value) {
    itemObserver.value.observe(element)
  }
}

const loadMore = async () => {
  if (isLoadingMore.value || !hasMore.value) return

  isLoadingMore.value = true
  await new Promise((resolve) => setTimeout(resolve, 220))

  displayedCount.value = Math.min(
    displayedCount.value + props.loadMoreCount,
    props.images.length
  )

  await nextTick()
  scheduleLayout()
  isLoadingMore.value = false
  emit('load-more', displayedCount.value)
}

const setupInfiniteScroll = () => {
  if (!infiniteScrollTrigger.value || infiniteScrollObserver) return

  infiniteScrollObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && hasMore.value && !isLoadingMore.value) {
          loadMore()
        }
      }
    },
    {
      root: null,
      rootMargin: '500px',
      threshold: 0
    }
  )

  infiniteScrollObserver.observe(infiniteScrollTrigger.value)
}

const initLayout = async () => {
  if (initialized.value) {
    scheduleLayout()
    return
  }

  initialized.value = true
  await nextTick()

  itemObserver.value = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        itemObserver.value?.unobserve(entry.target)
      }
    })
  }, {
    root: null,
    threshold: 0.12,
    rootMargin: '0px 0px 50px 0px'
  })

  if (containerRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      scheduleLayout()
    })
    resizeObserver.observe(containerRef.value)
  } else {
    window.addEventListener('resize', scheduleLayout)
  }

  setupInfiniteScroll()
  scheduleLayout()
}

const destroyLayout = () => {
  if (scheduledFrame) {
    cancelAnimationFrame(scheduledFrame)
    scheduledFrame = 0
  }

  if (infiniteScrollObserver) {
    infiniteScrollObserver.disconnect()
    infiniteScrollObserver = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  } else {
    window.removeEventListener('resize', scheduleLayout)
  }

  if (itemObserver.value) {
    itemObserver.value.disconnect()
    itemObserver.value = null
  }

  initialized.value = false
}

watch(
  () => props.images.map((image, index) => getImageKey(image, index)).join('|'),
  () => {
    displayedCount.value = Math.min(props.initialLoadCount, props.images.length)
    imageLoadedMap.value = {}
    imageErrorMap.value = {}
    measuredSizeMap.value = {}
    nextTick(() => {
      scheduleLayout()
    })
  }
)

watch(displayedImages, () => {
  nextTick(() => {
    scheduleLayout()
  })
})

defineExpose({
  initLayout,
  destroyLayout,
  loadMore
})

onMounted(() => {
  initLayout()
})

onUnmounted(() => {
  destroyLayout()
})
</script>

<style scoped>
.gallery-masonry {
  width: 100%;
  padding: 0.75rem 0.5rem 1.5rem;
}

.gallery-masonry__columns {
  display: grid;
  grid-template-columns: repeat(var(--gallery-masonry-column-count, 1), minmax(0, 1fr));
  gap: var(--gallery-masonry-gap);
}

.gallery-masonry__column {
  display: flex;
  flex-direction: column;
  gap: var(--gallery-masonry-gap);
  min-width: 0;
}

.gallery-masonry__card {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  background: var(--card-bg);
  cursor: pointer;
  opacity: 0;
  transform: translateY(18px);
  transition:
    opacity 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.35s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.gallery-masonry__card.is-visible {
  opacity: 1;
  transform: translateY(0);
}

.gallery-masonry__card:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.06);
  z-index: 2;
}

.gallery-masonry__media {
  position: relative;
  width: 100%;
}

.gallery-masonry__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.gallery-masonry__card:hover .gallery-masonry__image {
  transform: scale(1.03);
}

.gallery-masonry__fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.8);
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.52), rgba(30, 41, 59, 0.28));
}

.fade-in {
  animation: fade-in 0.4s ease both;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.infinite-scroll-trigger {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2.5rem 2rem;
  min-height: 80px;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--accent-primary);
  font-size: 0.95rem;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--focus-ring-color);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.end-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--accent-success);
  font-size: 0.9rem;
  padding: 0.75rem 1.5rem;
  background: color-mix(in srgb, var(--accent-success) 12%, transparent);
  border-radius: 25px;
}

@media (max-width: 767px) {
  .gallery-masonry {
    padding: 0.5rem 0.25rem 1rem;
  }

  .gallery-masonry__card {
    border-radius: 10px;
  }

  .infinite-scroll-trigger {
    padding: 1.5rem;
  }
}
</style>

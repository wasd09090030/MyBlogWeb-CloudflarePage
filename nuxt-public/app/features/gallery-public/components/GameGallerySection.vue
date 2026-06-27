<template>
  <section class="game-gallery-section" :class="{ 'game-gallery-section--embedded': !showSectionHeader }">
    <div v-if="showSectionHeader" class="game-section-header">
      <h2 class="game-section-title">Game screenshots</h2>
      <p class="game-section-subtitle">按月份归档（最新优先）</p>
    </div>

    <div v-if="groupedMonths.length === 0" class="game-empty">
      暂无游戏截屏
    </div>

    <TransitionGroup name="month-fade" tag="div" class="game-months">
      <div
        v-for="month in groupedMonths"
        :key="month.key"
        class="game-month-group"
        :data-skeleton="month.skeleton"
      >
        <div v-if="showMonthTitle" class="game-month-title">{{ month.header }}</div>

        <div v-if="month.skeleton === 'A'" class="skeleton-a">
          <button
            v-for="(image, index) in month.items"
            :key="`a-${getImageKey(image, index)}`"
            type="button"
            class="game-tile skeleton-a-tile"
            :class="{ 'is-featured': month.featuredIndex === index }"
            :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
            @click="$emit('image-click', image)"
          >
            <GameTileImage :image="image" :index="index" />
          </button>
        </div>

        <div v-else-if="month.skeleton === 'B'" class="skeleton-b">
          <template v-if="month.items.length === 2">
            <div class="skeleton-b-pair skeleton-b-pair--duo">
              <button
                v-for="(image, index) in month.items"
                :key="`b-${getImageKey(image, index)}`"
                type="button"
                class="game-tile skeleton-b-tile"
                :class="{ 'is-featured': month.featuredIndex === index }"
                :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
                @click="$emit('image-click', image)"
              >
                <GameTileImage :image="image" :index="index" />
              </button>
            </div>
          </template>
          <template v-else>
            <div class="skeleton-b-pair">
              <button
                v-for="(image, index) in month.items.slice(0, 2)"
                :key="`b-${getImageKey(image, index)}`"
                type="button"
                class="game-tile skeleton-b-tile"
                :class="{ 'is-featured': month.featuredIndex === index }"
                :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
                @click="$emit('image-click', image)"
              >
                <GameTileImage :image="image" :index="index" />
              </button>
            </div>
            <button
              v-for="(image, index) in month.items.slice(2)"
              :key="`b-${getImageKey(image, index + 2)}`"
              type="button"
              class="game-tile skeleton-b-tile skeleton-b-tile--wide"
              :class="{ 'is-featured': month.featuredIndex === index + 2 }"
              :data-aspect="month.featuredIndex === index + 2 ? '21x9' : '16x10'"
              @click="$emit('image-click', image)"
            >
              <GameTileImage :image="image" :index="index + 2" />
            </button>
          </template>
        </div>

        <div v-else-if="month.skeleton === 'C'" class="skeleton-c">
          <button
            type="button"
            class="skeleton-c-arrow skeleton-c-arrow-left"
            aria-label="向左滚动"
            @click="scrollFilmstrip(month.key, -1)"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <div
            class="skeleton-c-strip"
            :ref="(el) => registerStrip(month.key, el)"
            @wheel.passive="onFilmstripWheel($event, month.key)"
            @pointerdown.capture="onFilmstripPointerDown($event, month.key)"
            @pointermove.capture="onFilmstripPointerMove($event, month.key)"
            @pointerup.capture="onFilmstripPointerEnd($event, month.key)"
            @pointercancel.capture="onFilmstripPointerEnd($event, month.key)"
            @pointerleave.capture="onFilmstripPointerEnd($event, month.key)"
            @mousedown.prevent="onFilmstripMouseDown($event, month.key)"
            @mousemove.prevent="onFilmstripMouseMove($event, month.key)"
            @mouseup="onFilmstripMouseEnd($event, month.key)"
            @mouseleave="onFilmstripMouseEnd($event, month.key)"
            @touchstart.passive="onFilmstripTouchStart($event, month.key)"
            @touchmove.prevent="onFilmstripTouchMove($event, month.key)"
            @touchend="onFilmstripTouchEnd($event, month.key)"
            @dragstart.prevent
          >
            <button
              v-for="(image, index) in month.items"
              :key="`c-${getImageKey(image, index)}`"
              type="button"
              class="game-tile skeleton-c-tile"
              data-aspect="16x10"
              @click="handleFilmstripTileClick($event, image)"
            >
              <GameTileImage :image="image" :index="index" />
            </button>
          </div>
          <button
            type="button"
            class="skeleton-c-arrow skeleton-c-arrow-right"
            aria-label="向右滚动"
            @click="scrollFilmstrip(month.key, 1)"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div v-else class="skeleton-d">
          <div
            v-for="(block, blockIndex) in month.blocks"
            :key="`d-block-${month.key}-${blockIndex}`"
            class="magazine-grid"
          >
            <button
              v-for="tile in block.tiles"
              :key="`d-${getImageKey(tile.image, tile.index)}`"
              type="button"
              class="game-tile magazine-tile"
              :class="`magazine-tile--${tile.role}`"
              :data-role="tile.role"
              :style="getMagazineTileStyle(tile)"
              @click="$emit('image-click', tile.image)"
            >
              <GameTileImage :image="tile.image" :index="tile.index" />
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup>
import { h, resolveComponent } from 'vue'
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'
import {
  getGalleryAspectRatioStyle,
  getGalleryImageDimensions,
  getGalleryImageKey
} from '~/features/gallery-public/utils/masonryLayout'
import {
  getGalleryTimestamp,
  groupGalleryByMonth
} from '~/features/gallery-public/utils/monthGrouping'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  showSectionHeader: {
    type: Boolean,
    default: true
  },
  showMonthTitle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['image-click'])

const imageLoadedMap = ref({})
const imageErrorMap = ref({})

const getImageKey = (image, index) => getGalleryImageKey(image, index)

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

const GameTileImage = {
  props: {
    image: {
      type: Object,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },
  setup(componentProps) {
    return () => {
      const image = componentProps.image
      const index = componentProps.index
      if (!hasImage(image, index)) {
        return h('div', { class: 'game-card-fallback' }, [h(resolveComponent('Icon'), { name: 'image', size: 'lg' })])
      }

      return [
        h(ImageLoadingPlaceholder, { show: !isImageLoaded(image, index) }),
        h('img', {
          src: image.thumbnailUrl || image.imageUrl,
          alt: image.title || '游戏截屏',
          class: 'game-tile__image',
          draggable: false,
          loading: 'lazy',
          onLoad: () => handleImageLoad(image, index),
          onError: (event) => handleImageError(image, index, event)
        }),
        h('span', { class: 'game-tile-date' }, formatTileDate(image))
      ]
    }
  }
}

const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

const toRoman = (n) => {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  if (n < 1 || n > 12) return String(n)
  return numerals[n]
}

const pickSkeleton = (count) => {
  if (count === 1) return 'A'
  if (count <= 3) return 'B'
  if (count <= 9) return 'D'
  return 'C'
}

const isFeaturedCandidate = (skeleton, monthKey, image, indexInMonth) => {
  if (skeleton === 'C') return false
  const seed = `${skeleton}:${monthKey}:${image.id ?? image.imageUrl ?? indexInMonth}`
  return hashString(seed) % 100 < 8
}

const pickFeaturedIndex = (skeleton, monthKey, items) => {
  for (let i = 0; i < items.length; i++) {
    if (isFeaturedCandidate(skeleton, monthKey, items[i], i)) return i
  }
  return -1
}

const formatMonthHeader = (timestamp) => {
  if (!timestamp) return '─── ACT ? ── [ ?? / ???? ] ────────────►'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '─── ACT ? ── [ ?? / ???? ] ────────────►'
  const year = date.getFullYear()
  const monthNum = date.getMonth() + 1
  const monthStr = `${monthNum}`.padStart(2, '0')
  return `─── ACT ${toRoman(monthNum)} ── [ ${monthStr} / ${year} ] ────────────►`
}

const formatTileDate = (image) => {
  const ts = getGalleryTimestamp(image)
  if (!ts) return ''
  const d = new Date(ts)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${m}-${day}`
}

const MAGAZINE_PATTERNS = {
  compact: [
    { role: 'feature', span: 7 },
    { role: 'medium', span: 5 },
    { role: 'small', span: 4 },
    { role: 'small', span: 4 },
    { role: 'small', span: 4 },
    { role: 'medium', span: 6 }
  ],
  spread: [
    { role: 'feature', span: 6 },
    { role: 'small', span: 3 },
    { role: 'small', span: 3 },
    { role: 'medium', span: 4 },
    { role: 'medium', span: 4 },
    { role: 'medium', span: 4 },
    { role: 'small', span: 3 },
    { role: 'small', span: 3 },
    { role: 'feature', span: 6 }
  ]
}

const getMagazinePattern = (count) => {
  return count <= 6 ? MAGAZINE_PATTERNS.compact : MAGAZINE_PATTERNS.spread
}

const buildMagazineBlocks = (monthKey, items) => {
  if (items.length < 4) return []

  const blocks = []
  let cursor = 0
  while (cursor < items.length) {
    const remaining = items.length - cursor
    const blockSize = remaining >= 10 ? Math.min(9, remaining) : remaining
    const blockItems = items.slice(cursor, cursor + blockSize)
    const pattern = getMagazinePattern(blockItems.length)

    blocks.push({
      tiles: blockItems.map((image, offset) => {
        const index = cursor + offset
        const cell = pattern[offset] || pattern[offset % pattern.length]
        return {
          image,
          index,
          role: cell.role,
          span: cell.span
        }
      })
    })

    cursor += blockSize
  }

  return blocks
}

const getMagazineTileStyle = (tile) => ({
  gridColumn: `span ${tile.span}`,
  aspectRatio: getGalleryImageDimensions(tile.image)
    ? getGalleryAspectRatioStyle(tile.image)
    : '16 / 10'
})

const groupedMonths = computed(() => {
  const groups = groupGalleryByMonth(props.images, { sectionPrefix: 'game-gallery-month' })
  for (const group of groups) {
    const skeleton = pickSkeleton(group.items.length)
    const timestamp = getGalleryTimestamp(group.items[0])
    group.skeleton = skeleton
    group.header = formatMonthHeader(timestamp)
    group.featuredIndex = pickFeaturedIndex(skeleton, group.key, group.items)

    if (skeleton === 'D') {
      group.blocks = buildMagazineBlocks(group.key, group.items)
    }
  }

  return groups
})

const filmstripRefs = ref(new Map())
const filmstripDragState = ref({
  key: null,
  pointerId: null,
  startX: 0,
  scrollLeft: 0,
  moved: false
})
const recentFilmstripDrag = ref(false)
let recentFilmstripDragTimer = null

const registerStrip = (key, el) => {
  if (el) filmstripRefs.value.set(key, el)
  else filmstripRefs.value.delete(key)
}

const SCROLL_STEP = 360

const scrollFilmstrip = (key, direction) => {
  const el = filmstripRefs.value.get(key)
  if (!el) return
  el.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' })
}

const onFilmstripWheel = (event, key) => {
  if (event.shiftKey) return
  const el = filmstripRefs.value.get(key)
  if (!el) return
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && Math.abs(event.deltaY) > 0) {
    el.scrollLeft += event.deltaY
  }
}

const onFilmstripPointerDown = (event, key) => {
  if (event.button != null && event.button !== 0) return

  const el = filmstripRefs.value.get(key)
  if (!el) return

  filmstripDragState.value = {
    key,
    pointerId: event.pointerId,
    startX: event.clientX,
    scrollLeft: el.scrollLeft,
    moved: false
  }
  el.classList.add('is-dragging')
  el.setPointerCapture?.(event.pointerId)
}

const onFilmstripPointerMove = (event, key) => {
  const state = filmstripDragState.value
  if (state.key !== key || state.pointerId !== event.pointerId) return

  const el = filmstripRefs.value.get(key)
  if (!el) return

  const deltaX = event.clientX - state.startX
  if (Math.abs(deltaX) > 4) {
    state.moved = true
    event.preventDefault()
    event.stopPropagation()
  }

  el.scrollLeft = state.scrollLeft - deltaX
}

const onFilmstripPointerEnd = (event, key) => {
  const state = filmstripDragState.value
  if (state.key !== key || state.pointerId !== event.pointerId) return

  const el = filmstripRefs.value.get(key)
  el?.classList.remove('is-dragging')
  el?.releasePointerCapture?.(event.pointerId)

  if (state.moved) {
    recentFilmstripDrag.value = true
    if (recentFilmstripDragTimer) clearTimeout(recentFilmstripDragTimer)
    recentFilmstripDragTimer = window.setTimeout(() => {
      recentFilmstripDrag.value = false
      recentFilmstripDragTimer = null
    }, 160)
  }

  filmstripDragState.value = {
    key: null,
    pointerId: null,
    startX: 0,
    scrollLeft: 0,
    moved: false
  }
}

const handleFilmstripTileClick = (event, image) => {
  if (recentFilmstripDrag.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('image-click', image)
}

watch(
  () => props.images.map((image, index) => getImageKey(image, index)),
  () => {
    imageLoadedMap.value = {}
    imageErrorMap.value = {}
  },
  { immediate: true }
)

onUnmounted(() => {
  if (recentFilmstripDragTimer) {
    clearTimeout(recentFilmstripDragTimer)
    recentFilmstripDragTimer = null
  }
})
</script>

<style scoped>
.game-gallery-section {
  width: 100%;
  padding: 2.5rem 2rem 4rem;
}

.game-gallery-section--embedded {
  padding: 0 0 0.75rem;
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

.game-months {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.game-month-group {
  margin-bottom: 2.5rem;
}

.game-month-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.85);
  margin-bottom: 1rem;
  font-family: 'Courier New', ui-monospace, monospace;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow-x: auto;
}

.game-tile {
  position: relative;
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 14px;
  overflow: hidden;
  padding: 0;
  margin: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.game-tile :deep(.game-tile__image) {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover !important;
  object-position: center;
  user-select: none;
  -webkit-user-drag: none;
}

.game-tile:hover {
  transform: scale(1.03);
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
}

.game-tile-date {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 0.75rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  padding: 2px 8px;
  border-radius: 999px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  font-family: 'Courier New', ui-monospace, monospace;
  letter-spacing: 0.04em;
  z-index: 2;
}

.game-tile:hover .game-tile-date {
  opacity: 1;
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

.skeleton-a {
  display: flex;
  justify-content: center;
}

.skeleton-a-tile {
  max-width: 90vw;
  aspect-ratio: 16 / 10;
  box-shadow: inset 0 4px 0 #000, inset 0 -4px 0 #000;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.skeleton-a-tile.is-featured {
  aspect-ratio: 21 / 9;
}

.skeleton-a-tile:hover {
  transform: scale(1.03);
  box-shadow: inset 0 0 0 #000, inset 0 0 0 #000, 0 18px 32px rgba(15, 23, 42, 0.18);
}

.skeleton-b {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton-b-pair {
  display: flex;
  gap: 1rem;
}

.skeleton-b-pair .skeleton-b-tile {
  flex: 1 1 0;
  min-width: 0;
  aspect-ratio: 16 / 10;
}

.skeleton-b-pair--duo .skeleton-b-tile:nth-child(1) {
  flex: 6 1 0;
}

.skeleton-b-pair--duo .skeleton-b-tile:nth-child(2) {
  flex: 4 1 0;
}

.skeleton-b-tile--wide {
  width: 100%;
  aspect-ratio: 16 / 10;
}

.skeleton-b-tile.is-featured {
  aspect-ratio: 21 / 9;
}

.skeleton-b-pair--duo:hover .skeleton-b-tile:nth-child(1) {
  transform: translateX(-4px);
}

.skeleton-b-pair--duo:hover .skeleton-b-tile:nth-child(2) {
  transform: translateX(4px);
}

.skeleton-c {
  position: relative;
}

.skeleton-c-strip {
  display: flex;
  gap: 1.15rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 6px 4px 12px;
  -webkit-overflow-scrolling: touch;
  cursor: grab;
  touch-action: pan-x;
  user-select: none;
}

.skeleton-c-strip.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
}

.skeleton-c-strip::-webkit-scrollbar {
  height: 6px;
}

.skeleton-c-strip::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.skeleton-c-tile {
  flex: 0 0 auto;
  width: clamp(400px, 47.5vw, 525px);
  aspect-ratio: 16 / 10;
  scroll-snap-align: start;
  overflow: hidden;
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
}

.skeleton-c-tile img {
  border-radius: 18px;
}

.skeleton-c .skeleton-c-tile {
  transition: transform 0.24s ease, box-shadow 0.24s ease;
}

.skeleton-c:hover .skeleton-c-tile:hover {
  transform: translateY(-4px) scale(1.012);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}

.skeleton-c-tile :deep(.game-tile-date) {
  display: none;
}

.skeleton-c-arrow {
  position: absolute;
  top: calc(50% - 9px);
  transform: translateY(-50%);
  z-index: 3;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.skeleton-c-arrow:hover {
  background: rgba(0, 0, 0, 0.8);
}

.skeleton-c-arrow-left {
  left: 8px;
}

.skeleton-c-arrow-right {
  right: 8px;
}

.skeleton-d {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.magazine-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.magazine-tile {
  min-height: 0;
  border-radius: 16px;
  isolation: isolate;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
}

.magazine-tile--feature {
  border-radius: 20px;
}

.magazine-tile::after {
  content: attr(data-role);
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: rgba(15, 23, 42, 0.72);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.magazine-tile:hover::after {
  opacity: 1;
}

.magazine-tile img {
  transition: transform 0.3s ease;
}

.magazine-tile:hover img {
  transform: scale(1.05);
}

.month-fade-enter-active,
.month-fade-leave-active {
  transition: opacity 0.25s ease;
}

.month-fade-enter-from,
.month-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .game-gallery-section {
    padding: 2rem 1rem 3rem;
  }

  .game-section-title {
    font-size: 1.3rem;
  }

  .game-month-title {
    font-size: 0.85rem;
  }

  .skeleton-a-tile {
    max-width: 100%;
    box-shadow: none;
  }

  .skeleton-a-tile:hover {
    box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
  }

  .skeleton-b,
  .skeleton-b-pair,
  .skeleton-b-pair--duo {
    flex-direction: column;
  }

  .skeleton-b-pair--duo .skeleton-b-tile:nth-child(1),
  .skeleton-b-pair--duo .skeleton-b-tile:nth-child(2) {
    flex: 1 1 auto;
  }

  .skeleton-c-strip {
    flex-direction: column;
    overflow-x: visible;
    scroll-snap-type: none;
    padding-bottom: 4px;
    cursor: default;
    touch-action: pan-y;
  }

  .skeleton-c-tile {
    width: 100%;
  }

  .skeleton-c-arrow {
    display: none;
  }

  .game-tile.is-featured,
  .skeleton-a-tile.is-featured,
  .skeleton-b-tile.is-featured,
  .magazine-tile.is-featured {
    aspect-ratio: 16 / 10;
  }

  .magazine-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .magazine-tile {
    grid-column: 1 !important;
    aspect-ratio: 16 / 10;
  }

  .skeleton-d {
    gap: 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-tile,
  .game-tile *,
  .skeleton-a-tile,
  .skeleton-a-tile *,
  .skeleton-b-tile,
  .skeleton-b-tile *,
  .skeleton-c-tile,
  .skeleton-c-tile *,
  .magazine-tile,
  .magazine-tile *,
  .skeleton-c-arrow,
  .month-fade-enter-active,
  .month-fade-leave-active {
    transition: none !important;
    animation: none !important;
  }

  .game-tile:hover,
  .skeleton-a-tile:hover,
  .skeleton-b-pair--duo:hover .skeleton-b-tile:nth-child(1),
  .skeleton-b-pair--duo:hover .skeleton-b-tile:nth-child(2),
  .skeleton-c:hover .skeleton-c-tile:hover {
    transform: none !important;
    box-shadow: none !important;
  }

  .magazine-tile:hover img {
    transform: none !important;
  }

  .magazine-tile::after {
    transition: none !important;
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

<template>
  <section class="game-gallery-section">
    <div class="game-section-header">
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
        <div class="game-month-title">{{ month.header }}</div>

        <!-- Skeleton A · Cinemascope Hero (1 image) -->
        <div v-if="month.skeleton === 'A'" class="skeleton-a">
          <button
            v-for="(image, index) in month.items"
            :key="`a-${image.id ?? image.imageUrl}-${index}`"
            type="button"
            class="game-tile skeleton-a-tile"
            :class="{ 'is-featured': month.featuredIndex === index }"
            :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
            @click="$emit('image-click', image)"
          >
            <img
              :src="image.thumbnailUrl || image.imageUrl"
              :alt="image.title || '游戏截屏'"
              loading="lazy"
            />
            <span class="game-tile-date">{{ formatTileDate(image) }}</span>
          </button>
        </div>

        <!-- Skeleton B · Anamorphic Duplet (2-3 images) -->
        <div v-else-if="month.skeleton === 'B'" class="skeleton-b">
          <template v-if="month.items.length === 2">
            <div class="skeleton-b-pair skeleton-b-pair--duo">
              <button
                v-for="(image, index) in month.items"
                :key="`b-${image.id ?? image.imageUrl}-${index}`"
                type="button"
                class="game-tile skeleton-b-tile"
                :class="{ 'is-featured': month.featuredIndex === index }"
                :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
                @click="$emit('image-click', image)"
              >
                <img
                  :src="image.thumbnailUrl || image.imageUrl"
                  :alt="image.title || '游戏截屏'"
                  loading="lazy"
                />
                <span class="game-tile-date">{{ formatTileDate(image) }}</span>
              </button>
            </div>
          </template>
          <template v-else>
            <div class="skeleton-b-pair">
              <button
                v-for="(image, index) in month.items.slice(0, 2)"
                :key="`b-${image.id ?? image.imageUrl}-${index}`"
                type="button"
                class="game-tile skeleton-b-tile"
                :class="{ 'is-featured': month.featuredIndex === index }"
                :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
                @click="$emit('image-click', image)"
              >
                <img
                  :src="image.thumbnailUrl || image.imageUrl"
                  :alt="image.title || '游戏截屏'"
                  loading="lazy"
                />
                <span class="game-tile-date">{{ formatTileDate(image) }}</span>
              </button>
            </div>
            <button
              v-for="(image, index) in month.items.slice(2)"
              :key="`b-${image.id ?? image.imageUrl}-${index + 2}`"
              type="button"
              class="game-tile skeleton-b-tile skeleton-b-tile--wide"
              :class="{ 'is-featured': month.featuredIndex === index + 2 }"
              :data-aspect="month.featuredIndex === index + 2 ? '21x9' : '16x10'"
              @click="$emit('image-click', image)"
            >
              <img
                :src="image.thumbnailUrl || image.imageUrl"
                :alt="image.title || '游戏截屏'"
                loading="lazy"
              />
              <span class="game-tile-date">{{ formatTileDate(image) }}</span>
            </button>
          </template>
        </div>

        <!-- Skeleton C · Filmstrip Timeline (10+ images) -->
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
          >
            <button
              v-for="(image, index) in month.items"
              :key="`c-${image.id ?? image.imageUrl}-${index}`"
              type="button"
              class="game-tile skeleton-c-tile"
              data-aspect="16x10"
              @click="$emit('image-click', image)"
            >
              <img
                :src="image.thumbnailUrl || image.imageUrl"
                :alt="image.title || '游戏截屏'"
                loading="lazy"
              />
              <span class="game-tile-date">{{ formatTileDate(image) }}</span>
              <span class="skeleton-c-label">{{ formatTileDate(image) }}</span>
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

        <!-- Skeleton D · Magazine Mosaic (4-9 images) -->
        <div v-else class="skeleton-d">
          <div
            v-for="(tile, index) in month.tiles"
            :key="`d-${tile.image.id ?? tile.image.imageUrl}-${index}`"
            class="magazine-tile-wrap"
            :data-offset="tile.offset"
            :style="{ width: tile.widthPct + '%' }"
          >
            <button
              type="button"
              class="game-tile magazine-tile"
              :class="{ 'is-featured': month.featuredIndex === index }"
              :data-aspect="month.featuredIndex === index ? '21x9' : '16x10'"
              @click="$emit('image-click', tile.image)"
            >
              <img
                :src="tile.image.thumbnailUrl || tile.image.imageUrl"
                :alt="tile.image.title || '游戏截屏'"
                loading="lazy"
              />
              <span class="game-tile-date">{{ formatTileDate(tile.image) }}</span>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  }
})

defineEmits(['image-click'])

// ----- Stable hash (djb2) -----
const hashString = (value) => {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

// ----- Roman numeral 1..12 -----
const toRoman = (n) => {
  const numerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  if (n < 1 || n > 12) return String(n)
  return numerals[n]
}

// ----- Skeleton selection (1 → A, 2-3 → B, 4-9 → D, 10+ → C) -----
const pickSkeleton = (count) => {
  if (count === 1) return 'A'
  if (count <= 3) return 'B'
  if (count <= 9) return 'D'
  return 'C'
}

// ----- Featured crop: stable hash, 8% hit rate, excluded from Skeleton C -----
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

// ----- Magazine mosaic: width + offset, both derived from stable hash -----
const MAGAZINE_WIDTHS = [100, 80, 60, 40]
const MAGAZINE_OFFSETS = ['left', 'right', 'center']

const pickMagazineWidth = (monthKey, indexInMonth) => {
  const seed = `width:${monthKey}:${indexInMonth}`
  return MAGAZINE_WIDTHS[hashString(seed) % MAGAZINE_WIDTHS.length]
}

const pickMagazineOffset = (monthKey, indexInMonth) => {
  const seed = `offset:${monthKey}:${indexInMonth}`
  return MAGAZINE_OFFSETS[hashString(seed) % MAGAZINE_OFFSETS.length]
}

// ----- Date helpers -----
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

// ----- Cinematic month header -----
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
  const ts = getTimestamp(image)
  if (!ts) return ''
  const d = new Date(ts)
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${m}-${day}`
}

// ----- Derived state -----
const sortedImages = computed(() => {
  return [...props.images].sort((a, b) => getTimestamp(b) - getTimestamp(a))
})

const groupedMonths = computed(() => {
  const map = new Map()
  for (const image of sortedImages.value) {
    const timestamp = getTimestamp(image)
    const { key, label } = getMonthKey(timestamp)
    if (!map.has(key)) {
      map.set(key, { key, label, items: [], timestamp })
    }
    map.get(key).items.push(image)
  }

  const groups = Array.from(map.values())
  for (const group of groups) {
    const skeleton = pickSkeleton(group.items.length)
    const featuredIndex = pickFeaturedIndex(skeleton, group.key, group.items)
    group.skeleton = skeleton
    group.header = formatMonthHeader(group.timestamp)
    group.featuredIndex = featuredIndex

    if (skeleton === 'D') {
      group.tiles = group.items.map((image, i) => ({
        image,
        widthPct: pickMagazineWidth(group.key, i),
        offset: pickMagazineOffset(group.key, i)
      }))
    }
  }

  return groups
})

// ----- Skeleton C: horizontal scroll helpers -----
const filmstripRefs = ref(new Map())

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
  // Only intercept when vertical wheel is dominant and there's room to scroll horizontally.
  if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && Math.abs(event.deltaY) > 0) {
    el.scrollLeft += event.deltaY
  }
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

/* ----- Unified hover base ----- */
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

.game-tile img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
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

/* ----- Skeleton A · Cinemascope Hero ----- */
.skeleton-a {
  display: flex;
  justify-content: center;
}

.skeleton-a-tile {
  max-width: 90vw;
  aspect-ratio: 16 / 10;
  /* Letterbox bars overlay the image edges via inset box-shadow */
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

/* ----- Skeleton B · Anamorphic Duplet ----- */
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

/* Paired-shift hover micro-action: only when there are exactly two tiles */
.skeleton-b-pair--duo:hover .skeleton-b-tile:nth-child(1) {
  transform: translateX(-4px);
}

.skeleton-b-pair--duo:hover .skeleton-b-tile:nth-child(2) {
  transform: translateX(4px);
}

/* ----- Skeleton C · Filmstrip Timeline ----- */
.skeleton-c {
  position: relative;
}

.skeleton-c-strip {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 4px 4px 24px;
  -webkit-overflow-scrolling: touch;
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
  width: clamp(320px, 38vw, 420px);
  aspect-ratio: 16 / 10;
  scroll-snap-align: start;
  /* Allow the MM-DD label to escape below the tile (would otherwise be clipped by .game-tile's overflow:hidden) */
  overflow: visible;
}

.skeleton-c-tile img {
  border-radius: 14px;
}

.skeleton-c-label {
  position: absolute;
  left: 50%;
  bottom: -18px;
  transform: translateX(-50%);
  font-size: 0.72rem;
  color: rgba(15, 23, 42, 0.55);
  font-family: 'Courier New', ui-monospace, monospace;
  letter-spacing: 0.04em;
  white-space: nowrap;
  pointer-events: none;
}

/* Focus-lift hover: dim siblings, lift hovered */
.skeleton-c .skeleton-c-tile {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.skeleton-c:hover .skeleton-c-tile {
  opacity: 0.6;
}

.skeleton-c:hover .skeleton-c-tile:hover {
  opacity: 1;
  transform: translateY(-6px);
  box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
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

/* ----- Skeleton D · Magazine Mosaic ----- */
.skeleton-d {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.magazine-tile-wrap {
  /* width set inline; margin offsets from data-offset below */
}

.magazine-tile-wrap[data-offset="left"] {
  margin-right: auto;
}

.magazine-tile-wrap[data-offset="right"] {
  margin-left: auto;
}

.magazine-tile-wrap[data-offset="center"] {
  margin-left: auto;
  margin-right: auto;
}

.magazine-tile {
  aspect-ratio: 16 / 10;
}

.magazine-tile.is-featured {
  aspect-ratio: 21 / 9;
}

.magazine-tile img {
  transition: transform 0.3s ease;
}

/* Inner-zoom hover micro-action: image scales inside the frame, frame stays still */
.magazine-tile:hover img {
  transform: scale(1.05);
}

/* ----- Cross-month fade ----- */
.month-fade-enter-active,
.month-fade-leave-active {
  transition: opacity 0.25s ease;
}

.month-fade-enter-from,
.month-fade-leave-to {
  opacity: 0;
}

/* ----- Mobile fallback (≤768px) ----- */
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

  /* Skeleton A: drop letterbox bars, fill width */
  .skeleton-a-tile {
    max-width: 100%;
    box-shadow: none;
  }

  .skeleton-a-tile:hover {
    box-shadow: 0 18px 32px rgba(15, 23, 42, 0.18);
  }

  /* Skeleton B: stack everything vertically */
  .skeleton-b,
  .skeleton-b-pair,
  .skeleton-b-pair--duo {
    flex-direction: column;
  }

  .skeleton-b-pair--duo .skeleton-b-tile:nth-child(1),
  .skeleton-b-pair--duo .skeleton-b-tile:nth-child(2) {
    flex: 1 1 auto;
  }

  /* Skeleton C: vertical stack, hide arrows */
  .skeleton-c-strip {
    flex-direction: column;
    overflow-x: visible;
    scroll-snap-type: none;
    padding-bottom: 4px;
  }

  .skeleton-c-tile {
    width: 100%;
  }

  .skeleton-c-label {
    position: static;
    transform: none;
    margin-top: 4px;
    text-align: center;
  }

  .skeleton-c-arrow {
    display: none;
  }

  /* Skeleton D: drop offsets, fill width */
  .magazine-tile-wrap[data-offset] {
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100% !important;
  }

  .skeleton-d {
    gap: 0.75rem;
  }
}

/* ----- Reduced motion ----- */
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
}

/* ----- Dark theme ----- */
:global(.dark-theme) .game-section-title {
  color: rgba(248, 250, 252, 0.9);
}

:global(.dark-theme) .game-section-subtitle,
:global(.dark-theme) .game-month-title,
:global(.dark-theme) .game-empty,
:global(.dark-theme) .skeleton-c-label {
  color: rgba(226, 232, 240, 0.75);
}
</style>
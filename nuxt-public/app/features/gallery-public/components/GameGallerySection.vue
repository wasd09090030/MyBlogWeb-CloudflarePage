<template>
  <section class="game-gallery-section" :class="{ 'game-gallery-section--embedded': !showSectionHeader }">
    <div v-if="showSectionHeader" class="game-section-header">
      <h2 class="game-section-title">Game screenshots</h2>
      <p class="game-section-subtitle">按月份归档（最新优先）</p>
    </div>

    <div v-if="images.length === 0" class="game-empty">暂无游戏截屏</div>

    <div v-else class="game-months">
      <div
        v-for="(block, blockIndex) in bentoBlocks"
        :key="`bento-${blockIndex}`"
        :class="[
          'game-bento-grid',
          `game-bento-grid--${block.variant}`,
          `game-bento-grid--count-${images.length}`,
          `game-bento-grid--tiles-${block.tiles.length}`
        ]"
      >
        <button
          v-for="tile in block.tiles"
          :key="getImageKey(tile.image, tile.index)"
          v-motion
          type="button"
          class="game-bento-tile"
          :aria-label="tile.image?.title || `Open game screenshot ${tile.index + 1}`"
          :class="[`game-bento-tile--${tile.role}`, `game-bento-tile--${tile.aspect}`]"
          :initial="{ opacity: 0.001, y: 14 }"
          :visible-once="{
            opacity: 1,
            y: 0,
            transition: { duration: 300, delay: tile.index * 45, ease: 'easeOut' }
          }"
          @click="emitGameImageClick($event, tile.image)"
        >
          <GameTileImage :image="tile.image" :index="tile.index" />
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { h, resolveComponent } from 'vue'
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'
import { getGalleryImageKey } from '~/features/gallery-public/utils/masonryLayout'
import { getGalleryTimestamp } from '~/features/gallery-public/utils/monthGrouping'
import { buildGameBentoBlocks } from '~/features/gallery-public/utils/gameBentoLayout'

const props = defineProps({
  images: {
    type: Array,
    default: () => []
  },
  monthKey: {
    type: String,
    default: 'unknown'
  },
  showSectionHeader: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['image-click'])
const imageLoadedMap = ref({})
const imageErrorMap = ref({})

const getImageKey = (image, index) => getGalleryImageKey(image, index)
const bentoBlocks = computed(() => buildGameBentoBlocks(props.images, props.monthKey))

const hasImage = (image, index) => {
  const thumbnailUrl = image?.lightboxUrl || image?.thumbnailUrl
  return Boolean(thumbnailUrl) && !imageErrorMap.value[getImageKey(image, index)]
}

const isImageLoaded = (image, index) => Boolean(imageLoadedMap.value[getImageKey(image, index)])

const handleImageLoad = (image, index) => {
  imageLoadedMap.value[getImageKey(image, index)] = true
}

const handleImageError = (image, index) => {
  const imageKey = getImageKey(image, index)
  imageErrorMap.value[imageKey] = true
  imageLoadedMap.value[imageKey] = true
}

const formatTileDate = (image) => {
  const timestamp = getGalleryTimestamp(image)
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`
}

const GameTileImage = {
  props: {
    image: { type: Object, required: true },
    index: { type: Number, required: true }
  },
  setup(componentProps) {
    return () => {
      const { image, index } = componentProps
      if (!hasImage(image, index)) {
        return h('div', { class: 'game-card-fallback' }, [
          h(resolveComponent('Icon'), { name: 'image', size: 'lg' })
        ])
      }

      return [
        h(ImageLoadingPlaceholder, { show: !isImageLoaded(image, index) }),
        h('img', {
          src: image.lightboxUrl || image.thumbnailUrl || '',
          alt: image.title || '游戏截屏',
          class: 'game-tile__image',
          draggable: false,
          loading: 'lazy',
          onLoad: () => handleImageLoad(image, index),
          onError: () => handleImageError(image, index)
        }),
        h('span', { class: 'game-tile-date' }, formatTileDate(image))
      ]
    }
  }
}

const emitGameImageClick = (event, image) => {
  const rect = event.currentTarget.getBoundingClientRect()
  emit('image-click', image, {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  })
}

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
@import '~/assets/css/components/GameGallerySection.desktop.css';
@import '~/assets/css/components/GameGallerySection.mobile.css';
</style>

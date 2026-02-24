<template>
  <div class="gallery-fullscreen">
    <Transition name="loading-fade" mode="out-in">
      <GalleryLoadingAnimation
        v-if="isInitialLoading"
        :loading-progress="loadingProgress"
        :preview-images="previewImages"
      />
    </Transition>

    <StateLoading v-if="!isInitialLoading && loading" />

    <StateError v-if="!isInitialLoading && !loading && error" :message="error" />

    <StateEmpty
      v-if="!isInitialLoading && !loading && !error && galleries.length === 0"
      icon="images"
      title="暂无图片"
      description="画廊中还没有任何图片"
    />

    <Transition name="gallery-fade" @after-enter="$emit('gallery-visible')">
      <div v-if="!isInitialLoading && !loading && !error && galleries.length > 0" class="gallery-content" :class="{ 'gallery-ready': isGalleryReady }">
        <div class="gallery-top">
          <div class="gallery-options" role="tablist" aria-label="Gallery categories">
            <button
              class="gallery-option"
              :class="{ 'is-active': activeTag === 'artwork' }"
              type="button"
              role="tab"
              :aria-selected="activeTag === 'artwork'"
              @click="$emit('change-tag', 'artwork')"
            >
              Awesome artwork
            </button>
            <button
              class="gallery-option"
              :class="{ 'is-active': activeTag === 'game' }"
              type="button"
              role="tab"
              :aria-selected="activeTag === 'game'"
              @click="$emit('change-tag', 'game')"
            >
              game screenshot
            </button>
          </div>

          <FadeSlideshow
            v-if="activeTag === 'artwork' && artworkGalleries.length > 0"
            ref="fadeSlideshowRef"
            :images="getGallerySlice(0, 5)"
            @image-click="$emit('open-fullscreen', $event)"
          />
        </div>

        <div v-if="activeTag === 'artwork' && artworkGalleries.length > 0" class="gallery-sections">
          <AccordionGallery
            ref="accordionGalleryRef"
            :images="getGallerySlice(5, 10)"
            @image-click="$emit('open-fullscreen', $event)"
          />

          <CoverflowGallery
            ref="coverflowGalleryRef"
            :images="getGallerySlice(10, 15)"
            @image-click="$emit('open-fullscreen', $event)"
          />
        </div>

        <MasonryWaterfall
          v-if="activeTag === 'artwork' && artworkGalleries.length > 0"
          ref="masonryWaterfallRef"
          :images="getGallerySlice(0, artworkGalleries.length)"
          :column-count="4"
          @image-click="$emit('open-fullscreen', $event)"
        />

        <GameGallerySection
          v-if="activeTag === 'game'"
          :images="gameGalleries"
          @image-click="$emit('open-fullscreen', $event)"
        />
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="fullscreen-fade">
        <div v-if="showFullscreen" class="fullscreen-modal" @click="$emit('close-fullscreen')">
          <div class="fullscreen-backdrop"></div>

          <div class="fullscreen-controls">
            <button class="control-btn" @click.stop="$emit('zoom-in')" title="放大">
              <Icon name="zoom-in" size="lg" />
            </button>
            <button class="control-btn" @click.stop="$emit('zoom-out')" title="缩小">
              <Icon name="zoom-out" size="lg" />
            </button>
            <button class="control-btn" @click.stop="$emit('reset-zoom')" title="重置">
              <Icon name="arrows-angle-contract" size="lg" />
            </button>
            <button class="control-btn close-btn" @click="$emit('close-fullscreen')" title="关闭">
              <Icon name="x-lg" size="lg" />
            </button>
          </div>

          <div class="fullscreen-content" @click.stop @wheel.prevent="$emit('wheel', $event)">
            <Transition name="image-zoom">
              <div
                v-if="selectedImage"
                class="image-wrapper"
                :style="imageTransformStyle"
                @mousedown="$emit('start-drag', $event)"
                @touchstart="$emit('start-drag', $event)"
              >
                <img
                  :src="selectedImage?.imageUrl"
                  alt="画廊图片"
                  class="fullscreen-image"
                  :class="{ 'is-dragging': isDragging }"
                  @load="$emit('image-load')"
                />
              </div>
            </Transition>
          </div>

          <div class="zoom-indicator" v-if="imageScale !== 1">
            {{ Math.round(imageScale * 100) }}%
          </div>

          <div class="fullscreen-hint">
            <span>滚轮缩放 · 拖拽移动 · 点击背景关闭</span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import FadeSlideshow from '~/features/gallery-public/components/FadeSlideshow.vue'
import AccordionGallery from '~/features/gallery-public/components/AccordionGallery.vue'
import CoverflowGallery from '~/features/gallery-public/components/CoverflowGallery.vue'
import MasonryWaterfall from '~/features/gallery-public/components/MasonryWaterfall.vue'
import GameGallerySection from '~/features/gallery-public/components/GameGallerySection.vue'
import StateLoading from '~/shared/ui/StateLoading.vue'
import StateError from '~/shared/ui/StateError.vue'
import StateEmpty from '~/shared/ui/StateEmpty.vue'

const props = defineProps({
  galleries: { type: Array, required: true },
  loading: { type: Boolean, required: true },
  error: { type: String, default: null },
  activeTag: { type: String, required: true },
  artworkGalleries: { type: Array, required: true },
  gameGalleries: { type: Array, required: true },
  isInitialLoading: { type: Boolean, required: true },
  loadingProgress: { type: Number, required: true },
  previewImages: { type: Array, required: true },
  isGalleryReady: { type: Boolean, required: true },
  selectedImage: { type: Object, default: null },
  showFullscreen: { type: Boolean, required: true },
  imageTransformStyle: { type: Object, required: true },
  imageScale: { type: Number, required: true },
  isDragging: { type: Boolean, required: true },
  getGallerySlice: { type: Function, required: true }
})

defineEmits([
  'change-tag',
  'open-fullscreen',
  'close-fullscreen',
  'zoom-in',
  'zoom-out',
  'reset-zoom',
  'wheel',
  'start-drag',
  'image-load',
  'gallery-visible'
])

const fadeSlideshowRef = ref(null)
const accordionGalleryRef = ref(null)
const coverflowGalleryRef = ref(null)
const masonryWaterfallRef = ref(null)

defineExpose({
  getSliderRefs() {
    return {
      fadeSlideshowRef,
      accordionGalleryRef,
      coverflowGalleryRef,
      masonryWaterfallRef
    }
  }
})
</script>

<style scoped>
@import '~/assets/css/components/Gallery.styles.css';
</style>

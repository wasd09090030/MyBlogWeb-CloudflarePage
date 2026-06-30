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
      icon="heroicons:photo"
      title="暂无图片"
      description="画廊中还没有任何图片"
    />

    <Transition name="gallery-fade" @after-enter="$emit('gallery-visible')">
      <div v-if="!isInitialLoading && !loading && !error && galleries.length > 0" class="gallery-content" :class="{ 'gallery-ready': isGalleryReady }">

        <!-- 标签浮层，绝对定位叠于英雄区 -->
        <div class="gallery-tabs-float">
          <div class="gallery-options" role="tablist" aria-label="Gallery categories">
            <button
              class="gallery-option"
              :class="{ 'is-active': activeTag === 'artwork' }"
              type="button"
              role="tab"
              :aria-selected="activeTag === 'artwork'"
              @click="$emit('change-tag', 'artwork')"
            >Awesome artwork</button>
            <button
              class="gallery-option"
              :class="{ 'is-active': activeTag === 'game' }"
              type="button"
              role="tab"
              :aria-selected="activeTag === 'game'"
              @click="$emit('change-tag', 'game')"
            >game screenshot</button>
          </div>
        </div>

        <!-- Artwork：顶部 Hero 保留嵌入感，后续图片流走稳定 masonry -->
        <template v-if="activeTag === 'artwork' && artworkGalleries.length > 0">
          <GalleryHeroSection
            ref="galleryHeroSectionRef"
            :fade-images="getGallerySlice(0, 5)"
            :accordion-images="getGallerySlice(5, 10)"
            :coverflow-images="getGallerySlice(10, 15)"
            :preview-images="getGallerySlice(15, 18)"
            @image-click="$emit('open-fullscreen', $event)"
          />

          <GalleryTimelineLayout :groups="artworkMonthGroups">
            <template #month="{ group }">
              <GalleryMasonryList
                ref="galleryMasonryListRef"
                :images="group.items"
                :initial-load-count="24"
                :load-more-count="12"
                @image-click="$emit('open-fullscreen', $event)"
              />
            </template>
          </GalleryTimelineLayout>
        </template>

        <!-- Game 板块 -->
        <GalleryTimelineLayout
          v-if="activeTag === 'game' && gameGalleries.length > 0"
          :groups="gameMonthGroups"
        >
          <template #month="{ group }">
            <GameGallerySection
              :images="group.items"
              :show-section-header="false"
              :show-month-title="false"
              @image-click="$emit('open-fullscreen', $event)"
            />
          </template>
        </GalleryTimelineLayout>

        <StateEmpty
          v-if="activeTag === 'game' && gameGalleries.length === 0"
          icon="heroicons:photo"
          title="暂无游戏截屏"
          description="画廊中还没有游戏截图"
        />
      </div>
    </Transition>

    <Teleport to="body">
      <Transition name="fullscreen-fade">
        <div v-if="showFullscreen" class="fullscreen-modal" @click="$emit('close-fullscreen')">
          <div class="fullscreen-backdrop"></div>

          <div class="fullscreen-controls">
            <button class="control-btn" @click.stop="$emit('zoom-in')" title="放大">
              <Icon name="heroicons:magnifying-glass-plus" size="lg" />
            </button>
            <button class="control-btn" @click.stop="$emit('zoom-out')" title="缩小">
              <Icon name="heroicons:magnifying-glass-minus" size="lg" />
            </button>
            <button class="control-btn" @click.stop="$emit('reset-zoom')" title="重置">
              <Icon name="heroicons:arrows-pointing-in" size="lg" />
            </button>
            <button class="control-btn close-btn" @click="$emit('close-fullscreen')" title="关闭">
              <Icon name="heroicons:x-mark" size="lg" />
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
                  @load="handleFullscreenImageLoad"
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
import GalleryHeroSection from '~/features/gallery-public/components/GalleryHeroSection.vue'
import GalleryTimelineLayout from '~/features/gallery-public/components/GalleryTimelineLayout.vue'
import GalleryMasonryList from '~/features/gallery-public/components/GalleryMasonryList.vue'
import GameGallerySection from '~/features/gallery-public/components/GameGallerySection.vue'
import { groupGalleryByMonth } from '~/features/gallery-public/utils/monthGrouping'
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

const emit = defineEmits([
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

const galleryHeroSectionRef = ref(null)
const galleryMasonryListRef = ref(null)

const artworkMonthGroups = computed(() => groupGalleryByMonth(
  props.getGallerySlice(0, props.artworkGalleries.length),
  { sectionPrefix: 'gallery-artwork-month' }
))

const gameMonthGroups = computed(() => groupGalleryByMonth(
  props.gameGalleries,
  { sectionPrefix: 'gallery-game-month' }
))

const handleFullscreenImageLoad = () => {
  emit('image-load')
}

defineExpose({
  getSliderRefs() {
    const heroRefs = galleryHeroSectionRef.value?.getSliderRefs?.() || {}
    return {
      ...heroRefs,
      masonryListRef: galleryMasonryListRef
    }
  }
})
</script>

<style scoped>
@import '~/assets/css/components/Gallery.desktop.css';
@import '~/assets/css/components/Gallery.mobile.css';
</style>

<template>
  <section class="gallery-hero">
    <div class="gallery-hero__grid">
      <div class="embedded-fade gallery-hero__fade">
        <FadeSlideshow
          ref="fadeSlideshowRef"
          :images="fadeImages"
          @image-click="$emit('image-click', $event)"
        />
      </div>

      <div class="gallery-hero__preview gallery-hero__preview--tall">
        <article
          v-for="(image, index) in railPreviewImages"
          :key="`hero-tall-${getImageKey(image, index)}`"
          class="gallery-hero__preview-card gallery-hero__preview-card--rail"
          :class="{ 'gallery-hero__preview-card--soft-background': index === 1 }"
          :style="getPreviewCardStyle(image, index, { useImageBackground: index === 1, fitToTrack: index === 1 })"
          @click="$emit('image-click', image)"
        >
          <template v-if="hasImage(image, index)">
            <ImageLoadingPlaceholder :show="!isPreviewLoaded(image, index)" />
            <img
              :src="image.thumbnailUrl || image.imageUrl"
              :alt="image.title || '画廊图片'"
              :class="[
                'gallery-hero__preview-image',
                { 'gallery-hero__preview-image--contain': index === 1 }
              ]"
              loading="lazy"
              @load="handlePreviewLoad(image, index, $event)"
              @error="handlePreviewError(image, index, $event)"
            />
          </template>
          <div v-else class="gallery-hero__preview-fallback">
            <Icon name="heroicons:photo" size="xl" />
          </div>
        </article>
      </div>

      <div class="embedded-card gallery-hero__accordion">
        <AccordionGallery
          ref="accordionGalleryRef"
          :images="accordionImages"
          @image-click="$emit('image-click', $event)"
        />
      </div>

      <div class="gallery-hero__preview gallery-hero__preview--wide">
        <article
          class="gallery-hero__preview-card gallery-hero__preview-card--feature"
          @click="$emit('image-click', featuredPreviewImage)"
        >
          <template v-if="hasImage(featuredPreviewImage, 2)">
            <ImageLoadingPlaceholder :show="!isPreviewLoaded(featuredPreviewImage, 2)" />
            <img
              :src="featuredPreviewImage.thumbnailUrl || featuredPreviewImage.imageUrl"
              :alt="featuredPreviewImage.title || '画廊图片'"
              class="gallery-hero__preview-image"
              loading="lazy"
              @load="handlePreviewLoad(featuredPreviewImage, 2, $event)"
              @error="handlePreviewError(featuredPreviewImage, 2, $event)"
            />
          </template>
          <div v-else class="gallery-hero__preview-fallback">
            <Icon name="heroicons:photo" size="xl" />
          </div>
        </article>
      </div>

      <div class="embedded-card gallery-hero__coverflow">
        <CoverflowGallery
          ref="coverflowGalleryRef"
          :images="coverflowImages"
          @image-click="$emit('image-click', $event)"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'
import AccordionGallery from '~/features/gallery-public/components/AccordionGallery.vue'
import CoverflowGallery from '~/features/gallery-public/components/CoverflowGallery.vue'
import FadeSlideshow from '~/features/gallery-public/components/FadeSlideshow.vue'
import {
  getGalleryAspectRatioStyle,
  getGalleryImageKey
} from '~/features/gallery-public/utils/masonryLayout'

const props = defineProps({
  fadeImages: {
    type: Array,
    default: () => []
  },
  accordionImages: {
    type: Array,
    default: () => []
  },
  coverflowImages: {
    type: Array,
    default: () => []
  },
  previewImages: {
    type: Array,
    default: () => []
  }
})

defineEmits(['image-click'])

const fadeSlideshowRef = ref(null)
const accordionGalleryRef = ref(null)
const coverflowGalleryRef = ref(null)

const previewLoadedMap = ref({})
const previewErrorMap = ref({})
const previewSizeMap = ref({})

const railPreviewImages = computed(() => props.previewImages.slice(0, 2))
const featuredPreviewImage = computed(() => props.previewImages[2] ?? props.previewImages[0] ?? null)

const getImageKey = (image, index) => getGalleryImageKey(image, index)
const getPreviewImageUrl = (image) => image?.thumbnailUrl || image?.imageUrl || ''

const hasImage = (image, index) => {
  const imageUrl = getPreviewImageUrl(image)
  if (!imageUrl) return false
  return !previewErrorMap.value[getImageKey(image, index)]
}

const isPreviewLoaded = (image, index) => Boolean(previewLoadedMap.value[getImageKey(image, index)])

const handlePreviewLoad = (image, index, event) => {
  const imageKey = getImageKey(image, index)
  previewLoadedMap.value[imageKey] = true

  const target = event?.target
  if (target instanceof HTMLImageElement && target.naturalWidth > 0 && target.naturalHeight > 0) {
    previewSizeMap.value[imageKey] = {
      width: target.naturalWidth,
      height: target.naturalHeight
    }
  }
}

const handlePreviewError = (image, index, event) => {
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
  previewErrorMap.value[imageKey] = true
  previewLoadedMap.value[imageKey] = true
}

const getAspectRatioStyle = (image, index) => {
  const imageKey = getImageKey(image, index)
  return getGalleryAspectRatioStyle(image, previewSizeMap.value[imageKey] ?? null)
}

const getPreviewCardStyle = (image, index, options = {}) => {
  const style = {}

  if (options.fitToTrack) {
    style.height = '100%'
  } else {
    style.aspectRatio = getAspectRatioStyle(image, index)
  }

  if (options.useImageBackground) {
    const imageUrl = getPreviewImageUrl(image)
    if (imageUrl) {
      style.backgroundImage = `url("${imageUrl}")`
      style.backgroundPosition = 'center'
      style.backgroundRepeat = 'no-repeat'
      style.backgroundSize = 'cover'
    }
  }

  return style
}

watch(
  () => props.previewImages.map((image, index) => getImageKey(image, index)).join('|'),
  () => {
    previewLoadedMap.value = {}
    previewErrorMap.value = {}
    previewSizeMap.value = {}
  },
  { immediate: true }
)

defineExpose({
  getSliderRefs() {
    return {
      fadeSlideshowRef,
      accordionGalleryRef,
      coverflowGalleryRef
    }
  }
})
</script>

<style scoped>
.gallery-hero {
  position: relative;
  width: 100%;
  padding: 4.5rem 0.5rem 0.75rem;
  --hero-fade-height: 80vh;
  --hero-panel-height: 67vh;
  --hero-gap: 14px;
  --hero-inner-gap: 12px;
}

.embedded-fade {
  overflow: hidden;
  border-radius: 12px;
  z-index: 1;
}

.embedded-fade :deep(.fade-section) {
  height: 100% !important;
  margin: 0 !important;
  border-radius: 0 !important;
}

.embedded-card {
  overflow: hidden;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  z-index: 1;
}

.embedded-card :deep(.accordion-fill),
.embedded-card :deep(.coverflow-fill) {
  width: 100%;
  height: 100%;
}

.gallery-hero__grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--hero-gap);
  align-items: start;
}

.gallery-hero__fade {
  grid-column: 1 / span 4;
  height: var(--hero-fade-height);
}

.gallery-hero__preview--tall {
  grid-column: 5;
  display: grid;
  grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: var(--hero-inner-gap);
  height: var(--hero-fade-height);
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(10px);
}

.gallery-hero__accordion {
  grid-column: 1 / span 3;
  height: var(--hero-panel-height);
}

.gallery-hero__preview--wide {
  grid-column: 4 / span 2;
  display: block;
  height: var(--hero-panel-height);
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(12px);
}

.gallery-hero__coverflow {
  grid-column: 1 / span 3;
  height: var(--hero-panel-height);
}

.gallery-hero__preview-card {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.82);
  min-height: 0;
}

.gallery-hero__preview-card--feature {
  height: 100%;
}

.gallery-hero__preview-card--soft-background {
  background-color: rgba(255, 255, 255, 0.5);
  background-blend-mode: soft-light;
}

.gallery-hero__preview-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.35s ease, filter 0.35s ease;
}

.gallery-hero__preview-image--contain {
  object-fit: contain;
  object-position: center;
}

.gallery-hero__preview-card:hover .gallery-hero__preview-image {
  transform: scale(1.04);
  filter: saturate(1.05);
}

.gallery-hero__preview-card:hover .gallery-hero__preview-image--contain {
  transform: scale(1.01);
}

.gallery-hero__preview-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.84);
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.58), rgba(30, 41, 59, 0.3));
}

@media (min-width: 1280px) {
  .gallery-hero__grid {
    grid-template-rows: var(--hero-fade-height) var(--hero-panel-height) var(--hero-panel-height);
    align-items: stretch;
  }

  .embedded-fade,
  .embedded-card,
  .gallery-hero__preview--tall,
  .gallery-hero__preview--wide {
    height: 100%;
  }

  .gallery-hero__fade {
    grid-row: 1;
    height: auto;
  }

  .gallery-hero__preview--tall {
    grid-row: 1;
    height: auto;
  }

  .gallery-hero__accordion {
    grid-row: 2;
    height: auto;
  }

  .gallery-hero__preview--wide {
    grid-row: 2 / span 2;
    height: auto;
  }

  .gallery-hero__coverflow {
    grid-row: 3;
    height: auto;
  }
}

@media (max-width: 1279px) {
  .gallery-hero {
    --hero-fade-height: 62vh;
    --hero-panel-height: 34vh;
    --hero-gap: 12px;
    --hero-inner-gap: 10px;
  }

  .gallery-hero__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .gallery-hero__fade {
    grid-column: 1 / -1;
  }

  .gallery-hero__preview--tall {
    grid-column: 3;
    grid-row: auto;
  }

  .gallery-hero__accordion,
  .gallery-hero__coverflow {
    grid-column: 1 / span 2;
  }

  .gallery-hero__preview--wide {
    grid-column: 3;
    align-self: stretch;
  }
}

@media (max-width: 767px) {
  .gallery-hero {
    padding: 4rem 0.25rem 0.5rem;
    --hero-fade-height: 54vh;
    --hero-panel-height: 22vh;
    --hero-gap: 10px;
    --hero-inner-gap: 8px;
  }

  .gallery-hero__grid {
    grid-template-columns: 1fr;
    gap: var(--hero-gap);
  }

  .gallery-hero__fade,
  .gallery-hero__preview--tall,
  .gallery-hero__accordion,
  .gallery-hero__preview--wide,
  .gallery-hero__coverflow {
    grid-column: 1;
  }

  .gallery-hero__fade {
  }

  .gallery-hero__preview--tall,
  .gallery-hero__preview--wide {
    height: auto;
    padding: 10px;
  }

  .gallery-hero__preview--tall {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .gallery-hero__preview--wide {
    display: block;
  }

  .gallery-hero__accordion,
  .gallery-hero__coverflow {
  }
}
</style>

<template>
  <GalleryContent
    ref="galleryContentRef"
    :galleries="galleries"
    :loading="loading"
    :error="error"
    :active-tag="activeTag"
    :artwork-galleries="artworkGalleries"
    :game-galleries="gameGalleries"
    :is-initial-loading="isInitialLoading"
    :loading-progress="loadingProgress"
    :preview-images="previewImages"
    :is-gallery-ready="isGalleryReady"
    :selected-image="selectedImage"
    :show-fullscreen="showFullscreen"
    :image-transform-style="imageTransformStyle"
    :image-scale="imageScale"
    :is-dragging="isDragging"
    :get-gallery-slice="getGallerySlice"
    @change-tag="setActiveTag"
    @open-fullscreen="openFullscreen"
    @close-fullscreen="closeFullscreen"
    @zoom-in="zoomIn"
    @zoom-out="zoomOut"
    @reset-zoom="resetZoom"
    @wheel="handleWheel"
    @start-drag="startDrag"
    @image-load="onImageLoad"
    @gallery-visible="onGalleryVisible"
  />
</template>

<script setup>
import GalleryContent from '~/features/gallery-public/components/GalleryContent.vue'
import { useGalleryFeature } from '~/features/gallery-public/composables/useGalleryFeature'
import { preloadAllImagesWithWorker, ensureMinLoadingTime } from '~/features/gallery-public/utils/imageLoader'
import { zoomIn as zoomInFn, zoomOut as zoomOutFn, resetZoom as resetZoomFn, handleWheel as handleWheelFn, createDragHandler } from '~/features/gallery-public/utils/zoomAndDrag'
import { initSliders, destroySliders, getGallerySlice as getSlice } from '~/features/gallery-public/utils/sliderManager'
import { normalizeTag, bodyScrollManager } from '~/features/gallery-public/utils/utils'
import { logAppError, mapErrorToUserMessage } from '~/shared/errors'

const galleries = ref([])
const loading = ref(true)
const error = ref(null)
const showFullscreen = ref(false)
const selectedImage = ref(null)
const activeTag = ref('artwork')

const isInitialLoading = ref(true)
const loadingProgress = ref(0)
const previewImages = ref([])
const loadedImagesCount = ref(0)
const totalImagesToLoad = ref(0)
const isGalleryReady = ref(false)

const galleryContentRef = ref(null)

const imageScale = ref(1)
const imagePosition = ref({ x: 0, y: 0 })

const dragHandler = createDragHandler()
const { isDragging } = dragHandler

const imageTransformStyle = computed(() => ({
  transform: `translate(${imagePosition.value.x}px, ${imagePosition.value.y}px) scale(${imageScale.value})`,
  cursor: imageScale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default'
}))

const { getGalleries } = useGalleryFeature()

const artworkGalleries = computed(() => galleries.value.filter(gallery => normalizeTag(gallery.tag) === 'artwork'))
const gameGalleries = computed(() => galleries.value.filter(gallery => normalizeTag(gallery.tag) === 'game'))

const setActiveTag = (tag) => {
  if (activeTag.value === tag) return
  activeTag.value = tag
}

const preloadAllImagesHandler = async () => {
  if (galleries.value.length === 0) return

  const loadingState = {
    loadedImagesCount,
    totalImagesToLoad
  }

  try {
    await preloadAllImagesWithWorker(
      galleries.value,
      loadingState,
      loadingProgress,
      previewImages,
      15,
      5
    )

    await ensureMinLoadingTime(startTime, 800)

    isInitialLoading.value = false
    await nextTick()
    setTimeout(() => {
      initGallerySliders()
    }, 100)
  } catch (preloadError) {
    console.error('预加载图片失败:', preloadError)
    isInitialLoading.value = false
    await nextTick()
    setTimeout(() => {
      initGallerySliders()
    }, 100)
  }
}

let startTime = Date.now()

const fetchGalleries = async () => {
  try {
    startTime = Date.now()
    loading.value = true
    error.value = null
    const data = await getGalleries()
    galleries.value = data || []

    if (galleries.value.length > 0) {
      loading.value = false
      await preloadAllImagesHandler()
    } else {
      loading.value = false
      isInitialLoading.value = false
    }
  } catch (err) {
    logAppError('gallery-page', '获取画廊数据', err)
    error.value = mapErrorToUserMessage(err, '获取画廊数据失败，请稍后重试')
    loading.value = false
    isInitialLoading.value = false
  }
}

const getGallerySlice = (start, end) => {
  return getSlice(artworkGalleries.value, start, end)
}

const getSliderRefs = () => {
  return galleryContentRef.value?.getSliderRefs?.() || {
    fadeSlideshowRef: ref(null),
    accordionGalleryRef: ref(null),
    coverflowGalleryRef: ref(null),
    masonryWaterfallRef: ref(null)
  }
}

const initGallerySliders = async () => {
  const refs = getSliderRefs()
  await initSliders(refs, activeTag.value, artworkGalleries.value.length, isInitialLoading.value)
}

const destroyGallerySliders = () => {
  const refs = getSliderRefs()
  destroySliders(refs)
}

const openFullscreen = (gallery) => {
  selectedImage.value = gallery
  showFullscreen.value = true
  resetZoom()
}

const closeFullscreen = () => {
  showFullscreen.value = false
  selectedImage.value = null
  resetZoom()
}

const onImageLoad = () => {}

const onGalleryVisible = () => {
  setTimeout(() => {
    isGalleryReady.value = true
  }, 100)
}

const zoomIn = () => zoomInFn(imageScale)
const zoomOut = () => zoomOutFn(imageScale, imagePosition)
const resetZoom = () => resetZoomFn(imageScale, imagePosition)
const handleWheel = (e) => handleWheelFn(e, imageScale, imagePosition)
const startDrag = (e) => dragHandler.startDrag(e, imageScale, imagePosition)

watch(activeTag, async (tag) => {
  if (isInitialLoading.value || galleries.value.length === 0) return
  if (tag === 'artwork') {
    await nextTick()
    initGallerySliders()
    return
  }
  destroyGallerySliders()
})

onMounted(async () => {
  bodyScrollManager.disable()
  await fetchGalleries()
})

onUnmounted(() => {
  destroyGallerySliders()
  bodyScrollManager.restore()
})
</script>

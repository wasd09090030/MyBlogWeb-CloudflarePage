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
import { createGalleryRepository } from '~/features/gallery-public/services/gallery.repository'
import { preloadAllImagesWithWorker, ensureMinLoadingTime } from '~/features/gallery-public/utils/imageLoader'
import { zoomIn as zoomInFn, zoomOut as zoomOutFn, resetZoom as resetZoomFn, handleWheel as handleWheelFn, createDragHandler } from '~/features/gallery-public/utils/zoomAndDrag'
import { initSliders, destroySliders, getGallerySlice as getSlice } from '~/features/gallery-public/utils/sliderManager'
import { normalizeTag, bodyScrollManager } from '~/features/gallery-public/utils/utils'
import { mapErrorToUserMessage } from '~/shared/errors'
import { createApiClient } from '~/shared/api/client'
import { API_ENDPOINTS } from '~/shared/api/endpoints'

// SSG 预渲染阶段拉取画廊数据，构建时将结果写入 _payload.json；
// 客户端水化时直接从 payload 读取，无需额外网络请求。
const { getGalleriesSSG } = createGalleryRepository()
let _initialGalleries = []
let _initialError = null
try {
  _initialGalleries = await getGalleriesSSG()
} catch (err) {
  _initialError = err
}

const galleries = ref(_initialGalleries)
const loading = ref(false)  // SSG 数据已就绪，无需加载状态
const error = ref(_initialError ? mapErrorToUserMessage(_initialError, '获取画廊数据失败，请稍后重试') : null)
const showFullscreen = ref(false)
const selectedImage = ref(null)
const activeTag = ref('artwork')

const isInitialLoading = ref(true)
const loadingProgress = ref(0)
const previewImages = ref([])
const loadedImagesCount = ref(0)
const totalImagesToLoad = ref(0)
const isGalleryReady = ref(false)
const galleryClient = createApiClient()

const galleryContentRef = ref(null)

const imageScale = ref(1)
const imagePosition = ref({ x: 0, y: 0 })

const dragHandler = createDragHandler()
const { isDragging } = dragHandler

const imageTransformStyle = computed(() => ({
  transform: `translate(${imagePosition.value.x}px, ${imagePosition.value.y}px) scale(${imageScale.value})`,
  cursor: imageScale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default'
}))

const THUMB_EXP_REFRESH_BUFFER_SECONDS = 60

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
      5,
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

const readThumbnailExp = (thumbnailUrl) => {
  if (typeof thumbnailUrl !== 'string' || !thumbnailUrl) return null
  try {
    const url = new URL(thumbnailUrl, window.location.origin)
    const exp = Number(url.searchParams.get('exp'))
    return Number.isFinite(exp) ? exp : null
  } catch {
    return null
  }
}

const hasExpiredThumbnailUrls = (items) => {
  const nowSeconds = Math.floor(Date.now() / 1000)
  return items.some((item) => {
    const exp = readThumbnailExp(item?.thumbnailUrl)
    return exp != null && exp <= nowSeconds + THUMB_EXP_REFRESH_BUFFER_SECONDS
  })
}

const refreshGalleriesIfThumbnailExpired = async () => {
  if (!hasExpiredThumbnailUrls(galleries.value)) return
  try {
    const latest = await galleryClient.get(API_ENDPOINTS.gallery.publicList)
    if (Array.isArray(latest) && latest.length > 0) {
      galleries.value = latest
    }
  } catch (refreshError) {
    console.warn('[Gallery] 缩略图签名刷新失败，继续使用预渲染数据', refreshError)
  }
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
  if (error.value) {
    isInitialLoading.value = false
    return
  }
  await refreshGalleriesIfThumbnailExpired()
  startTime = Date.now()
  if (galleries.value.length > 0) {
    await preloadAllImagesHandler()
  } else {
    isInitialLoading.value = false
  }
})

onUnmounted(() => {
  destroyGallerySliders()
  bodyScrollManager.restore()
})
</script>

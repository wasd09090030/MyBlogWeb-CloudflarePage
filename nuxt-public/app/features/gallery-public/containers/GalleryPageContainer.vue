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
    :fullscreen-origin-rect="fullscreenOriginRect"
    :image-transform-style="imageTransformStyle"
    :image-scale="imageScale"
    :is-dragging="isDragging"
    :fade-images="heroFadeImages"
    :accordion-images="heroAccordionImages"
    :coverflow-images="heroCoverflowImages"
    :hero-preview-images="heroPreviewImages"
    :has-hero-content="hasHeroContent"
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

// SSG 预渲染阶段拉取画廊数据，构建时将结果写入 _payload.json；
// 客户端水化时直接从 payload 读取，无需额外网络请求。
const { getGalleriesSSG, getGalleryHeroSSG } = createGalleryRepository()
let _initialGalleries = []
let _initialHero = { isConfigured: false, sections: { fade: [], accordion: [], coverflow: [], preview: [] } }
let _initialError = null
try {
  const [galleriesResult, heroResult] = await Promise.all([getGalleriesSSG(), getGalleryHeroSSG()])
  _initialGalleries = galleriesResult
  _initialHero = heroResult
} catch (err) {
  _initialError = err
}

const galleries = ref(_initialGalleries)
const heroConfiguration = ref(_initialHero)
const loading = ref(false)  // SSG 数据已就绪，无需加载状态
const error = ref(_initialError ? mapErrorToUserMessage(_initialError, '获取画廊数据失败，请稍后重试') : null)
const showFullscreen = ref(false)
const selectedImage = ref(null)
const fullscreenOriginRect = ref(null)
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

// 全屏图片只由 transform 驱动，cursor 交给 CSS 类控制。
// 好处：拖拽过程中不再因为 cursor 变化而重算这个对象
// （原先 cursor 依赖 isDragging，拖拽起止各触发一次无谓的整树 render + diff）。
const imageTransformStyle = computed(() => ({
  transform: `translate(${imagePosition.value.x}px, ${imagePosition.value.y}px) scale(${imageScale.value})`
}))

const artworkGalleries = computed(() => galleries.value.filter(gallery => normalizeTag(gallery.tag) === 'artwork'))
const gameGalleries = computed(() => galleries.value.filter(gallery => normalizeTag(gallery.tag) === 'game'))

/*
 * Hero 四个切片。
 *
 * 这里必须是 computed 而不是在模板里调用函数：
 * 每个 computed 只在依赖（heroConfiguration / artworkGalleries）变化时重新求值，
 * 因此数组引用在父组件因无关状态（如 isDragging、imagePosition、loadingProgress）
 * 重渲染时保持稳定。若写成 `:fade-images="getHeroImages('fade', 0, 5)"`，
 * 每次父级 render 都会生成一个全新数组，四个 Hero 子组件都会判定 props 变化
 * 而重新渲染 —— 这正是 Hero 区「一次交互引发整片重渲染」的放大器。
 */
const heroSlices = computed(() => {
  const configuration = heroConfiguration.value
  if (configuration.isConfigured) {
    const sections = configuration.sections || {}
    return {
      fade: sections.fade || [],
      accordion: sections.accordion || [],
      coverflow: sections.coverflow || [],
      preview: sections.preview || []
    }
  }

  // 未配置 Hero 时回落到作品集前 18 张，按分镜顺序切分。
  const artwork = artworkGalleries.value
  return {
    fade: getSlice(artwork, 0, 5),
    accordion: getSlice(artwork, 5, 10),
    coverflow: getSlice(artwork, 10, 15),
    preview: getSlice(artwork, 15, 18)
  }
})

const heroFadeImages = computed(() => heroSlices.value.fade)
const heroAccordionImages = computed(() => heroSlices.value.accordion)
const heroCoverflowImages = computed(() => heroSlices.value.coverflow)
const heroPreviewImages = computed(() => heroSlices.value.preview)

/*
 * Hero 是否在后台被配置了内容。
 *
 * 未配置时恒为 false —— 此时 Hero 用的是作品集切片，那一路「有没有内容」
 * 由 artworkGalleries.length 决定（见 GalleryContent 的 hasArtworkContent）。
 *
 * 这与改动前的判定严格等价：旧写法在未配置时走 getSlice(artwork, 0, 0)，
 * 而 getGallerySlice 在 start === end 时循环不执行、恒返回空数组，
 * 因此旧逻辑的第二个子句在未配置时必然为 false。
 */
const hasHeroContent = computed(() => {
  const configuration = heroConfiguration.value
  if (!configuration.isConfigured) return false
  const sections = configuration.sections || {}
  return ['fade', 'accordion', 'coverflow', 'preview'].some(
    section => (sections[section] || []).length > 0
  )
})

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

const getSliderRefs = () => {
  return galleryContentRef.value?.getSliderRefs?.() || {
    fadeSlideshowRef: ref(null),
    accordionGalleryRef: ref(null),
    coverflowGalleryRef: ref(null),
    masonryListRef: ref(null)
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

const openFullscreen = (payload) => {
  selectedImage.value = payload?.image ?? payload
  fullscreenOriginRect.value = payload?.originRect ?? null
  showFullscreen.value = true
  resetZoom()
}

const closeFullscreen = () => {
  showFullscreen.value = false
  selectedImage.value = null
  fullscreenOriginRect.value = null
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

/*
 * 全屏拖拽：拖拽期间直接写 DOM 的 style.transform，不触碰响应式状态。
 *
 * 若沿用旧写法（每帧 imagePosition.value = { ... }），会连锁触发：
 *   imagePosition 变更 → imageTransformStyle 重算出新对象
 *   → GalleryContent 判定 prop 变化 → 重新执行 render 并对整棵子树做 diff。
 * 鼠标每秒可产生 60~120 次 mousemove，等于每秒对画廊整页做上百次 vdom diff。
 * 改为只写一个元素的 style；松手时再把最终值提交回 imagePosition，
 * 保证后续缩放 / 滚轮缩放 / 重置仍以最新位置为基准。
 */
const applyDragFrame = ({ x, y }) => {
  const wrapper = galleryContentRef.value?.getImageWrapperEl?.()
  if (!wrapper) return
  wrapper.style.transform = `translate(${x}px, ${y}px) scale(${imageScale.value})`
}

const startDrag = (e) => dragHandler.startDrag(e, imageScale, imagePosition, {
  onMove: applyDragFrame
})

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

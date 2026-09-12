<template>
  <div
    v-if="hasCoverImage"
    class="article-cover w-full overflow-hidden relative"
  >
    <ImageLoadingPlaceholder :show="!imageLoaded" />
    <img
      ref="coverImageEl"
      :src="coverSrc"
      :srcset="coverSrcset"
      :sizes="COVER_SIZES"
      :alt="article.title"
      class="w-full h-full object-cover"
      width="960"
      height="540"
      loading="eager"
      decoding="async"
      fetchpriority="high"
      @load="handleImageLoad"
      @error="handleImageError"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import ImageLoadingPlaceholder from '~/shared/ui/ImageLoadingPlaceholder.vue'

const props = defineProps({
  article: {
    type: Object,
    required: true
  }
})

// 封面容器固定 16:9（与文章卡片的封面比例一致），SSR 即确定，
// 不再在图片 onload 后回写比例 —— 那是此前 CLS 的来源。
// 窄于 16:9 的封面由 object-fit: cover 裁切，宽于 16:9 的同理。
//
// 两档 srcset 足以覆盖实际展示宽度：hero 容器桌面约 890 CSS px、移动约 358 CSS px。
// 不引入 lightbox 档：DPR3 手机（358×3≈1074）会直接选中它，
// 反而把移动端封面体积抬上去。该档保留给灯箱查看场景。
//
// 描述符必须与 nuxt-admin/server/routes/images/[...path].get.ts 的
// THUMBNAIL_VARIANTS 保持同步，否则浏览器会按错误密度选档。
const COVER_SIZES = '(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 890px'
const CARD_WIDTH = 720
const GRID_WIDTH = 1024

const thumbUrl = (variant, publicId) => `/images/thumb/${variant}/${encodeURIComponent(publicId)}.webp`

const imageLoaded = ref(false)
const imageErrored = ref(false)

// 资产 publicId：优先取显式字段，缺失时从 thumbnailUrl / coverImageUrl 反解。
// 只对同源 /images/ 路径反解，外链（如图床直链）不做处理。
const coverAssetPublicId = computed(() => {
  const direct = props.article?.coverImageAssetPublicId
  if (direct) return String(direct)

  const candidate = String(props.article?.thumbnailUrl || props.article?.coverImageUrl || '')
  const matched = candidate.match(/^\/images\/(?:thumb\/(?:card|grid|lightbox)\/)?([^/?]+?)(?:\.webp)?$/)
  return matched ? matched[1] : ''
})

// 有 publicId → 走按展示尺寸的缩略图变体（同源、无 302、体积可控）；
// 否则退回原有的 thumbnailUrl → coverImageUrl → coverImage 顺序。
const coverSrc = computed(() => {
  const publicId = coverAssetPublicId.value
  if (publicId) return thumbUrl('grid', publicId)

  const thumbnailUrl = props.article?.thumbnailUrl
  const native = props.article?.coverImageUrl
  const coverImage = props.article?.coverImage
  return thumbnailUrl || native || (coverImage && coverImage !== 'null' ? coverImage : '')
})

const coverSrcset = computed(() => {
  const publicId = coverAssetPublicId.value
  if (!publicId) return undefined
  return [
    thumbUrl('card', publicId) + ` ${CARD_WIDTH}w`,
    thumbUrl('grid', publicId) + ` ${GRID_WIDTH}w`
  ].join(', ')
})

const hasCoverImage = computed(() => Boolean(coverSrc.value && !imageErrored.value))

function handleImageLoad() {
  imageLoaded.value = true
}

function handleImageError() {
  imageErrored.value = true
  imageLoaded.value = true
}

// 与 ArticleCard.vue 相同的「加载状态对账」：命中缓存的封面可能在 hydration
// 之前就 load 完了，此时 @load 不会再触发，占位层会一直盖在封面上。
// 挂载后主动对一次账；同一组件实例被复用（文章间切换）时先重置再对账。
// 这里只同步加载状态，不再回写容器宽高比 —— 那是此前 CLS 的来源。
const coverImageEl = ref(null)

function syncCoverLoadState() {
  const image = coverImageEl.value
  if (!image || !image.complete) return

  if (image.naturalWidth > 0) {
    imageLoaded.value = true
    imageErrored.value = false
    return
  }

  imageErrored.value = true
  imageLoaded.value = true
}

watch(
  () => coverSrc.value,
  () => {
    imageLoaded.value = false
    imageErrored.value = false
    nextTick(syncCoverLoadState)
  }
)

onMounted(() => {
  nextTick(syncCoverLoadState)
})
</script>

<style scoped>
.article-cover {
  aspect-ratio: 16 / 9;
}
</style>

<script setup lang="ts">
import { ARTWORK_RATIO, steamArtworkChain, steamArtworkSrcset, type SteamArtworkVariant } from '../utils/steam-artwork'

/**
 * 封面图。优先按 appid 取该档位能拿到的最大素材，失败时按链路降级
 * （poster2x → poster → capsule → header → 首字母），避免相机位大小的缩略图。
 */
const props = withDefaults(defineProps<{
  appid?: number | null
  src?: string | null
  alt: string
  variant?: SteamArtworkVariant
  /** 覆盖默认宽高比，例如 '16 / 9'；不传则跟随 variant。 */
  ratio?: string
  letter?: string
  eager?: boolean
}>(), {
  appid: null,
  src: null,
  variant: 'header',
  ratio: '',
  letter: '',
  eager: false
})

const candidates = computed(() => {
  const list = steamArtworkChain(props.appid, props.variant)
  // 数据库里的 headerUrl 可能是带 `?t=` 的 akamai 变体，作为最后一档兜底。
  if (props.src && !list.includes(props.src)) list.push(props.src)
  return list
})

const index = ref(0)
const current = computed(() => candidates.value[index.value] ?? null)
const initial = computed(() => (props.letter || props.alt || '?').trim().charAt(0).toUpperCase())
const srcset = computed(() => steamArtworkSrcset(props.appid, props.variant))
const sizes = computed(() => (srcset.value ? '(max-width: 576px) 45vw, 320px' : undefined))
const frameStyle = computed(() => ({ aspectRatio: props.ratio || ARTWORK_RATIO[props.variant] }))

watch(() => [props.appid, props.src, props.variant], () => { index.value = 0 })

function onError() {
  if (index.value < candidates.value.length) index.value += 1
}
</script>

<template>
  <div class="sg-cover" :style="frameStyle">
    <img
      v-if="current"
      :src="current"
      :srcset="srcset || undefined"
      :sizes="sizes"
      :alt="alt"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : undefined"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="onError"
    >
    <span v-else class="sg-cover__fallback" aria-hidden="true">{{ initial }}</span>
  </div>
</template>

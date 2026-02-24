/**
 * 画廊 Slider 管理函数
 */

import { nextTick, type Ref } from 'vue'

type SliderLike = {
  initSlider?: () => Promise<void> | void
  destroySlider?: () => void
}

type LayoutLike = {
  initLayout?: () => Promise<void> | void
  destroyLayout?: () => void
}

type GalleryRefs = {
  fadeSlideshowRef?: Ref<SliderLike | null>
  accordionGalleryRef?: Ref<SliderLike | null>
  coverflowGalleryRef?: Ref<SliderLike | null>
  masonryWaterfallRef?: Ref<LayoutLike | null>
}

export async function initSliders(
  refs: GalleryRefs,
  activeTag: string,
  artworkCount: number,
  isInitialLoading: boolean
): Promise<void> {
  // 等待当前 DOM 更新完成，确保子组件 ref 已就绪。
  await nextTick()

  if (activeTag === 'artwork' && artworkCount > 0 && !isInitialLoading) {
    // 分阶段延迟初始化：先淡入轮播，再初始化其余组件，降低首帧抖动。
    requestAnimationFrame(() => {
      setTimeout(async () => {
        if (refs.fadeSlideshowRef?.value?.initSlider) {
          await refs.fadeSlideshowRef.value.initSlider()
        }

        setTimeout(async () => {
          if (refs.accordionGalleryRef?.value?.initSlider) {
            await refs.accordionGalleryRef.value.initSlider()
          }
          if (refs.coverflowGalleryRef?.value?.initSlider) {
            await refs.coverflowGalleryRef.value.initSlider()
          }
          if (refs.masonryWaterfallRef?.value?.initLayout) {
            await refs.masonryWaterfallRef.value.initLayout()
          }
        }, 200)
      }, 150)
    })
  }
}

export function destroySliders(refs: GalleryRefs): void {
  // 页面切换或组件卸载时主动销毁，避免残留事件与定时器。
  refs.fadeSlideshowRef?.value?.destroySlider?.()
  refs.accordionGalleryRef?.value?.destroySlider?.()
  refs.coverflowGalleryRef?.value?.destroySlider?.()
  refs.masonryWaterfallRef?.value?.destroyLayout?.()
}

export function getGallerySlice<T>(allGalleries: T[], start: number, end: number): T[] {
  if (allGalleries.length === 0) return []

  const result: T[] = []
  for (let i = start; i < end; i++) {
    // 通过取模实现循环窗口，支持无限轮播数据视图。
    const index = i % allGalleries.length
    const current = allGalleries[index]
    if (current !== undefined) {
      result.push(current)
    }
  }
  return result
}

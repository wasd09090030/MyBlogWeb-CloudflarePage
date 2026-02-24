/**
 * 画廊工具函数
 */

type GalleryWindow = Window & {
  __galleryOriginalOverflow?: string
}

export function normalizeTag(tag: unknown): string {
  if (!tag) return 'artwork'
  return String(tag).trim().toLowerCase()
}

export const bodyScrollManager = {
  disable(): void {
    if (!import.meta.client) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const galleryWindow = window as GalleryWindow
    if (!galleryWindow.__galleryOriginalOverflow) {
      galleryWindow.__galleryOriginalOverflow = originalOverflow || ''
    }
  },

  restore(): void {
    if (!import.meta.client) return

    const galleryWindow = window as GalleryWindow
    document.body.style.overflow = galleryWindow.__galleryOriginalOverflow || ''

    if (!galleryWindow.__galleryOriginalOverflow) {
      document.body.style.removeProperty('overflow')
    }
    delete galleryWindow.__galleryOriginalOverflow
  }
}
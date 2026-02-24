/**
 * 教程页面的导航和交互函数
 */

import { nextTick, type Ref } from 'vue'

export function scrollToListTop(containerRef: Ref<HTMLElement | null>, offset = 100): void {
  nextTick(() => {
    const element = containerRef.value
    if (!element) return
    if (typeof window === 'undefined') return

    window.scrollTo({
      top: element.offsetTop - offset,
      behavior: 'smooth'
    })
  })
}

export function handleImageError(event: Event): void {
  const target = event.target as HTMLImageElement | null
  if (!target) return

  target.style.display = 'none'
  target.parentElement?.classList.add('image-error-fallback')
}

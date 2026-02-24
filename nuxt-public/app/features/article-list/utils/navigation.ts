/**
 * 导航和滚动相关函数
 */

import { nextTick, type Ref } from 'vue'

type TimerRef = {
  timer: ReturnType<typeof setTimeout> | null
}

/**
 * 滚动到列表顶部
 */
export function scrollToListTop(containerRef: Ref<HTMLElement | null>): void {
  nextTick(() => {
    const element = containerRef.value
    if (!element) return

    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

/**
 * 更新页面状态（页码切换）
 */
export function updatePageState(
  targetPage: number,
  totalRef: Ref<number>,
  pageRef: Ref<number>,
  containerRef: Ref<HTMLElement | null> | null = null
): void {
  if (targetPage >= 1 && targetPage <= totalRef.value) {
    pageRef.value = targetPage
    if (containerRef) {
      scrollToListTop(containerRef)
    }
  }
}

/**
 * 触发视图切换动画
 */
export function triggerViewSwitchAnimation(
  isSwitchingRef: Ref<boolean>,
  timerRef: TimerRef,
  duration = 480
): void {
  isSwitchingRef.value = true
  if (timerRef.timer) {
    clearTimeout(timerRef.timer)
  }
  timerRef.timer = setTimeout(() => {
    isSwitchingRef.value = false
    timerRef.timer = null
  }, duration)
}
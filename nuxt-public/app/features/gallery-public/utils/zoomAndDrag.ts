/**
 * 画廊全屏查看的缩放和拖拽功能
 */

import { ref, type Ref } from 'vue'

type Position = {
  x: number
  y: number
}

type MouseOrTouchEvent = MouseEvent | TouchEvent

// 统一鼠标/触摸坐标读取，减少分支重复。
function getClientPoint(event: MouseOrTouchEvent): Position {
  if ('touches' in event) {
    const touch = event.touches[0]
    return {
      x: touch?.clientX ?? 0,
      y: touch?.clientY ?? 0
    }
  }

  return {
    x: event.clientX,
    y: event.clientY
  }
}

export function zoomIn(imageScaleRef: Ref<number>, maxScale = 3, step = 0.25): void {
  if (imageScaleRef.value < maxScale) {
    imageScaleRef.value = Math.min(maxScale, imageScaleRef.value + step)
  }
}

export function zoomOut(
  imageScaleRef: Ref<number>,
  imagePositionRef: Ref<Position>,
  minScale = 0.5,
  step = 0.25
): void {
  if (imageScaleRef.value > minScale) {
    imageScaleRef.value = Math.max(minScale, imageScaleRef.value - step)
    if (imageScaleRef.value <= 1) {
      imagePositionRef.value = { x: 0, y: 0 }
    }
  }
}

export function resetZoom(imageScaleRef: Ref<number>, imagePositionRef: Ref<Position>): void {
  imageScaleRef.value = 1
  imagePositionRef.value = { x: 0, y: 0 }
}

export function handleWheel(
  event: WheelEvent,
  imageScaleRef: Ref<number>,
  imagePositionRef: Ref<Position>,
  minScale = 0.5,
  maxScale = 3,
  step = 0.1
): void {
  // 约定：滚轮向上放大、向下缩小，因此 deltaY 与缩放增量方向相反。
  const delta = event.deltaY > 0 ? -step : step
  const newScale = Math.max(minScale, Math.min(maxScale, imageScaleRef.value + delta))
  imageScaleRef.value = newScale

  if (newScale <= 1) {
    imagePositionRef.value = { x: 0, y: 0 }
  }
}

export function createDragHandler() {
  const isDragging = ref(false)
  const dragStart = ref<Position>({ x: 0, y: 0 })
  const lastPosition = ref<Position>({ x: 0, y: 0 })

  const startDrag = (
    event: MouseOrTouchEvent,
    imageScaleRef: Ref<number>,
    imagePositionRef: Ref<Position>
  ) => {
    // 缩放 <= 1 时图片处于基准态，不允许拖拽以避免“空拖”偏移。
    if (imageScaleRef.value <= 1) return

    isDragging.value = true
    dragStart.value = getClientPoint(event)
    lastPosition.value = { ...imagePositionRef.value }

    const onDrag = (movingEvent: MouseOrTouchEvent) => {
      if (!isDragging.value) return

      const point = getClientPoint(movingEvent)
      const deltaX = point.x - dragStart.value.x
      const deltaY = point.y - dragStart.value.y

      imagePositionRef.value = {
        x: lastPosition.value.x + deltaX,
        y: lastPosition.value.y + deltaY
      }
    }

    const stopDrag = () => {
      isDragging.value = false
      // 拖拽结束后立即解绑监听，避免组件多次打开后监听器累积。
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', stopDrag)
    }

    const onMouseMove = (moveEvent: MouseEvent) => onDrag(moveEvent)
    const onTouchMove = (moveEvent: TouchEvent) => onDrag(moveEvent)

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', stopDrag)
    document.addEventListener('touchmove', onTouchMove)
    document.addEventListener('touchend', stopDrag)
  }

  return {
    isDragging,
    dragStart,
    lastPosition,
    startDrag
  }
}

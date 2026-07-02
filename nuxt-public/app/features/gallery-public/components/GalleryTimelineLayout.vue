<template>
  <section class="gallery-timeline-layout">
    <nav class="gallery-timeline" aria-label="画廊月份时间线">
      <div class="gallery-timeline__rail" aria-hidden="true"></div>
      <div
        v-for="(yearGroup, yearIndex) in yearGroups"
        :key="yearGroup.year"
        class="gallery-timeline__year"
        :class="{ 'is-active': activeYear === yearGroup.year }"
      >
        <div class="gallery-timeline__year-header">
          <span class="gallery-timeline__year-label">{{ yearGroup.yearLabel }}</span>
        </div>
        <svg
          v-if="yearGroup.months.length > 0"
          class="gallery-timeline__year-ornament"
          viewBox="0 0 4 4"
          aria-hidden="true"
          focusable="false"
        >
          <rect x="0" y="0" width="2.83" height="2.83" transform="rotate(45 1.41 1.41)" />
        </svg>
        <button
          v-for="group in yearGroup.months"
          :key="group.key"
          type="button"
          class="gallery-timeline__item"
          :aria-current="activeMonthKey === group.key ? 'true' : undefined"
          :style="{ '--fill': yearGroup.peakCount > 0 ? (group.items.length / yearGroup.peakCount).toFixed(3) : '0' }"
          @click="scrollToMonth(group)"
        >
          <span class="gallery-timeline__dot"></span>
          <span class="gallery-timeline__label">
            <span class="gallery-timeline__label-text">{{ group.shortLabel }}</span>
            <span
              v-if="activeMonthKey === group.key && group.englishShort"
              class="gallery-timeline__sublabel"
              aria-hidden="true"
            >{{ group.englishShort }}</span>
          </span>
          <span class="gallery-timeline__fill-bar" aria-hidden="true"></span>
        </button>
      </div>
    </nav>

    <div class="gallery-timeline-layout__content">
      <section
        v-for="group in groups"
        :id="group.id"
        :key="group.key"
        :ref="(el) => registerMonthSection(group.key, el)"
        class="gallery-month-section"
      >
        <header
          class="gallery-month-section__header"
          v-motion
          :initial="{
            opacity: 0.001,
            clipPath: 'inset(45% 0 45% 0)'
          }"
          :visibleOnce="{
            opacity: 1,
            clipPath: 'inset(0% 0 0% 0)',
            transition: { duration: 450, ease: 'easeOut' }
          }"
        >
          <p class="gallery-month-section__eyebrow">{{ group.isFallback ? 'Archive' : 'Timeline' }}</p>
          <div class="gallery-month-section__heading-row">
            <span class="gallery-month-section__rule" aria-hidden="true"></span>
            <svg
              class="gallery-month-section__ornament"
              viewBox="0 0 8 8"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="0" y="0" width="5.66" height="5.66" transform="rotate(45 2.83 2.83)" />
            </svg>
            <h2 class="gallery-month-section__title">{{ group.label }}</h2>
            <svg
              class="gallery-month-section__ornament"
              viewBox="0 0 8 8"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="0" y="0" width="5.66" height="5.66" transform="rotate(45 2.83 2.83)" />
            </svg>
            <span class="gallery-month-section__rule" aria-hidden="true"></span>
          </div>
        </header>

        <div
          class="gallery-month-section__content"
          v-motion
          :initial="{ opacity: 0.001, y: 16 }"
          :visibleOnce="{
            opacity: 1,
            y: 0,
            transition: { duration: 280, delay: 180 }
          }"
        >
          <slot name="month" :group="group" />
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { groupGalleryByYear } from '~/features/gallery-public/utils/monthGrouping'

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
})

/** 左 rail 用：把月分组再按年聚合；首屏的 IO 只追踪月，不重复追踪年 */
const yearGroups = computed(() => groupGalleryByYear(props.groups))

const activeMonthKey = ref('')
const activeYear = ref('')
const sectionElements = new Map()
let observer = null

const registerMonthSection = (key, element) => {
  if (element) {
    sectionElements.set(key, element)
    observer?.observe(element)
    return
  }

  const previous = sectionElements.get(key)
  if (previous) observer?.unobserve(previous)
  sectionElements.delete(key)
}

const resetActiveMonth = () => {
  activeMonthKey.value = props.groups[0]?.key || ''
  activeYear.value = yearGroups.value[0]?.year || ''
}

const scrollToMonth = (group) => {
  activeMonthKey.value = group.key
  // 用月份的 key 反查所在年（避免外部依赖 group.year）
  const yearKey = typeof group.key === 'string' && group.key.includes('-')
    ? group.key.split('-')[0]
    : 'unknown'
  activeYear.value = yearKey

  const element = sectionElements.get(group.key) || document.getElementById(group.id)
  if (!element) return

  const scrollContainer = document.querySelector('.gallery-fullscreen')
  const behavior = 'auto'

  const performScroll = () => {
    const currentElement = sectionElements.get(group.key) || document.getElementById(group.id)
    if (!currentElement) return

    if (!scrollContainer) {
      currentElement.scrollIntoView({
        behavior,
        block: 'start'
      })
      return
    }

    const containerRect = scrollContainer.getBoundingClientRect()
    const elementRect = currentElement.getBoundingClientRect()
    const targetTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - 72

    scrollContainer.scrollTo({
      top: Math.max(0, targetTop),
      behavior
    })
  }

  performScroll()
  window.setTimeout(performScroll, 250)
  window.setTimeout(performScroll, 750)
}

watch(
  () => props.groups.map((group) => group.key).join('|'),
  () => {
    resetActiveMonth()
    nextTick(() => {
      if (!observer) return
      sectionElements.forEach((element) => observer.observe(element))
    })
  },
  { immediate: true }
)

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

      if (!visible?.target?.id) return

      const match = props.groups.find((group) => group.id === visible.target.id)
      if (match) {
        activeMonthKey.value = match.key
        activeYear.value = typeof match.key === 'string' && match.key.includes('-')
          ? match.key.split('-')[0]
          : 'unknown'
      }
    },
    {
      root: null,
      rootMargin: '-18% 0px -62% 0px',
      threshold: [0.1, 0.35, 0.6]
    }
  )

  sectionElements.forEach((element) => observer.observe(element))
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  sectionElements.clear()
})
</script>

<style scoped>
/* ====== Layout grid ====== */
.gallery-timeline-layout {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
  gap: clamp(1rem, 2vw, 1.75rem);
  padding: 1rem 0.75rem 2rem;
}

/* ====== Sticky left rail ====== */
.gallery-timeline {
  position: sticky;
  top: 5.25rem;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  /* max-height 与 overflow: auto 已在 gallery-timeline-editorial-minimal 中移除：
     rail 改为随页面自然流动，配合 position: sticky 保持当前月份可见 */
  padding: 0.35rem 0.25rem 0.35rem 0;
}

.gallery-timeline__rail {
  position: absolute;
  left: 0.5rem;
  top: 0.75rem;
  bottom: 0.75rem;
  width: 2px;
  background: rgba(15, 23, 42, 0.25);
  border-radius: 1px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.65);
}

/* ====== Year band (archive 2026-06-27 杂志感目录) ====== */
.gallery-timeline__year {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  position: relative;
  padding-left: 0;
  /* 当 active 时整段加微微 "sticky 高亮" 提示 */
  transition: padding 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

.gallery-timeline__year.is-active {
  /* active 年份整段向左轻微 nudge，提示"我属于这里" */
  padding-left: 0.18rem;
}

.gallery-timeline__year-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.55rem 0.35rem 1.1rem;
  margin-bottom: 0.1rem;
  border-bottom: 1px solid transparent;
  transition: border-color 220ms ease, color 220ms ease;
}

.gallery-timeline__year.is-active .gallery-timeline__year-header {
  border-bottom-color: var(--color-editorial-rule, rgba(15, 23, 42, 0.22));
}

.gallery-timeline__year-label {
  font-family: 'Playfair Display', 'Source Serif Pro', Georgia, serif;
  font-size: clamp(1.1rem, 1.4vw, 1.35rem);
  font-weight: 700;
  font-style: italic;
  color: rgba(15, 23, 42, 0.62);
  letter-spacing: 0.04em;
  line-height: 1.05;
  white-space: nowrap;
  transition: color 220ms ease;
}

.gallery-timeline__year.is-active .gallery-timeline__year-label {
  color: rgba(15, 23, 42, 0.92);
}

/* gallery-timeline-editorial-minimal · 已移除 .gallery-timeline__year-count（原数字埋点） */

.gallery-timeline__item {
  appearance: none;
  position: relative;
  display: grid;
  grid-template-columns: 1rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.35rem;
  padding: 0.35rem 0.55rem 0.35rem 0.08rem;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(15, 23, 42, 0.68);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

/* 给 fill-bar 留出右侧空间（room: 32px） */
.gallery-timeline__item {
  padding-right: 36px;
}

/* 年/月两级结构：月份按钮缩进以呈现从属关系 */
.gallery-timeline__year .gallery-timeline__item {
  margin-left: 0.9rem;
  padding-left: 0.45rem;
  min-height: 2.05rem;
}

.gallery-timeline__item:hover,
.gallery-timeline__item:focus-visible,
.gallery-timeline__item[aria-current="true"] {
  background: rgba(255, 255, 255, 0.68);
  color: rgba(15, 23, 42, 0.95);
  outline: none;
}

/* 4.4 · Active 月视觉跃迁：box-shadow 模拟 2px 左边框 + 4px 右移 nudge */
.gallery-timeline__item[aria-current="true"] {
  box-shadow: inset 2px 0 0 var(--color-editorial-glow, rgba(15, 23, 42, 0.32));
  transform: translateX(4px);
  transition: background 0.2s ease, color 0.2s ease, box-shadow 220ms ease-out, transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* gallery-timeline-editorial-minimal · Active 月从主 rail 伸出的短引出线（::before）
   用伪元素模拟以避免 layout 抖动；与现有 inset box-shadow 并存不冲突 */
.gallery-timeline__item[aria-current="true"]::before {
  content: '';
  position: absolute;
  left: -0.45rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.4rem;
  height: 2px;
  background: var(--color-editorial-glow, rgba(15, 23, 42, 0.32));
  border-radius: 999px;
  z-index: 1;
}

.gallery-timeline__item[aria-current="true"] .gallery-timeline__label {
  font-weight: 800;
}

/* 4.5 · Active 月 fill-bar: accent 色 + glow + 加厚 */
.gallery-timeline__item[aria-current="true"] .gallery-timeline__fill-bar {
  height: 3px;
  background: var(--color-editorial-glow, rgba(15, 23, 42, 0.32));
  box-shadow: 0 0 6px var(--color-editorial-glow, rgba(15, 23, 42, 0.32));
}

/* Editorial dot: 6→10px scale + glow on active */
.gallery-timeline__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.28);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.66);
  z-index: 1;
  transition:
    width 220ms cubic-bezier(0.4, 0, 0.2, 1),
    height 220ms cubic-bezier(0.4, 0, 0.2, 1),
    background 220ms ease,
    box-shadow 220ms ease-out;
}

.gallery-timeline__item[aria-current="true"] .gallery-timeline__dot {
  width: 0.7rem;
  height: 0.7rem;
  background: rgba(15, 23, 42, 0.92);
  box-shadow:
    0 0 0 4px var(--color-editorial-ring, rgba(15, 23, 42, 0.08)),
    0 0 14px var(--color-editorial-glow, rgba(15, 23, 42, 0.32));
}

.gallery-timeline__label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  font-family: 'Playfair Display', 'Source Serif Pro', Georgia, serif;
  font-size: clamp(0.95rem, 1.1vw, 1.1rem);
  font-style: italic;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  line-height: 1.1;
}

.gallery-timeline__label-text {
  display: block;
}

.gallery-timeline__sublabel {
  display: block;
  margin-top: 1px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-style: normal;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.45);
}

/* Fill-bar: 显示当月图数占年内峰值比例 */
.gallery-timeline__fill-bar {
  position: absolute;
  right: 0.6rem;
  bottom: 0.5rem;
  width: calc(var(--fill, 0) * 22px);
  max-width: 22px;
  height: 2px;
  background: var(--color-rail-fill-bar, rgba(15, 23, 42, 0.18));
  border-radius: 999px;
  transition: width 220ms ease-out, background 220ms ease, height 220ms ease, box-shadow 220ms ease-out;
  pointer-events: none;
}

/* Hover chip 已全部移除（gallery-timeline-editorial-minimal）：
   见 design.md D1 与 proposal.md "What Changes"。
   原 .gallery-timeline__hover-chip + @media (hover: hover) 包裹 + 暗色覆盖 + 移动端 display: none 全部删除 */

/* Year ornament: 4×4 菱形，置于年份 header 与首月行之间 */
.gallery-timeline__year-ornament {
  width: 4px;
  height: 4px;
  margin: 0.15rem 0 0.05rem 0.55rem;
  color: var(--color-editorial-ornament, rgba(15, 23, 42, 0.55));
  fill: currentColor;
  opacity: 0.9;
  align-self: flex-start;
}

/* gallery-timeline-editorial-minimal · 已移除 .gallery-timeline__count 与 .gallery-timeline__hover-chip
   （原数字埋点） */

.gallery-timeline-layout__content {
  min-width: 0;
}

/* ====== Month section ====== */
.gallery-month-section {
  scroll-margin-top: 5rem;
  margin-bottom: 1.8rem;
}

/* ====== Editorial timeline header ====== */
.gallery-month-section__header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: stretch;
  padding: 0.5rem 0.5rem 0.85rem;
}

.gallery-month-section__eyebrow {
  margin: 0;
  color: rgba(15, 23, 42, 0.5);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.gallery-month-section__heading-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.gallery-month-section__rule {
  flex: 1 1 60px;
  height: 1px;
  min-width: 30px;
  max-width: 120px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--color-editorial-rule, rgba(15, 23, 42, 0.22)) 50%,
    transparent 100%
  );
  align-self: center;
}

.gallery-month-section__ornament {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  color: var(--color-editorial-ornament, rgba(15, 23, 42, 0.55));
  fill: currentColor;
  opacity: 0.95;
}

.gallery-month-section__title {
  margin: 0;
  color: rgba(15, 23, 42, 0.92);
  font-family: 'Playfair Display', 'Source Serif Pro', Georgia, serif;
  font-size: clamp(1.5rem, 2.4vw, 2.1rem);
  font-weight: 700;
  font-style: italic;
  letter-spacing: 0.01em;
  line-height: 1.1;
  white-space: nowrap;
}

.gallery-month-section__content {
  min-width: 0;
}

/* gallery-timeline-editorial-minimal · 已移除 .gallery-month-section__count（原数字埋点） */

/* ====== Dark theme overrides ====== */
:global(.dark-theme) .gallery-timeline__rail {
  background: rgba(226, 232, 240, 0.32);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.45);
}

:global(.dark-theme) .gallery-timeline__year-label {
  color: rgba(226, 232, 240, 0.55);
}

:global(.dark-theme) .gallery-timeline__year.is-active .gallery-timeline__year-label {
  color: rgba(248, 250, 252, 0.92);
}

:global(.dark-theme) .gallery-timeline__item {
  color: rgba(226, 232, 240, 0.68);
}

:global(.dark-theme) .gallery-timeline__item:hover,
:global(.dark-theme) .gallery-timeline__item:focus-visible,
:global(.dark-theme) .gallery-timeline__item[aria-current="true"] {
  background: rgba(15, 23, 42, 0.62);
  color: rgba(248, 250, 252, 0.95);
}

:global(.dark-theme) .gallery-timeline__dot {
  background: rgba(226, 232, 240, 0.34);
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.66);
}

:global(.dark-theme) .gallery-timeline__item[aria-current="true"] .gallery-timeline__dot {
  background: rgba(248, 250, 252, 0.92);
}

/* 4.10 · 暗色主题：sublabel、fill-bar 暗色覆盖 */
:global(.dark-theme) .gallery-timeline__sublabel {
  color: rgba(226, 232, 240, 0.5);
}

:global(.dark-theme) .gallery-timeline__item[aria-current="true"] {
  box-shadow: inset 2px 0 0 var(--color-editorial-glow, rgba(226, 232, 240, 0.45));
}

/* gallery-timeline-editorial-minimal · Active 月 ::before 引出线暗色覆盖 */
:global(.dark-theme) .gallery-timeline__item[aria-current="true"]::before {
  background: var(--color-editorial-glow, rgba(226, 232, 240, 0.45));
}

:global(.dark-theme) .gallery-timeline__item[aria-current="true"] .gallery-timeline__fill-bar {
  background: var(--color-editorial-glow, rgba(226, 232, 240, 0.45));
  box-shadow: 0 0 6px var(--color-editorial-glow, rgba(226, 232, 240, 0.45));
}

:global(.dark-theme) .gallery-month-section__eyebrow {
  color: rgba(226, 232, 240, 0.55);
}

:global(.dark-theme) .gallery-month-section__title {
  color: rgba(248, 250, 252, 0.95);
}

/* ====== Mobile (≤1024px) - rail collapses to horizontal ====== */
@media (max-width: 1024px) {
  .gallery-timeline-layout {
    display: block;
    padding: 0.75rem 0.25rem 1.5rem;
  }

  .gallery-timeline {
    position: sticky;
    top: 0;
    z-index: 30;
    flex-direction: row;
    gap: 0.45rem;
    max-height: none;
    /* gallery-timeline-editorial-minimal：移除 overflow-x: auto，
       改用 flex-wrap 让月份 chip 自动换行，避免移动端出现横向滚动条 */
    flex-wrap: wrap;
    align-content: flex-start;
    padding: 0.65rem 0.25rem;
    margin: 0 0 0.75rem;
    background: linear-gradient(180deg, rgba(245, 247, 250, 0.96), rgba(245, 247, 250, 0.76));
    backdrop-filter: blur(12px);
  }

  .gallery-timeline__rail {
    /* gallery-timeline-editorial-minimal：取消 display: none，
       改为贴在 rail 容器底部的横向 1px 渐变尾线，替代桌面 2px 竖向引导线 */
    display: block;
    top: auto;
    bottom: 0;
    left: 0.25rem;
    right: 0.25rem;
    width: auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(15, 23, 42, 0.25) 0%,
      rgba(15, 23, 42, 0.05) 100%
    );
    box-shadow: none;
  }

  /* 移动端：年份作为横向 chip 头，月份在其下横排 */
  .gallery-timeline__year {
    flex-direction: column;
    flex: 0 0 auto;
    min-width: max-content;
    padding-left: 0;
  }

  .gallery-timeline__year.is-active {
    padding-left: 0;
  }

  .gallery-timeline__year-header {
    padding: 0.35rem 0.65rem 0.25rem;
    margin-bottom: 0.1rem;
    border-bottom: none;
  }

  .gallery-timeline__year-label {
    font-size: 0.95rem;
  }

  .gallery-timeline__year.is-active .gallery-timeline__year-header {
    border-bottom-color: transparent;
  }

  .gallery-timeline__year .gallery-timeline__item {
    margin-left: 0;
    padding: 0.4rem 0.55rem;
    min-width: max-content;
  }

  .gallery-month-section__title {
    font-size: clamp(1.35rem, 5.4vw, 1.85rem);
    white-space: normal;
  }

  .gallery-month-section__rule {
    flex: 1 1 18px;
    min-width: 18px;
    max-width: 32px;
  }

  .gallery-month-section__ornament {
    width: 6px;
    height: 6px;
  }

  .gallery-month-section__heading-row {
    flex-wrap: nowrap;
    gap: 0.45rem;
  }
}

/* 4.11 · 移动端（≤1024px）补充：fill-bar 缩略、hover chip 隐藏、sublabel 字号缩小 */
@media (max-width: 1024px) {
  .gallery-timeline__item {
    padding-right: 28px;
  }

  .gallery-timeline__fill-bar {
    max-width: 16px;
    right: 0.4rem;
  }

  .gallery-timeline__sublabel {
    font-size: 0.55rem;
  }
  /* gallery-timeline-editorial-minimal · 已移除移动端 .gallery-timeline__hover-chip { display: none }
     （原 hover-chip 已整段删除） */
}

@media (max-width: 1024px) {
  :global(.dark-theme) .gallery-timeline {
    background: linear-gradient(180deg, rgba(26, 32, 44, 0.96), rgba(26, 32, 44, 0.74));
  }

  :global(.dark-theme) .gallery-timeline__item {
    border-color: rgba(226, 232, 240, 0.12);
    background: rgba(15, 23, 42, 0.48);
  }
}

/* ====== Reduced motion: instant everything, no glow, no reveal ====== */
@media (prefers-reduced-motion: reduce) {
  .gallery-timeline__item,
  .gallery-timeline__item .gallery-timeline__dot,
  .gallery-timeline__item .gallery-timeline__fill-bar {
    transition: none !important;
  }

  /* 4.12 · reduced-motion: active 月的 transform 与 nudge 即时生效 */
  .gallery-timeline__item[aria-current="true"] {
    transform: none;
    box-shadow: none;
  }

  .gallery-timeline__item[aria-current="true"]::before {
    /* 伪元素无 transition，但保险起见加 transform: none */
    transform: translateY(-50%);
  }

  .gallery-timeline__item[aria-current="true"] .gallery-timeline__dot {
    box-shadow: none;
  }

  /* gallery-timeline-editorial-minimal · 已移除 .gallery-timeline__hover-chip reduced-motion 段 */

  .gallery-month-section__header,
  .gallery-month-section__content {
    opacity: 1 !important;
    clip-path: none !important;
    transform: none !important;
  }
}
</style>

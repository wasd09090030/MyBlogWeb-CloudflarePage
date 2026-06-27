<template>
  <section class="gallery-timeline-layout">
    <nav class="gallery-timeline" aria-label="画廊月份时间线">
      <div class="gallery-timeline__rail" aria-hidden="true"></div>
      <button
        v-for="group in groups"
        :key="group.key"
        type="button"
        class="gallery-timeline__item"
        :aria-current="activeMonthKey === group.key ? 'true' : undefined"
        @click="scrollToMonth(group)"
      >
        <span class="gallery-timeline__dot"></span>
        <span class="gallery-timeline__label">{{ group.shortLabel }}</span>
        <span class="gallery-timeline__count">{{ group.items.length }}</span>
      </button>
    </nav>

    <div class="gallery-timeline-layout__content">
      <section
        v-for="group in groups"
        :id="group.id"
        :key="group.key"
        :ref="(el) => registerMonthSection(group.key, el)"
        class="gallery-month-section"
      >
        <header class="gallery-month-section__header">
          <p class="gallery-month-section__eyebrow">{{ group.isFallback ? 'Archive' : 'Timeline' }}</p>
          <h2 class="gallery-month-section__title">{{ group.label }}</h2>
          <span class="gallery-month-section__count">{{ group.items.length }} 张</span>
        </header>

        <slot name="month" :group="group" />
      </section>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
})

const activeMonthKey = ref('')
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
}

const scrollToMonth = (group) => {
  activeMonthKey.value = group.key

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
      if (match) activeMonthKey.value = match.key
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
.gallery-timeline-layout {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
  gap: clamp(1rem, 2vw, 1.75rem);
  padding: 1rem 0.75rem 2rem;
}

.gallery-timeline {
  position: sticky;
  top: 5.25rem;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-height: calc(100vh - 6rem);
  overflow: auto;
  padding: 0.35rem 0.25rem 0.35rem 0;
}

.gallery-timeline__rail {
  position: absolute;
  left: 0.55rem;
  top: 0.75rem;
  bottom: 0.75rem;
  width: 1px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.04));
}

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

.gallery-timeline__item:hover,
.gallery-timeline__item:focus-visible,
.gallery-timeline__item[aria-current="true"] {
  background: rgba(255, 255, 255, 0.68);
  color: rgba(15, 23, 42, 0.95);
  outline: none;
}

.gallery-timeline__dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.28);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.66);
  z-index: 1;
}

.gallery-timeline__item[aria-current="true"] .gallery-timeline__dot {
  background: rgba(15, 23, 42, 0.92);
}

.gallery-timeline__label {
  min-width: 0;
  font-size: 0.86rem;
  font-weight: 700;
  white-space: nowrap;
}

.gallery-timeline__count {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.46);
}

.gallery-timeline-layout__content {
  min-width: 0;
}

.gallery-month-section {
  scroll-margin-top: 5rem;
  margin-bottom: 1.6rem;
}

.gallery-month-section__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.25rem 1rem;
  align-items: end;
  padding: 0.25rem 0.5rem 0.75rem;
}

.gallery-month-section__eyebrow {
  grid-column: 1 / -1;
  margin: 0;
  color: rgba(15, 23, 42, 0.46);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.gallery-month-section__title {
  margin: 0;
  color: rgba(15, 23, 42, 0.9);
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  font-weight: 800;
  letter-spacing: 0;
}

.gallery-month-section__count {
  color: rgba(15, 23, 42, 0.52);
  font-size: 0.85rem;
  font-weight: 700;
  white-space: nowrap;
}

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
    overflow-x: auto;
    padding: 0.65rem 0.25rem;
    margin: 0 0 0.75rem;
    background: linear-gradient(180deg, rgba(245, 247, 250, 0.96), rgba(245, 247, 250, 0.76));
    backdrop-filter: blur(12px);
  }

  .gallery-timeline__rail,
  .gallery-timeline__dot {
    display: none;
  }

  .gallery-timeline__item {
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: max-content;
    padding: 0.48rem 0.72rem;
    border: 1px solid rgba(15, 23, 42, 0.1);
    background: rgba(255, 255, 255, 0.58);
  }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-timeline__item {
    transition: none !important;
  }
}

:global(.dark-theme) .gallery-timeline__rail {
  background: linear-gradient(180deg, rgba(226, 232, 240, 0.2), rgba(226, 232, 240, 0.05));
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

:global(.dark-theme) .gallery-timeline__count,
:global(.dark-theme) .gallery-month-section__count,
:global(.dark-theme) .gallery-month-section__eyebrow {
  color: rgba(226, 232, 240, 0.55);
}

:global(.dark-theme) .gallery-month-section__title {
  color: rgba(248, 250, 252, 0.92);
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
</style>

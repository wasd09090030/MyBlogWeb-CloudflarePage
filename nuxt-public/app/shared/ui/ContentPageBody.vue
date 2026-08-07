<template>
  <UPageBody :as="as" :class="bodyClasses">
    <slot />
  </UPageBody>
</template>

<script setup>
const props = defineProps({
  as: {
    type: String,
    default: 'div'
  },
  width: {
    type: String,
    default: 'content',
    validator: value => ['narrow', 'article', 'articleDetail', 'content', 'wide', 'full'].includes(value)
  },
  spacing: {
    type: String,
    default: 'none',
    validator: value => ['none', 'compact', 'normal'].includes(value)
  },
  padded: {
    type: Boolean,
    default: true
  },
  vertical: {
    type: String,
    default: 'none',
    validator: value => ['none', 'content', 'page'].includes(value)
  }
})

const widthClasses = {
  narrow: 'mx-auto w-full max-w-3xl',
  article: 'mx-auto w-full max-w-4xl',
  articleDetail: 'mx-auto w-full max-w-5xl',
  content: 'mx-auto w-full max-w-5xl',
  wide: 'mx-auto w-full max-w-6xl',
  full: 'w-full max-w-none'
}

const spacingClasses = {
  none: 'mt-0 pb-0 space-y-0',
  compact: 'mt-0 pb-0 space-y-6',
  normal: 'mt-0 pb-0 space-y-8'
}

const verticalClasses = {
  none: '',
  content: 'py-6 lg:py-10',
  page: 'py-8 lg:py-12'
}

const bodyClasses = computed(() => [
  widthClasses[props.width],
  spacingClasses[props.spacing],
  props.padded ? 'px-4 sm:px-6 lg:px-8' : '',
  verticalClasses[props.vertical]
].filter(Boolean))
</script>

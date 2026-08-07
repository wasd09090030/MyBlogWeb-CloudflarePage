<script setup lang="ts">
import MdcImageComparison from '~/components/mdc/MdcImageComparison.vue'
import MdcImageEnhanced from '~/components/mdc/MdcImageEnhanced.vue'
import MdcCodePlayground from '~/components/mdc/MdcCodePlayground.vue'
import MdcCollapse from '~/components/mdc/MdcCollapse.vue'
import MdcPreviewCard from '~/components/mdc/MdcPreviewCard.vue'
import MdcPreviewContainer from '~/components/mdc/MdcPreviewContainer.vue'
import MdcSpoiler from '~/components/mdc/MdcSpoiler.vue'
import MdcStarRating from '~/components/mdc/MdcStarRating.vue'
import MdcSteps from '~/components/mdc/MdcSteps.vue'
import MdcTabs from '~/components/mdc/MdcTabs.vue'
import MdcWebEmbed from '~/components/mdc/MdcWebEmbed.vue'

const props = defineProps<{ markdown: string }>()
const previewError = ref('')
const previewComponents = {
  'alert': MdcPreviewContainer,
  'collapse': MdcCollapse,
  'spoiler': MdcSpoiler,
  'steps': MdcSteps,
  'tabs': MdcTabs,
  'type-writer': MdcPreviewContainer,
  'code-playground': MdcCodePlayground,
  'image-enhanced': MdcImageEnhanced,
  'image-comparison': MdcImageComparison,
  'github-card': MdcPreviewCard,
  'link-card': MdcPreviewCard,
  'related-articles': MdcPreviewCard,
  'star-rating': MdcStarRating,
  'web-embed': MdcWebEmbed
}
watch(() => props.markdown, () => { previewError.value = '' })
</script>

<template>
  <section class="admin-markdown-preview min-h-[32rem] rounded-md border border-default p-5">
    <UAlert v-if="previewError" color="warning" variant="soft" :title="previewError" class="mb-4" />
    <ClientOnly fallback-tag="div" fallback="Loading preview...">
      <MDCCached :value="markdown" :components="previewComponents" tag="article" class="article-prose article-prose--admin" @error="previewError = 'Markdown preview could not be rendered.'" />
    </ClientOnly>
  </section>
</template>

<template>
  <div class="skeleton-loader">
    <div v-for="index in count" :key="index" class="skeleton-item">
      <div class="skeleton-card">
        <div class="skeleton-image"></div>

        <div class="skeleton-content">
          <div class="skeleton-title"></div>

          <div class="skeleton-meta">
            <div class="skeleton-date"></div>
            <div class="skeleton-category"></div>
          </div>

          <div class="skeleton-text">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line short"></div>
          </div>

          <div class="skeleton-button"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: {
    type: Number,
    default: 3
  }
})
</script>

<style scoped>
@import '~/assets/css/components/SkeletonLoader.desktop.css';
@import '~/assets/css/components/SkeletonLoader.mobile.css';
</style>

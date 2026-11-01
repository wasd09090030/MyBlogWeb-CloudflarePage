<script setup lang="ts">
// 骨架高度贴近最终布局，避免数据到达时产生可见位移。
</script>

<template>
  <div class="sg-skel-page" aria-hidden="true">
    <div class="sg-rail sg-skel-rail">
      <div class="sg-skel" style="width: 46px; height: 46px; border-radius: 13px" />
      <div class="sg-skel" style="width: 132px; height: 18px" />
      <div class="sg-skel" style="flex: 1; height: 34px; margin-left: auto; max-width: 420px" />
    </div>

    <div class="sg-skel-hero">
      <div class="sg-skel" style="width: 220px; height: 12px" />
      <div class="sg-skel" style="width: min(460px, 70%); height: 44px; margin-top: 18px" />
      <div class="sg-skel" style="width: min(320px, 60%); height: 14px; margin-top: 14px" />
      <div class="sg-skel" style="width: min(520px, 100%); aspect-ratio: 616 / 353; margin-top: 26px; border-radius: 18px" />
      <div class="sg-skel" style="width: 70%; height: 26px; margin-top: 40px" />
    </div>

    <div class="sg-skel-block">
      <div class="sg-skel" style="width: 120px; height: 14px" />
      <div class="sg-skel" style="height: 220px; margin-top: 18px" />
    </div>

    <div class="sg-skel-block sg-skel-block--dark">
      <div class="sg-skel" style="width: 150px; height: 14px" />
      <div class="sg-skel-rail-row">
        <div v-for="index in 4" :key="index" class="sg-skel" style="height: 300px; border-radius: 18px" />
      </div>
    </div>

    <div class="sg-skel-grid">
      <div class="sg-skel" style="grid-column: span 12; height: 180px; border-radius: 18px" />
      <div class="sg-skel" style="grid-column: span 7; height: 300px; border-radius: 18px" />
      <div class="sg-skel" style="grid-column: span 5; height: 300px; border-radius: 18px" />
      <div class="sg-skel" style="grid-column: span 12; height: 200px; border-radius: 18px" />
      <div class="sg-skel" style="grid-column: span 12; height: 220px; border-radius: 18px" />
    </div>
  </div>
</template>

<template>
  <div class="gallery-atmosphere" aria-hidden="true">
    <svg class="gallery-atmosphere__svg" viewBox="0 0 1440 820" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gallery-ribbon-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="var(--gallery-ribbon, #e11d48)" stop-opacity="0" />
          <stop offset="0.45" stop-color="var(--gallery-ribbon, #e11d48)" stop-opacity="0.75" />
          <stop offset="1" stop-color="var(--gallery-ribbon, #e11d48)" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="gallery-ribbon-b" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stop-color="var(--gallery-orbit, #fb923c)" stop-opacity="0" />
          <stop offset="0.5" stop-color="var(--gallery-orbit, #fb923c)" stop-opacity="0.6" />
          <stop offset="1" stop-color="var(--gallery-orbit, #fb923c)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <path class="gallery-atmosphere__ribbon gallery-atmosphere__ribbon--a" d="M-80 620 C 220 390, 410 760, 760 545 S 1230 300, 1520 505" stroke="url(#gallery-ribbon-a)" />
      <path class="gallery-atmosphere__ribbon gallery-atmosphere__ribbon--b" d="M-90 190 C 240 420, 500 90, 820 280 S 1190 480, 1530 205" stroke="url(#gallery-ribbon-b)" />
      <path class="gallery-atmosphere__orbit" d="M1020 96 C 1190 30, 1350 70, 1490 180" />
      <g class="gallery-atmosphere__sparkles">
        <circle cx="198" cy="188" r="2.5" />
        <circle cx="1010" cy="224" r="2" />
        <circle cx="1268" cy="112" r="3" />
        <circle cx="850" cy="640" r="2.5" />
        <circle cx="410" cy="720" r="1.8" />
      </g>
    </svg>
  </div>
</template>

<script setup>
defineOptions({ name: 'GalleryAtmosphere' })
</script>

<style scoped>
.gallery-atmosphere {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gallery-atmosphere__svg {
  width: 100%;
  height: 100%;
  display: block;
  opacity: 0.9;
}

.gallery-atmosphere__ribbon {
  fill: none;
  stroke-width: 1.5;
  stroke-dasharray: 10 20;
  animation: gallery-ribbon-drift 18s linear infinite;
}

.gallery-atmosphere__ribbon--b {
  stroke-dasharray: 4 18;
  animation-duration: 24s;
  animation-direction: reverse;
}

.gallery-atmosphere__orbit {
  fill: none;
  stroke: var(--gallery-orbit, #fb923c);
  stroke-width: 1;
  stroke-dasharray: 2 14;
  opacity: 0.45;
  animation: gallery-orbit-drift 16s ease-in-out infinite;
}

.gallery-atmosphere__sparkles circle {
  fill: var(--gallery-ribbon, #e11d48);
  opacity: 0.36;
  animation: gallery-sparkle 4.5s ease-in-out infinite;
}

.gallery-atmosphere__sparkles circle:nth-child(2n) {
  animation-delay: -1.8s;
  animation-duration: 5.5s;
}

.gallery-atmosphere__sparkles circle:nth-child(3n) {
  fill: var(--gallery-orbit, #fb923c);
  animation-delay: -3.2s;
}

@keyframes gallery-ribbon-drift {
  to { stroke-dashoffset: -360; }
}

@keyframes gallery-orbit-drift {
  0%, 100% { transform: translateX(0) translateY(0); opacity: 0.25; }
  50% { transform: translateX(-18px) translateY(8px); opacity: 0.55; }
}

@keyframes gallery-sparkle {
  0%, 100% { transform: scale(0.7); opacity: 0.18; }
  50% { transform: scale(1.25); opacity: 0.62; }
}

@media (prefers-reduced-motion: reduce) {
  .gallery-atmosphere__ribbon,
  .gallery-atmosphere__orbit,
  .gallery-atmosphere__sparkles circle {
    animation: none;
  }
}
</style>

<template>
  <svg
    class="peach-sunset-scene"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="pky-d4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffd9a8" />
        <stop offset=".45" stop-color="#ffb3c1" />
        <stop offset=".75" stop-color="#fb7185" />
        <stop offset="1" stop-color="#f43f5e" />
      </linearGradient>
      <radialGradient id="psun-d4" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff7d6" stop-opacity=".95" />
        <stop offset=".6" stop-color="#fde68a" stop-opacity=".55" />
        <stop offset="1" stop-color="#fde68a" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1200" height="300" fill="url(#pky-d4)" />
    <circle class="sun" cx="900" cy="150" r="130" fill="url(#psun-d4)" />
    <circle cx="900" cy="150" r="34" fill="#fff7d6" />
    <g class="cl" fill="#ffffff" opacity=".75">
      <ellipse cx="320" cy="86" rx="86" ry="22" />
      <ellipse cx="384" cy="74" rx="62" ry="18" />
      <ellipse cx="700" cy="120" rx="54" ry="15" opacity=".55" />
      <ellipse cx="180" cy="160" rx="46" ry="13" opacity=".45" />
    </g>
    <g stroke="#b3445c" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8">
      <path d="M520 70 q8 -8 16 0 q8 -8 16 0" />
      <path d="M566 92 q7 -7 14 0 q7 -7 14 0" />
      <path d="M480 104 q6 -6 12 0 q6 -6 12 0" />
    </g>
    <path d="M0 300 L0 240 Q140 168 300 224 Q440 272 560 228 Q700 180 830 232 Q960 280 1080 236 Q1140 214 1200 232 L1200 300 Z" fill="#fb7185" opacity=".85" />
    <path d="M0 300 L0 262 Q180 210 360 258 Q560 306 740 262 Q900 224 1080 268 Q1140 280 1200 268 L1200 300 Z" fill="#e11d48" opacity=".9" />
    <path d="M0 300 L0 282 Q240 250 480 280 Q760 308 980 280 Q1100 268 1200 282 L1200 300 Z" fill="#9f1239" />
  </svg>
</template>

<script setup>
// 蜜桃晚霞插画场景（D4 首页横幅背景）
// 纯 SVG 零外链：太阳呼吸光晕 + 云朵缓慢漂移
defineOptions({ name: 'PeachSunsetScene' })
</script>

<style scoped>
.peach-sunset-scene {
  width: 100%;
  height: 100%;
  display: block;
}

.cl {
  animation: cloud-drift 24s ease-in-out infinite alternate;
}

.sun {
  animation: sun-breathe 5.5s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes cloud-drift {
  from { transform: translateX(0); }
  to { transform: translateX(30px); }
}

@keyframes sun-breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.07); opacity: .9; }
}

@media (prefers-reduced-motion: reduce) {
  .cl,
  .sun {
    animation: none;
  }
}
</style>

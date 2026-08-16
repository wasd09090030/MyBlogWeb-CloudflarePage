<template>
  <svg
    class="peach-sunset-scene"
    viewBox="0 0 1200 300"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <!-- 白天：晚霞天空 -->
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

      <!-- 夜晚：星空天空 -->
      <linearGradient id="nky-d4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b1a3f" />
        <stop offset=".5" stop-color="#3a2450" />
        <stop offset="1" stop-color="#160d26" />
      </linearGradient>
      <radialGradient id="nmoon-d4" cx=".5" cy=".5" r=".5">
        <stop offset="0" stop-color="#fff3d6" stop-opacity=".9" />
        <stop offset=".55" stop-color="#ffe3b0" stop-opacity=".35" />
        <stop offset="1" stop-color="#ffe3b0" stop-opacity="0" />
      </radialGradient>
    </defs>

    <!-- 天空（日夜交叉） -->
    <rect class="day-sky" width="1200" height="300" fill="url(#pky-d4)" />
    <rect class="night-sky" width="1200" height="300" fill="url(#nky-d4)" />

    <!-- 星星（夜晚显现，闪烁） -->
    <g class="night-stars">
      <circle class="star" cx="120" cy="42" r="1.8" style="animation-delay:0s" />
      <circle class="star" cx="245" cy="92" r="1.4" style="animation-delay:.6s" />
      <circle class="star" cx="362" cy="50" r="1.7" style="animation-delay:1.2s" />
      <circle class="star" cx="472" cy="118" r="1.5" style="animation-delay:.3s" />
      <circle class="star" cx="600" cy="58" r="2" style="animation-delay:1.6s" />
      <circle class="star" cx="700" cy="138" r="1.4" style="animation-delay:.9s" />
      <circle class="star" cx="762" cy="58" r="1.8" style="animation-delay:2s" />
      <circle class="star" cx="980" cy="38" r="1.5" style="animation-delay:1.1s" />
      <circle class="star" cx="1080" cy="90" r="1.7" style="animation-delay:.4s" />
      <circle class="star" cx="1132" cy="150" r="1.4" style="animation-delay:1.8s" />
      <circle class="star" cx="58" cy="132" r="1.5" style="animation-delay:2.2s" />
      <circle class="star" cx="520" cy="158" r="1.3" style="animation-delay:.7s" />
      <circle class="star" cx="900" cy="200" r="1.3" style="animation-delay:1.4s" />
      <circle class="star" cx="1030" cy="170" r="1.4" style="animation-delay:2.4s" />
    </g>

    <!-- 太阳（白天显现） -->
    <g class="day-sun">
      <circle class="sun-breathe" cx="900" cy="150" r="130" fill="url(#psun-d4)" />
      <circle cx="900" cy="150" r="34" fill="#fff7d6" />
    </g>

    <!-- 月亮（夜晚显现） -->
    <g class="night-moon">
      <circle class="moon-breathe" cx="890" cy="120" r="86" fill="url(#nmoon-d4)" />
      <circle cx="890" cy="120" r="30" fill="#ffe9c9" />
      <circle cx="880" cy="112" r="6" fill="#f0d3a8" opacity=".8" />
      <circle cx="902" cy="128" r="4" fill="#f0d3a8" opacity=".7" />
    </g>

    <!-- 云朵（夜间变淡） -->
    <g class="day-clouds" fill="#ffffff" opacity=".75">
      <ellipse cx="320" cy="86" rx="86" ry="22" />
      <ellipse cx="384" cy="74" rx="62" ry="18" />
      <ellipse cx="700" cy="120" rx="54" ry="15" opacity=".55" />
      <ellipse cx="180" cy="160" rx="46" ry="13" opacity=".45" />
    </g>

    <!-- 飞鸟（夜间变淡） -->
    <g class="day-birds" stroke="#b3445c" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8">
      <path d="M520 70 q8 -8 16 0 q8 -8 16 0" />
      <path d="M566 92 q7 -7 14 0 q7 -7 14 0" />
      <path d="M480 104 q6 -6 12 0 q6 -6 12 0" />
    </g>

    <!-- 白天山峦 -->
    <g class="day-hills">
      <path d="M0 300 L0 240 Q140 168 300 224 Q440 272 560 228 Q700 180 830 232 Q960 280 1080 236 Q1140 214 1200 232 L1200 300 Z" fill="#fb7185" opacity=".85" />
      <path d="M0 300 L0 262 Q180 210 360 258 Q560 306 740 262 Q900 224 1080 268 Q1140 280 1200 268 L1200 300 Z" fill="#e11d48" opacity=".9" />
      <path d="M0 300 L0 282 Q240 250 480 280 Q760 308 980 280 Q1100 268 1200 282 L1200 300 Z" fill="#9f1239" />
    </g>

    <!-- 夜晚山峦 -->
    <g class="night-hills">
      <path d="M0 300 L0 240 Q140 168 300 224 Q440 272 560 228 Q700 180 830 232 Q960 280 1080 236 Q1140 214 1200 232 L1200 300 Z" fill="#3a1f45" opacity=".9" />
      <path d="M0 300 L0 262 Q180 210 360 258 Q560 306 740 262 Q900 224 1080 268 Q1140 280 1200 268 L1200 300 Z" fill="#2a1435" opacity=".95" />
      <path d="M0 300 L0 282 Q240 250 480 280 Q760 308 980 280 Q1100 268 1200 282 L1200 300 Z" fill="#1a0d24" />
    </g>
  </svg>
</template>

<script setup>
// 蜜桃晚霞插画场景（D4 首页横幅背景）
// 白天→黑夜：晚霞与星夜两层交叉淡入淡出，太阳/月亮互换，星星闪烁。
defineOptions({ name: 'PeachSunsetScene' })
</script>

<style scoped>
.peach-sunset-scene {
  width: 100%;
  height: 100%;
  display: block;
}

/* ---- 白天层（默认可见） ---- */
.day-sky,
.day-sun,
.day-hills,
.day-clouds,
.day-birds {
  transition: opacity 1s ease;
  will-change: opacity;
}

/* ---- 夜晚层（默认隐藏） ---- */
.night-sky,
.night-moon,
.night-stars,
.night-hills {
  opacity: 0;
  transition: opacity 1s ease;
  will-change: opacity;
}

/* ---- 月亮/星星：入场带轻微上浮，白天→黑夜更明显 ---- */
.night-moon,
.night-stars {
  transform: translateY(18px);
  transition: opacity 1s ease, transform 1s ease;
}

/* ---- 日夜切换 ---- */
.dark .night-sky,
.dark .night-moon,
.dark .night-stars,
.dark .night-hills {
  opacity: 1;
  transform: translateY(0);
}

.dark .day-sky,
.dark .day-sun,
.dark .day-hills {
  opacity: 0;
}

.dark .day-clouds {
  opacity: 0.18;
}

.dark .day-birds {
  opacity: 0.35;
}

/* ---- 太阳呼吸光晕 ---- */
.sun-breathe {
  animation: sun-breathe 5.5s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

/* ---- 月亮呼吸光晕 ---- */
.moon-breathe {
  animation: moon-breathe 6.5s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

/* ---- 星星闪烁 ---- */
.star {
  animation: twinkle 2.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes sun-breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.07); opacity: .9; }
}

@keyframes moon-breathe {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.06); opacity: .85; }
}

@keyframes twinkle {
  0%, 100% { opacity: .25; transform: scale(.7); }
  50% { opacity: 1; transform: scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .sun-breathe,
  .moon-breathe,
  .star {
    animation: none;
  }
}
</style>

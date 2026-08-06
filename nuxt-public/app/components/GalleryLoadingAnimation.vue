<template>
  <div class="initial-loading-overlay">
    <div class="loading-orbs" aria-hidden="true">
      <span class="orb orb-1" />
      <span class="orb orb-2" />
      <span class="orb orb-3" />
    </div>

    <div class="glass-panel">
      <div class="brand-letters" aria-hidden="true">
        <span v-for="(ch, i) in brandLetters" :key="i" :style="{ '--i': i }">{{ ch }}</span>
      </div>
      <p class="brand-sub">WyrmKk</p>
      <p class="progress-percent" role="status" aria-live="polite">{{ Math.round(loadingProgress) }}%</p>
    </div>
  </div>
</template>

<script setup>
// 页面级加载动画：毛玻璃面板 + 渐变光斑 + GALLERY 字母逐个淡入 + 大号百分比
// 颜色一律走 theme-variables.css 的 CSS 变量，明暗主题自动适配。

defineProps({
  loadingProgress: {
    type: Number,
    default: 0
  },
  previewImages: {
    type: Array,
    default: () => []
  }
})

const brandLetters = 'GALLERY'.split('')
</script>

<style scoped>
.initial-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 10000;
  /* 轻量主题半透明底色：压暗后面内容但保留光斑鲜艳度 */
  background: rgba(255, 255, 255, 0.55);
}

:global(.dark) .initial-loading-overlay {
  background: rgba(15, 23, 42, 0.55);
}

/* ---- 渐变光斑背景 ---- */
.loading-orbs {
  position: absolute;
  inset: 0;
  overflow: hidden;
  filter: blur(60px);
}

.orb {
  position: absolute;
  border-radius: 9999px;
  opacity: 0.55;
  animation: orb-drift 18s ease-in-out infinite alternate;
}

.orb-1 {
  width: 45vmax;
  height: 45vmax;
  top: -12vmax;
  left: -10vmax;
  background: var(--gradient-primary, linear-gradient(135deg, #667eea, #764ba2));
}

.orb-2 {
  width: 40vmax;
  height: 40vmax;
  bottom: -10vmax;
  right: -8vmax;
  background: var(--gradient-secondary, linear-gradient(135deg, #f093fb, #f5576c));
  animation-delay: -6s;
}

.orb-3 {
  width: 34vmax;
  height: 34vmax;
  top: 32%;
  left: 55%;
  background: var(--gradient-cool, linear-gradient(135deg, #30cfd0, #330867));
  animation-delay: -12s;
  opacity: 0.4;
}

@keyframes orb-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(6vmax, 4vmax, 0) scale(1.12); }
}

/* ---- 毛玻璃面板 ---- */
.glass-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  min-width: 300px;
  padding: 2.25rem 3rem;
  border-radius: var(--radius-xl, 1.25rem);
  background: var(--glass-bg, rgba(255, 255, 255, 0.8));
  -webkit-backdrop-filter: var(--backdrop-blur, blur(10px));
  backdrop-filter: var(--backdrop-blur, blur(10px));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
}

/* ---- GALLERY 字母逐个淡入上移 ---- */
.brand-letters {
  display: flex;
  gap: 0.5rem;
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-primary, #212529);
}

.brand-letters span {
  display: inline-block;
  opacity: 0;
  animation: letter-in 0.5s ease forwards;
  animation-delay: calc(var(--i) * 90ms);
}

@keyframes letter-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.brand-sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #6c757d);
  letter-spacing: 0.2em;
}

/* ---- 大号百分比 ---- */
.progress-percent {
  margin: 0.25rem 0 0;
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary, #212529);
}

/* 减少动态效果偏好：关闭光斑漂移与字母动画 */
@media (prefers-reduced-motion: reduce) {
  .orb { animation: none; }
  .brand-letters span { animation: none; opacity: 1; }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .glass-panel {
    min-width: 0;
    padding: 1.75rem 1.5rem;
  }
  .brand-letters { gap: 0.35rem; }
}
</style>

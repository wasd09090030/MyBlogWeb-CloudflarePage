<template>
  <div
    v-if="show"
    class="image-loading-overlay"
    :class="overlayClass"
    role="status"
    aria-live="polite"
    :aria-label="ariaLabel"
  />
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: true
  },
  ariaLabel: {
    type: String,
    default: '图片加载中'
  },
  overlayClass: {
    type: [String, Array, Object],
    default: ''
  }
})
</script>

<style scoped>
/*
 * 占位图用 CSS background 承载，而不是 <img>，有两个原因：
 * 1. 它是纯装饰元素，background 的请求优先级天然低于正文图片，
 *    不会再和首屏 LCP 底图、文章封面抢带宽（实测移动端它曾是最长的一次请求）。
 * 2. @nuxtjs/sitemap 的 discoverImages 只遍历 HTML 里的 <img> 节点
 *    （parseHtmlExtractSitemapMeta → element.name === "img"），
 *    换成 background 后占位图不再被写进 sitemap.xml。
 *    此前 sitemap 共 156 条 <image:loc>，其中 74 条是这个占位图。
 *
 * 资源为动画 WebP（11 帧 / 80ms / 无限循环），与原先的 loading.gif 同画面，
 * 体积 59,208 B → 33,906 B。视觉验证：按时间轴对齐后平均像素误差 1.85/255。
 */
.image-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background-color: rgba(255, 255, 255, 0.66);
  background-image: url('/Picture/loading.webp');
  background-repeat: no-repeat;
  background-position: center;
  /* auto 100% 与原 <img> 的 height:100% + width:auto + object-fit:contain 完全等价：
     高度撑满容器、宽度按 188/190 的比例，超出容器时由 background-clip 裁掉
     （原来是被外层卡片的 overflow:hidden 裁掉）。这里不能写 contain ——
     画廊瀑布流的 .gallery-masonry__media 用的是图片真实宽高比，存在竖图容器，
     contain 会把吉祥物整体缩小显示，而原来显示的是裁切放大的版本。 */
  background-size: auto 100%;
}

/* 仅覆盖底色，不要用 background 简写，否则会连带清掉上面的 background-image */
:global(.dark) .image-loading-overlay {
  background-color: rgba(15, 23, 42, 0.62);
}
</style>

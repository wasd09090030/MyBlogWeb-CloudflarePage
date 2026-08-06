<template>
  <div class="icon-marquee-container">
    <!-- 左列：向上滚动 -->
    <UMarquee
      orientation="vertical"
      :pause-on-hover="true"
      :ui="{ root: 'marquee-column [--duration:20s]' }"
    >
      <img
        v-for="(icon, index) in iconsColumn1"
        :key="`c1-${index}`"
        :src="icon.src"
        :alt="`icon-${icon.id}`"
        class="icon-image"
        loading="lazy"
      />
    </UMarquee>

    <!-- 右列：向下滚动（reverse） -->
    <UMarquee
      orientation="vertical"
      reverse
      :pause-on-hover="true"
      :ui="{ root: 'marquee-column marquee-col-2 [--duration:18s]' }"
    >
      <img
        v-for="(icon, index) in iconsColumn2"
        :key="`c2-${index}`"
        :src="icon.src"
        :alt="`icon-${icon.id}`"
        class="icon-image"
        loading="lazy"
      />
    </UMarquee>
  </div>
</template>

<script setup>
// 第一列图标配置
const iconsColumn1 = [
  { id: 1, src: '/icon/unityeditoricon.svg' },
  { id: 2, src: '/icon/cloudflare_icon.svg' },
  { id: 3, src: '/icon/file_type_vscode_icon.svg' },
  { id: 4, src: '/icon/file_type_vue_icon_130078.svg' },
  { id: 5, src: '/icon/flutterio_logo_icon_171148.svg' },
  { id: 6, src: '/icon/folder_react_icon.svg' },
  { id: 7, src: '/icon/github_111098.svg' }
]

// 第二列图标配置
const iconsColumn2 = [
  { id: 8, src: '/icon/chatgpt_logo.svg' },
  { id: 9, src: '/icon/googleC.svg' },
  { id: 10, src: '/icon/java_logo_icon_169577.svg' },
  { id: 11, src: '/icon/microsoft_logo_icon_170957.svg' },
  { id: 12, src: '/icon/steam_icon_160719.svg' },
  { id: 13, src: '/icon/Ubuntu.svg' },
  { id: 14, src: '/icon/Windows.svg' }
]
</script>

<style scoped>
.icon-marquee-container {
  display: flex;
  gap: 15px;
  height: 100%;
  max-height: 400px;
  overflow: hidden;
  flex-shrink: 0;
}

/* 两个直列 UMarquee 共用卡片的裁剪边界和默认上下遮罩。 */
.marquee-column {
  flex: 1;
  min-width: 0;
  height: 100%;
  --gap: 20px;
}

.marquee-col-2 {
  --duration: 18s;
}

/* 图标直接展示，无外部卡片背景；
   固定尺寸避免 UMarquee content 的 min-w-max 把 SVG 撑到原始大小 */
.icon-image {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
}
</style>

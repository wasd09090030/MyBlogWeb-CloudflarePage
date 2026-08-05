<template>
  <div class="icon-marquee-container">
    <!-- 左列：向上滚动 -->
    <UMarquee
      orientation="vertical"
      :pause-on-hover="true"
      :overlay="false"
      class="marquee-column"
    >
      <div v-for="(icon, index) in iconsColumn1" :key="`c1-${index}`" class="icon-item">
        <img :src="icon.src" :alt="`icon-${icon.id}`" class="icon-image" />
      </div>
    </UMarquee>

    <!-- 右列：向下滚动（reverse） -->
    <UMarquee
      orientation="vertical"
      reverse
      :pause-on-hover="true"
      :overlay="false"
      class="marquee-column marquee-col-2"
    >
      <div v-for="(icon, index) in iconsColumn2" :key="`c2-${index}`" class="icon-item">
        <img :src="icon.src" :alt="`icon-${icon.id}`" class="icon-image" />
      </div>
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

/* UMarquee 列：等分宽度、充满容器高度、覆盖默认间距与时长 */
.marquee-column {
  flex: 1;
  min-width: 0;
  height: 100%;
  --gap: 20px;
}

.marquee-col-2 {
  --duration: 18s;
}

.icon-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background: rgba(87, 82, 96, 0.08);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.icon-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

/* 暗色主题适配 */
.dark .icon-item {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}
</style>

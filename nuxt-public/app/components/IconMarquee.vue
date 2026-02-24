<template>
  <div class="icon-marquee-container">
    <!-- 第一列：从上往下 -->
    <div class="marquee-column marquee-down">
      <div class="marquee-content">
        <div v-for="(icon, index) in iconsColumn1" :key="`down-${index}`" class="icon-item">
          <img :src="icon.src" :alt="`icon-${icon.id}`" class="icon-image" />
        </div>
      </div>
      <div class="marquee-content" aria-hidden="true">
        <div v-for="(icon, index) in iconsColumn1" :key="`down-dup-${index}`" class="icon-item">
          <img :src="icon.src" :alt="`icon-${icon.id}`" class="icon-image" />
        </div>
      </div>
    </div>

    <!-- 第二列：从下往上 -->
    <div class="marquee-column marquee-up">
      <div class="marquee-content">
        <div v-for="(icon, index) in iconsColumn2" :key="`up-${index}`" class="icon-item">
          <img :src="icon.src" :alt="`icon-${icon.id}`" class="icon-image" />
        </div>
      </div>
      <div class="marquee-content" aria-hidden="true">
        <div v-for="(icon, index) in iconsColumn2" :key="`up-dup-${index}`" class="icon-item">
          <img :src="icon.src" :alt="`icon-${icon.id}`" class="icon-image" />
        </div>
      </div>
    </div>
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

.marquee-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.marquee-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  padding-bottom: 20px;
}

/* 向下滚动动画 */
.marquee-down .marquee-content {
  animation-name: scrollDown;
  animation-duration: 20s;
}

/* 向上滚动动画 */
.marquee-up .marquee-content {
  animation-name: scrollUp;
  animation-duration: 18s;
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



.icon-item i {
  font-size: 1.8rem;
  color: rgba(255, 255, 255, 0.85);
  transition: color 0.3s ease;
}

.icon-image {
  width: 40px;
  height: 40px;
  object-fit: contain;
  transition: transform 0.3s ease;
}



/* 向下滚动关键帧 */
@keyframes scrollDown {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(-100%);
  }
}

/* 向上滚动关键帧 */
@keyframes scrollUp {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(0);
  }
}

/* 暗色主题适配 */
.dark-theme .icon-item {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

</style>

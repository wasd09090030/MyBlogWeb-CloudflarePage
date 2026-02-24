<template>
  <div class="web-embed-mdc my-6">
    <div class="embed-container rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700" :style="containerStyle">
      <div v-if="embedHtml" v-html="embedHtml" class="embed-content" />
      
      <iframe
        v-else-if="finalUrl"
        :src="finalUrl"
        :title="title || 'Embedded Content'"
        :width="width"
        :height="height"
        frameborder="0"
        :allow="allow"
        :allowfullscreen="allowFullscreen"
        class="w-full h-full"
      />
      
      <div v-else class="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 text-gray-500">
        <div class="text-center p-8">
          <Icon name="film" size="3xl" class="mb-3 mx-auto" />
          <p class="text-sm">无效的 URL</p>
        </div>
      </div>
    </div>
    
    <p v-if="caption" class="text-sm text-gray-600 dark:text-gray-400 text-center mt-2">
      {{ caption }}
    </p>
  </div>
</template>

<script setup>
/**
 * WebEmbed 网页/视频嵌入组件 - MDC 语法
 * 
 * 支持 Bilibili、YouTube、CodePen、CodeSandbox 等
 * 
 * 在 Markdown 中使用：
 * ::web-embed{url="https://www.bilibili.com/video/BV1xx411c7mD" aspectRatio="16/9"}
 * ::
 * 
 * ::web-embed{platform="bilibili" vid="BV1xx411c7mD"}
 * ::
 * 
 * ::web-embed{platform="youtube" vid="dQw4w9WgXcQ"}
 * ::
 */

const props = defineProps({
  url: String,
  platform: String,
  vid: String,
  width: {
    type: String,
    default: '100%'
  },
  height: {
    type: String,
    default: '500px'
  },
  aspectRatio: {
    type: String,
    default: '16/9'
  },
  title: String,
  caption: String,
  allow: {
    type: String,
    default: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
  },
  allowFullscreen: {
    type: Boolean,
    default: true
  }
})

const embedHtml = ref('')

const containerStyle = computed(() => {
  if (props.aspectRatio) {
    return {
      aspectRatio: props.aspectRatio,
      width: '100%'
    }
  }
  return {
    width: props.width,
    height: props.height
  }
})

// 解析不同平台的 URL
const finalUrl = computed(() => {
  // 如果指定了 platform 和 vid
  if (props.platform && props.vid) {
    return getPlatformUrl(props.platform, props.vid)
  }
  
  // 如果提供了完整 URL，尝试自动识别
  if (props.url) {
    return parseUrl(props.url)
  }
  
  return ''
})

const getPlatformUrl = (platform, vid) => {
  const platforms = {
    bilibili: (id) => {
      // 支持 BV 号
      if (id.startsWith('BV')) {
        return `https://player.bilibili.com/player.html?bvid=${id}&high_quality=1&danmaku=0&autoplay=0`
      }
      // 支持 av 号
      return `https://player.bilibili.com/player.html?aid=${id}&high_quality=1&danmaku=0&autoplay=0`
    },
    youtube: (id) => `https://www.youtube.com/embed/${id}?autoplay=0`,
    codepen: (id) => `https://codepen.io/${id}/embed`,
    codesandbox: (id) => `https://codesandbox.io/embed/${id}`,
    stackblitz: (id) => `https://stackblitz.com/edit/${id}?embed=1`,
  }
  
  const handler = platforms[platform.toLowerCase()]
  return handler ? handler(vid) : ''
}

const parseUrl = (url) => {
  try {
    // Bilibili
    if (url.includes('bilibili.com')) {
      const bvMatch = url.match(/BV[\w]+/)
      if (bvMatch) {
        return `https://player.bilibili.com/player.html?bvid=${bvMatch[0]}&high_quality=1&danmaku=0&autoplay=0`
      }
      const avMatch = url.match(/av(\d+)/)
      if (avMatch) {
        return `https://player.bilibili.com/player.html?aid=${avMatch[1]}&high_quality=1&danmaku=0&autoplay=0`
      }
    }
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
      if (videoIdMatch) {
        return `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=0`
      }
    }
    
    // CodePen
    if (url.includes('codepen.io')) {
      return url.replace('/pen/', '/embed/')
    }
    
    // 其他情况直接返回 URL
    return url
  } catch (e) {
    console.error('解析 URL 失败:', e)
    return ''
  }
}
</script>

<style scoped>
.embed-container {
  position: relative;
  background: #000;
}

.embed-content :deep(iframe) {
  width: 100%;
  height: 100%;
}
</style>

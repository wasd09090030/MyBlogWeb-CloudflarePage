<template>
  <n-loading-bar-provider>
    <slot />
  </n-loading-bar-provider>
</template>

<script setup>
/**
 * LoadingBar 组件 - 页面跳转加载条
 * 
 * 在路由变化时自动显示 Naive UI 的加载条
 */

const loadingBar = useLoadingBar()
const route = useRoute()

// 监听路由变化
watch(() => route.fullPath, () => {
  // 路由开始变化时启动加载条
  loadingBar.start()
  
  // 在下一帧完成加载条
  nextTick(() => {
    loadingBar.finish()
  })
})

// 页面加载完成时确保加载条结束
onMounted(() => {
  loadingBar.finish()
})

// 处理路由错误
const router = useRouter()
router.onError(() => {
  loadingBar.error()
})
</script>

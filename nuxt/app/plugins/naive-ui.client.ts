import { defineNuxtPlugin } from '#app'

/**
 * Naive UI 客户端插件
 * 确保 Naive UI 在客户端正确初始化，避免循环依赖和初始化顺序问题
 */
export default defineNuxtPlugin((nuxtApp) => {
  // 确保 Naive UI 在客户端正确初始化
  // @bg-dev/nuxt-naiveui 模块会自动处理，这里只需要确保加载顺序
  
  // 如果有全局配置需求，可以在这里添加
  // 例如：全局主题配置、消息提示配置等
})

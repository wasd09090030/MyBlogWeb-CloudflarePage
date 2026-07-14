export default defineAppConfig({
  icon: {
    // 默认图标尺寸
    size: '1.25rem',
    // 默认 CSS 类
    class: 'nuxt-icon'
  },
  // Nuxt UI v3 运行时主题配置（Phase 0 基础映射，后续阶段补全）
  //
  // 颜色语义映射（迁移自 NaiveUI themeOverrides）：
  //   原 primaryColor: #0d6efd → ui.colors.primary = 'blue'
  //   hover/pressed 由 Nuxt UI 默认色阶自动处理（hover=400，active=600）
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'purple',
      neutral: 'zinc',
      info: 'sky',
      success: 'green',
      warning: 'amber',
      error: 'red'
    }
  }
})
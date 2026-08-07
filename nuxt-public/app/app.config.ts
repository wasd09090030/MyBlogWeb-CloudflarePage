import { articleProsePreset } from '../../shared/article-typography/prose-preset'

export default defineAppConfig({
  icon: {
    size: '1.25rem',
    class: 'nuxt-icon'
  },
  ui: {
    colors: {
      primary: 'blue',
      secondary: 'purple',
      neutral: 'zinc',
      info: 'sky',
      success: 'green',
      warning: 'amber',
      error: 'red'
    },
    prose: articleProsePreset
  }
})

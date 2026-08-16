import { articleProsePreset } from '../../shared/article-typography/prose-preset'

export default defineAppConfig({
  icon: {
    size: '1.25rem',
    class: 'nuxt-icon'
  },
  ui: {
    colors: {
      primary: 'rose',
      secondary: 'amber',
      neutral: 'stone',
      info: 'sky',
      success: 'teal',
      warning: 'amber',
      error: 'rose'
    },
    prose: articleProsePreset
  }
})

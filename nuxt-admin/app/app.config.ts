import { articleProsePreset } from '../../shared/article-typography/prose-preset'

export default defineAppConfig({
  ui: {
    colors: { primary: 'cyan', neutral: 'slate', success: 'emerald', warning: 'amber', error: 'red' },
    prose: articleProsePreset
  }
})

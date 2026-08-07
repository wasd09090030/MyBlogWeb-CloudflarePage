import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import mdcHighlighter from '#mdc-highlighter'

export async function parseArticleMarkdown(markdown: string) {
  return await parseMarkdown(markdown, {
    highlight: {
      theme: {
        default: 'material-theme-darker',
        dark: 'one-dark-pro'
      },
      highlighter: mdcHighlighter
    },
    toc: {
      depth: 4,
      searchDepth: 4
    }
  })
}

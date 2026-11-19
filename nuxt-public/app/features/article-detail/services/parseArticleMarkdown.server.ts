import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import mdcHighlighter from '#mdc-highlighter'

const MERMAID_FENCE = /(?:^|\n)[ \t]*```mermaid\b/i

export async function parseArticleMarkdown(markdown: string) {
  // 只有正文真的含 mermaid 时才加载构建期渲染器：它会在 Node 端拉起
  // Playwright/Chromium，没有图表的文章不应为此付出任何代价。
  const rehypePlugins: Record<string, { instance: unknown }> = {}

  if (MERMAID_FENCE.test(markdown)) {
    try {
      const { default: rehypeMermaidDualTheme } = await import('./rehypeMermaidDualTheme')
      rehypePlugins['rehype-mermaid-dual-theme'] = { instance: rehypeMermaidDualTheme }
    } catch (error) {
      // 构建机没装 Playwright/Chromium 时不要让整篇解析失败：
      // 保留代码块，交给客户端渲染兜底。
      console.warn('[Mermaid] 构建期渲染插件加载失败，回退到客户端渲染:', error)
    }
  }

  return await parseMarkdown(markdown, {
    rehype: { plugins: rehypePlugins },
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

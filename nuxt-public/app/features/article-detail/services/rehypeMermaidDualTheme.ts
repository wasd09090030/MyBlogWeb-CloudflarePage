import { createMermaidRenderer } from 'mermaid-isomorphic'
import { fromHtml } from 'hast-util-from-html'
import type { Element, ElementContent, Root } from 'hast'

/**
 * 构建期把 markdown 里的 ```mermaid 代码块渲染成内联 SVG。
 *
 * 为什么不用 mermaid 官方客户端渲染：
 * - 客户端需要在 hydration 后动态加载 mermaid（数百 KB）再渲染，首屏会先看到代码块，
 *   然后跳变成图；
 * - 文章是 SSG 预渲染的，完全可以在构建期把图固定下来。
 *
 * 为什么渲染明暗两份：
 * - 站点主题是通过 <html class="dark"> 切换的，不是 prefers-color-scheme；
 * - SVG 一旦生成，颜色就固化了，无法再响应 CSS 变量变化。
 * 因此同一份图渲染两次，用 CSS（.dark 前缀）切换显示哪一份。
 *
 * 色值必须与 app/assets/css/theme-variables.css 的 light / dark token 保持一致。
 * 如果主题 token 改了，这里的值也要同步，否则图表配色会和正文脱节。
 */

type ThemeTokens = Record<string, string>

const LIGHT_TOKENS: ThemeTokens = {
  '--bg-primary': '#fdf6f1',
  '--bg-secondary': '#f7e8e1',
  '--bg-tertiary': '#f0ddd6',
  '--bg-hover': '#fbeae7',
  '--text-primary': '#3d2f2b',
  '--text-secondary': '#8a7368',
  '--text-muted': '#c4a89b',
  '--accent-primary': '#e11d48',
  '--accent-warning': '#f59e0b',
  '--card-bg': '#ffffff',
  '--border-color': '#f2e4da',
  '--border-color-dark': '#d9b8a8'
}

const DARK_TOKENS: ThemeTokens = {
  '--bg-primary': '#241a17',
  '--bg-secondary': '#2e211d',
  '--bg-tertiary': '#2a1e1b',
  '--bg-hover': '#4a322b',
  '--text-primary': '#fdf5f1',
  '--text-secondary': '#e7d9d2',
  '--text-muted': '#b7a096',
  '--accent-primary': '#fb7185',
  '--accent-warning': '#fbbf24',
  '--card-bg': '#33241f',
  '--border-color': '#4a332b',
  '--border-color-dark': '#6b4c40'
}

function pick(tokens: ThemeTokens, name: string, fallback?: string) {
  const value = tokens[name]
  if (value) return value
  return fallback ? tokens[fallback] || '' : ''
}

/** 与 MarkdownRenderer.vue 里 buildMermaidThemeVariables 的映射保持一致。 */
function buildThemeVariables(tokens: ThemeTokens) {
  return {
    primaryColor: pick(tokens, '--bg-tertiary', '--bg-secondary'),
    primaryTextColor: pick(tokens, '--text-primary'),
    primaryBorderColor: pick(tokens, '--accent-primary'),
    lineColor: pick(tokens, '--text-muted', '--text-secondary'),
    secondaryColor: pick(tokens, '--bg-secondary'),
    tertiaryColor: pick(tokens, '--bg-tertiary', '--bg-secondary'),
    background: pick(tokens, '--bg-primary'),
    mainBkg: pick(tokens, '--card-bg', '--bg-secondary'),
    secondBkg: pick(tokens, '--bg-secondary'),
    nodeBorder: pick(tokens, '--accent-primary'),
    clusterBkg: pick(tokens, '--bg-secondary'),
    clusterBorder: pick(tokens, '--border-color-dark', '--border-color'),
    titleColor: pick(tokens, '--text-primary'),
    edgeLabelBackground: pick(tokens, '--bg-primary'),
    textColor: pick(tokens, '--text-secondary', '--text-primary'),
    nodeTextColor: pick(tokens, '--text-primary'),
    actorTextColor: pick(tokens, '--text-primary'),
    actorBkg: pick(tokens, '--bg-tertiary', '--bg-secondary'),
    actorBorder: pick(tokens, '--accent-primary'),
    actorLineColor: pick(tokens, '--text-muted', '--text-secondary'),
    signalColor: pick(tokens, '--text-muted', '--text-secondary'),
    signalTextColor: pick(tokens, '--text-secondary', '--text-primary'),
    labelBoxBkgColor: pick(tokens, '--bg-secondary'),
    labelBoxBorderColor: pick(tokens, '--border-color-dark', '--border-color'),
    labelTextColor: pick(tokens, '--text-secondary', '--text-primary'),
    loopTextColor: pick(tokens, '--text-secondary', '--text-primary'),
    noteBkgColor: pick(tokens, '--bg-hover', '--bg-secondary'),
    noteBorderColor: pick(tokens, '--accent-warning', '--accent-primary'),
    noteTextColor: pick(tokens, '--text-primary'),
    activationBkgColor: pick(tokens, '--bg-tertiary', '--bg-secondary'),
    activationBorderColor: pick(tokens, '--accent-primary'),
    sequenceNumberColor: pick(tokens, '--text-primary')
  }
}

function buildMermaidConfig(tokens: ThemeTokens) {
  return {
    startOnLoad: false,
    theme: 'base' as const,
    securityLevel: 'loose' as const,
    fontFamily: 'Open Sans, ui-sans-serif, system-ui, sans-serif',
    themeVariables: buildThemeVariables(tokens),
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'basis' as const
    },
    sequence: {
      useMaxWidth: true,
      wrap: true,
      mirrorActors: false
    },
    gantt: {
      useMaxWidth: true
    }
  }
}

type CodeBlock = {
  parent: Root | Element
  index: number
  source: string
}

const MERMAID_LANGUAGE_CLASS = 'language-mermaid'

function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value
  if (node.type === 'element') return node.children.map(textContent).join('')
  return ''
}

function hasClass(node: Element, className: string) {
  const value = node.properties?.className
  if (Array.isArray(value)) return value.map(String).includes(className)
  // MDC 的 highlight rehype 插件会把 className 拼成空格分隔的字符串。
  if (typeof value === 'string') return value.split(/\s+/).includes(className)
  return false
}

/** 识别 <pre><code class="language-mermaid"> 和 <pre class="mermaid"> 两种形式。 */
function readMermaidSource(pre: Element): string | null {
  const hasMermaidLanguage = pre.properties?.language === 'mermaid'

  if (!hasMermaidLanguage && hasClass(pre, 'mermaid')) {
    return textContent(pre).trim() || null
  }

  const code = pre.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code'
  )

  if (!hasMermaidLanguage && !(code && hasClass(code, MERMAID_LANGUAGE_CLASS))) return null

  // MDC 会把源码同时放在 pre.properties.code；highlight 之后 code 的
  // 子节点会被 Shiki 的 span 替换，优先取属性更稳。
  const source = typeof pre.properties?.code === 'string' && pre.properties.code
    ? pre.properties.code
    : textContent(code || pre)

  return source.trim() || null
}

function collectCodeBlocks(root: Root) {
  const blocks: CodeBlock[] = []

  const walk = (parent: Root | Element) => {
    parent.children.forEach((child, index) => {
      if (child.type !== 'element') return

      if (child.tagName === 'pre') {
        const source = readMermaidSource(child)
        if (source) {
          blocks.push({ parent, index, source })
          return
        }
      }

      walk(child)
    })
  }

  walk(root)
  return blocks
}

function svgChildren(svg: string): ElementContent[] {
  // mermaid 输出的是 XML 序列化后的 <svg>；HTML 解析器会按 foreign content 规则
  // 正确保留 viewBox 等 SVG 属性。
  return fromHtml(svg, { fragment: true }).children as ElementContent[]
}

function createVariant(variant: 'light' | 'dark', svg: string): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      className: ['mermaid-diagram__variant', `mermaid-diagram__variant--${variant}`]
    },
    children: svgChildren(svg)
  }
}

function createWrapper(lightSvg: string, darkSvg: string): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      // 与 MarkdownRenderer.vue 客户端渲染使用的容器类保持一致。
      className: [
        'mermaid-diagram',
        'my-6',
        'flex',
        'justify-center',
        'overflow-x-auto',
        'p-4',
        'bg-white',
        'dark:bg-gray-800',
        'rounded-xl',
        'shadow-xs',
        'border',
        'border-gray-200',
        'dark:border-gray-700'
      ]
    },
    children: [createVariant('light', lightSvg), createVariant('dark', darkSvg)]
  }
}

// 模块级复用同一个渲染器：预渲染并发解析多篇文章时共享一个 Chromium 实例，
// 没有渲染任务时才关闭浏览器。
const renderMermaid = createMermaidRenderer()

export default function rehypeMermaidDualTheme() {
  return async function transformer(tree: Root) {
    const blocks = collectCodeBlocks(tree)
    if (blocks.length === 0) return

    const sources = blocks.map(block => block.source)

    let lightResults
    let darkResults
    try {
      ;[lightResults, darkResults] = await Promise.all([
        renderMermaid(sources, {
          prefix: 'mermaid-light',
          mermaidConfig: buildMermaidConfig(LIGHT_TOKENS)
        }),
        renderMermaid(sources, {
          prefix: 'mermaid-dark',
          mermaidConfig: buildMermaidConfig(DARK_TOKENS)
        })
      ])
    } catch (error) {
      // 浏览器不可用或启动失败：保留原始代码块，交给客户端渲染兜底。
      console.warn('[Mermaid] 构建期渲染不可用，回退到客户端渲染:', error)
      return
    }

    blocks.forEach((block, index) => {
      const light = lightResults[index]
      const dark = darkResults[index]

      if (light?.status !== 'fulfilled' || dark?.status !== 'fulfilled') {        const reason = light?.status === 'rejected' ? light.reason : dark?.status === 'rejected' ? dark.reason : 'unknown'
        console.warn(
          `[Mermaid] 图表 #${index} 构建期渲染失败，保留代码块回退客户端渲染:`,
          reason
        )
        return
      }

      block.parent.children[block.index] = createWrapper(light.value.svg, dark.value.svg)
    })
  }
}

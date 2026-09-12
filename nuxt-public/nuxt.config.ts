import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { buildArticleRoute, fetchAllArticleRoutes, toIsoLastmod } from './build/article-route-data'

// Editorial 字体仅作用于画廊时间线月份标题

const isProduction = process.env.NODE_ENV === 'production'
const enableSourceMap = process.env.NUXT_SOURCEMAP === 'true'
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://wasd09090030.top'
// SSG fetches use the deployed Worker URL; browser runtime requests stay same-origin.
const apiBase = process.env.NUXT_API_BASE_URL || process.env.NUXT_PUBLIC_API_BASE_URL || 'https://wasd09090030.top/api'
const articleMarkdownParserId = '#article-markdown-parser'
const articleMarkdownParserPath = fileURLToPath(new URL('./app/features/article-detail/services/parseArticleMarkdown.server.ts', import.meta.url))
const articleMarkdownParserClientStubId = '\0article-markdown-parser-client-stub'

const articleMarkdownParserPlugin = {
  name: 'article-markdown-parser-server-only',
  resolveId(id: string, _importer: string | undefined, options: { ssr?: boolean } | undefined) {
    if (id !== articleMarkdownParserId) return null
    return options?.ssr ? articleMarkdownParserPath : articleMarkdownParserClientStubId
  },
  load(id: string) {
    if (id !== articleMarkdownParserClientStubId) return null
    return 'export async function parseArticleMarkdown() { throw new Error("Server-only Markdown parser invoked in browser") }'
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2026-01-09',
  devtools: { enabled: true },
  sourcemap: enableSourceMap,

  typescript: {
    strict: false,
    tsConfig: {
      compilerOptions: {
        allowJs: true,
        checkJs: false
      }
    }
  },

  css: [
    '~/assets/css/theme-variables.css',
    // Tailwind 与 Nuxt UI 必须在同一入口编译，才能生成 text-inverted、
    // ring-accented 等 Nuxt UI 语义工具类。
    '~/assets/css/tailwind.css',
    // 项目设计 token 与共享文章排版入口。
    '~/assets/css/main.css',
    '~/assets/css/components/responsive-utilities.desktop.css',
    '~/assets/css/components/responsive-utilities.mobile.css',
    // Editorial 字体（仅作用于画廊时间线月份标题）
    '@fontsource/playfair-display/400.css',
    '@fontsource/playfair-display/700.css',
    '@fontsource/playfair-display/400-italic.css',
    '@fontsource/playfair-display/700-italic.css'
  ],

  components: {
    dirs: [
      { path: '~/components/content', pathPrefix: false, global: true },
      '~/components'
    ]
  },

  modules: [
    '@nuxt/icon',
    '@nuxt/fonts',
    '@vueuse/motion/nuxt',
    // Nuxt UI v4 — Phase 0 接入，Phase 5 卸 NaiveUI 后唯一组件库
    '@nuxt/ui',
    '@nuxtjs/mdc',
    '@nuxtjs/seo',
    'nuxt-vitalizer'
  ],

  ui: {
    // Nuxt UI v4 Prose：让 @nuxtjs/mdc 渲染标准 Markdown 元素时使用 Prose 组件。
    prose: true
  },

  vitalizer: {
    // 去掉「当前页不会挂载的动态 import」的 prefetch。
    // 注意 disablePreloadLinks: true 会连带把 script prefetch 也清空
    // （Nuxt 的 prefetch 集合是从 preload 集合推导出来的），所以首页 HTML 里
    // 既没有 modulepreload 也没有 prefetch。
    disablePrefetchLinks: 'dynamicImports',
    // 【2026-09-11 复核后保留，未改动】关掉全部 modulepreload <link>。
    // nuxt-vitalizer 官方文档对这项有明确警告：「这是唯一一个可能让 LCP 变差的选项」，
    // 无 modulepreload 时浏览器要等 chunk 下载并解析完才知道它依赖什么，
    // 深依赖图会退化成请求瀑布；它「在受限网络上赢，在高延迟上输」，
    // 且官方建议用 CrUX 实测后再决定。
    // 本站现状的两面证据：
    //   · 支持关闭：移动端（4x CPU + Slow 4G）实测 JS 到达很晚但主线程 JS 自耗时
    //     总计只约 180 ms，TBT 161 ms（桌面）/ 1207 ms（移动），LCP 元素是
    //     纯 CSS mask 的 DIV.hero-girl，JS 不在 LCP 关键路径上；
    //     且 Slow 4G 下带宽已被 8 个阻塞 CSS + 首屏图占满。
    //   · 支持打开：实测存在瀑布 —— entry 段 t=827→3502 ms，
    //     232 KB 的 vendor-ui 段要等到 t=4073 才开始，t≈8148 才到。
    // 结论：收益无法在当前环境验证，而文档警告的 LCP 变差风险是真实的，
    // 因此保持现状不动。若要改，请先按官方建议做 CrUX / 真机前后对比。
    disablePreloadLinks: true,
    // 该分支只在 features.inlineStyles 为真时才生效；本项目的
    // experimental.inlineSSRStyles 明确为 false（见下方说明：Tailwind v4 的
    // @layer 分层语义会被内联副本破坏），所以这项实际是空操作。
    disableStylesheets: false
  },

  fonts: {
    provider: 'local',
    defaults: {
      weights: [400, 600, 700],  // 添加常用字重
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: {
        'sans-serif': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Arial']
      }
    },
    families: [
      {
        name: 'Open Sans',
        provider: 'local',
        global: true,
        // 关键优化：添加 font-display 策略
        display: 'swap',  // 避免 FOIT（Flash of Invisible Text）
        preload: true,
        fallback: ['system-ui', 'Arial']
      }
      // Playfair Display 改由 @fontsource/playfair-display 直接在 css:[] 注入
    ]
  },

  mdc: {
    highlight: {
      // 静态站不存在运行时 /api/_mdc/highlight，避免首访先 404 再回退。
      noApiRoute: true,
      theme: {
        default: 'material-theme-darker',
        dark: 'one-dark-pro'
      },
      langs: [
        // 核心 Web 开发语言（高频使用）
        'javascript', 'typescript', 'vue', 'html', 'css',
        // 配置 / 数据格式
        'json', 'yaml', 'bash', 'shell',
        // 后端语言
        'python', 'java', 'csharp', 'sql','markdown',
        // 系统语言（按需保留，体积较大）
        'cpp', 'c',
        // 运维 / 工具
        'dockerfile', 'nginx', 'xml', 'diff',
        // 按需添加：'dart', 'rust', 'go', 'scss', 'markdown', 'vue-html'
        // 注意：移除了 'mermaid'（用独立渲染库替代语法高亮）
      ]
    },
    remarkPlugins: {
      'remark-math': {
        src: 'remark-math',
        options: { singleDollarTextMath: true }
      }
    },
    rehypePlugins: {
      'rehype-katex': {
        src: 'rehype-katex',
        options: {}
      }
    },
    headings: {
      anchorLinks: {
        h1: false, h2: true, h3: true, h4: true, h5: false, h6: false
      }
    }
  },

  icon: {
    serverBundle: {
      collections: ['heroicons', 'mdi']
    },
    provider: 'iconify',
    clientBundle: {
      scan: true,
      // 预加载常用图标，避免运行时加载超时
      icons: [
        'heroicons:document-text',
        'heroicons:folder-open',
        'heroicons:puzzle-piece',
        'heroicons:code-bracket-square',
        'heroicons:bars-3-bottom-left',
        'heroicons:home',
        'heroicons:bars-3',
        'heroicons:x-mark',
        'heroicons:sun',
        'heroicons:moon',
        'heroicons:calendar',
        'heroicons:book-open',
        'heroicons:pencil-square',
        'heroicons:code-bracket',
        'heroicons:magnifying-glass',
        'heroicons:heart',
        'heroicons:chat-bubble-oval-left',
        'heroicons:arrow-left',
        'heroicons:arrow-right',
        'heroicons:chevron-up',
        'heroicons:chevron-down',
        // 品牌类图标（Group D 替换后），避免首屏闪烁
        'mdi:github',
        'mdi:robot',
        'mdi:gamepad-variant'
      ]
    }
  },

  build: {
    transpile: ['@vueuse/core']
  },

  vite: {
    plugins: [tailwindcss(), articleMarkdownParserPlugin],
    worker: { format: 'es' },
      optimizeDeps: {
        include: [
          'vue', 'keen-slider', 'katex', '@vueuse/core', '@vueuse/motion',
          'remark-math', 'rehype-katex'
          // mermaid 已移出：代码层使用 await import('mermaid') 懒加载，不应预捆绑
        ],
        exclude: ['vue-demi']
      },
    define: { global: 'globalThis' },
    build: {
      modulePreload: { polyfill: true },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2
        },
        mangle: { safari10: true },
        format: { comments: false }
      },
      rollupOptions: {
        treeshake: { preset: 'recommended' },
        output: {
          manualChunks(id) {
            // 数学公式渲染
            if (id.includes('node_modules/katex')) {
              return 'vendor-katex'
            }
            // Markdown 插件
            if (id.includes('remark-') || id.includes('rehype-')) {
              return 'vendor-markdown-plugins'
            }
            // UI 库及其核心依赖；Nuxt UI v4 依赖 VueUse，必须保持在同一 chunk 以避免循环依赖。
            if (id.includes('node_modules/@nuxt/ui') || id.includes('node_modules/reka-ui') || id.includes('node_modules/@internationalized') || id.includes('node_modules/@vueuse')) {
              return 'vendor-ui'
            }
            // 轮播图库
            if (id.includes('node_modules/keen-slider')) {
              return 'vendor-slider'
            }
          }
        }
      },
      chunkSizeWarningLimit: 1500,
      cssCodeSplit: true,
      sourcemap: enableSourceMap,
      target: 'es2020'
    },
    css: { devSourcemap: false }
  },

  runtimeConfig: {
    // 静态生成时,构建阶段的服务端 API 地址
    apiBaseServer: process.env.NUXT_API_BASE_URL || apiBase,
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || '/api',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || siteUrl
    }
  },

  site: {
    url: siteUrl,
    name: 'WyrmKk',
    description: '分享技术、生活与创作的个人博客',
    defaultLocale: 'zh-CN'
  },

  robots: {
    robotsTxt: false,
    disallow: !isProduction ? ['/'] : []
  },

  sitemap: {
    exclude: ['/admin/**', '/api/**'],
    urls: async () => {
      try {
        const articles = await fetchAllArticleRoutes(apiBase)
        return articles.map((article) => {
          const lastmod = toIsoLastmod(article.updatedAt || article.createdAt)
          return {
            loc: buildArticleRoute(article),
            ...(lastmod ? { lastmod } : {})
          }
        })
      } catch (e) {
        console.error('❌ Failed to fetch sitemap article urls:', e)
        return []
      }
    }
  },

  schemaOrg: {
    identity: {
      type: 'Person',
      name: 'WyrmKk',
      url: siteUrl,
      sameAs: [
        process.env.NUXT_PUBLIC_TWITTER_URL || 'https://x.com/wyrmwyrm1',
        process.env.NUXT_PUBLIC_GITHUB_URL || 'https://github.com/wasd09090030'
      ].filter(Boolean)
    },
    reactive: true
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    layoutTransition: { name: 'layout', mode: 'out-in' },
    head: {
      title: 'WyrmKk',
      titleTemplate: '%s · WyrmKk',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#1a1a1a', media: '(prefers-color-scheme: dark)' },
        { 'http-equiv': 'x-dns-prefetch-control', content: 'on' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/icon/Myfavicon.ico' },
        { rel: 'dns-prefetch', href: 'https://cfimg.wasd09090030.top' },
        { rel: 'preconnect', href: 'https://cfimg.wasd09090030.top', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://wasd09090030.top', crossorigin: 'anonymous' }
      ]
    }
  },

  experimental: {
    // 静态生成需要 payload 提取
    payloadExtraction: true,
    renderJsonPayloads: true,
    viewTransition: true,
    inlineRouteRules: true,
    componentIslands: false,
    asyncContext: true,
    headNext: true,
    // 关闭动态 speculation rules patch，避免控制台持续告警。
    crossOriginPrefetch: false,
    // Tailwind v4 使用真实 @layer 分层输出；Nuxt 默认内联的组件 CSS 副本会丢失 @layer 包裹，
    // 未分层声明必然压过分层声明（CSS Cascade Layers 规则），导致文章排版规则被内联的
    // preflight 重置覆盖（列表 padding/margin 归零）。关闭内联以保持分层语义正确。
    inlineSSRStyles: false,
  },

  routeRules: {
    // 静态资源长缓存。注意：这些目录下的文件名不带内容哈希，
    // 因此替换内容时必须同时改名（或加版本查询参数），否则回访用户会一直拿到旧文件。
    '/icon/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/Picture/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/flower/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    // /hero 是首屏 LCP 底图，/fonts 是首屏字体；此前两者回落到默认的
    // max-age=0, must-revalidate，导致每次访问都要发条件请求（多一次往返）。
    '/hero/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  // 静态生成核心配置
  nitro: {
    preset: 'static',
    esbuild: {
      options: { target: 'es2020', treeShaking: true }
    },
    compressPublicAssets: { gzip: true, brotli: true },
    minify: true,
    prerender: {
      autoSubfolderIndex: false,
      crawlLinks: true,
      routes: ['/'],
      failOnError: false,
      // 并行预渲染优化
      concurrency: 10,  // 同时预渲染 10 个页面
      interval: 0       // 无延迟，最大化并行效率
    }
  },

  hooks: {
    // 构建时动态拉取所有文章路由
    async 'prerender:routes'(ctx) {
      try {
        const articles = await fetchAllArticleRoutes(apiBase)
        for (const article of articles) {
          // 注册带 slug 的规范路由,避免预渲染时 301 重定向生成空页面
          const route = buildArticleRoute(article)
          ctx.routes.add(route)
        }
        console.log(`✅ Prerender: registered ${articles.length} article routes`)
      } catch (e) {
        console.error('❌ Failed to fetch article routes for prerender:', e)
      }
    },
    'build:done': () => {
      console.log('✅ Static build completed')
    },
    // 生成 Cloudflare Pages 专用 _headers 文件。
    // 注意：这里是 writeFileSync **整文件覆盖**，它是本站实际生效的那份缓存/安全头
    // 配置 —— 线上实测 / 返回 x-frame-options、permissions-policy 都来自下面的 /* 段，
    // 证明本 hook 的内容最终落地。因此：新增缓存规则必须同时写进这里，
    // 只写上面的 routeRules 是不够的（/hero/** 与 /fonts/** 就曾因此一直回落到
    // 默认的 max-age=0, must-revalidate，已在本文件两处同时补上）。
    'nitro:build:public-assets'(nitro) {
      const headersContent = `
# 静态资源强缓存（1年）
/_nuxt/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/icon/*
  Cache-Control: public, max-age=31536000, immutable

/Picture/*
  Cache-Control: public, max-age=31536000, immutable

/flower/*
  Cache-Control: public, max-age=31536000, immutable

/hero/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable

# HTML 页面缓存（5分钟，CDN 1小时）
/*.html
  Cache-Control: public, max-age=300, s-maxage=3600
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

# 首页特殊处理（更短缓存）
/index.html
  Cache-Control: public, max-age=60, s-maxage=300
  Link: </icon/Myfavicon.ico>; rel=preload; as=image
  Link: <https://cfimg.wasd09090030.top>; rel=preconnect; crossorigin

# 安全头（全局）
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
`.trim()

      const fs = require('fs')
      const path = require('path')
      const headersPath = path.join(nitro.options.output.publicDir, '_headers')
      fs.writeFileSync(headersPath, headersContent)
      console.log('✅ Generated _headers for Cloudflare Pages')
    }
  }
})

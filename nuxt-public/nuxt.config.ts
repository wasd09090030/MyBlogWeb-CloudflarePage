import { buildArticleRoute, fetchAllArticleRoutes, toIsoLastmod } from './build/article-route-data'

const isProduction = process.env.NODE_ENV === 'production'
const enableSourceMap = process.env.NUXT_SOURCEMAP === 'true'
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://wasd09090030.top'
const apiBase = process.env.NUXT_PUBLIC_API_BASE_URL || 'https://backend.wasd09090030.top/api'

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
    '~/assets/css/tailwind.css',
    '~/assets/css/components/prose-custom.css',
    '~/assets/css/layout.css',
    '~/assets/css/app.css',
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
    '@bg-dev/nuxt-naiveui',
    '@nuxtjs/mdc',
    '@nuxtjs/seo',
    'nuxt-vitalizer'
  ],

  vitalizer: {
    disablePrefetchLinks: 'dynamicImports',
    disablePreloadLinks: true,
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

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
      ...(isProduction ? {
        cssnano: {
          preset: ['default', {
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifyGradients: true
          }]
        }
      } : {})
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
        'heroicons:code-bracket',
        'heroicons:magnifying-glass',
        'heroicons:heart',
        'heroicons:chat-bubble-oval-left',
        'heroicons:arrow-left',
        'heroicons:arrow-right',
        'heroicons:chevron-up',
        'heroicons:chevron-down'
      ]
    }
  },

  naiveui: {
    colorModePreference: 'system',
    iconSize: 18,
    themeConfig: {}
  },

  build: {
    transpile: ['@vueuse/core', 'naive-ui']
  },

  vite: {
    worker: { format: 'es' },
    optimizeDeps: {
      include: [
        'vue', 'keen-slider', 'naive-ui', 'katex', '@vueuse/core',
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
            // Markdown 渲染相关（大型库）
            if (id.includes('node_modules/mermaid')) {
              return 'vendor-mermaid'
            }
            // 数学公式渲染
            if (id.includes('node_modules/katex')) {
              return 'vendor-katex'
            }
            // Markdown 插件
            if (id.includes('remark-') || id.includes('rehype-')) {
              return 'vendor-markdown-plugins'
            }
            // UI 库（Naive UI 较大）
            if (id.includes('node_modules/naive-ui')) {
              return 'vendor-ui'
            }
            // 轮播图库
            if (id.includes('node_modules/keen-slider')) {
              return 'vendor-slider'
            }
            // VueUse 工具库
            if (id.includes('node_modules/@vueuse')) {
              return 'vendor-vueuse'
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
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || apiBase,
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
        { rel: 'dns-prefetch', href: 'https://backend.wasd09090030.top' },
        { rel: 'preconnect', href: 'https://cfimg.wasd09090030.top', crossorigin: 'anonymous' },
        { rel: 'preconnect', href: 'https://backend.wasd09090030.top', crossorigin: 'anonymous' }
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
  },

  routeRules: {
    '/icon/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/Picture/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/flower/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
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
    // 新增：生成 Cloudflare Pages 专用 _headers 文件
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

const isProduction = process.env.NODE_ENV === 'production'
const enableSourceMap = process.env.NUXT_SOURCEMAP === 'true'
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://blog.wasd09090030.top'
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
    'katex/dist/katex.min.css',
    'keen-slider/keen-slider.min.css',
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
      weights: [400],
      styles: ['normal', 'italic'],
      subsets: ['latin']
    },
    families: [
      {
        name: 'Open Sans',
        provider: 'local',
        global: true
      }
    ]
  },

  mdc: {
    highlight: {
      theme: {
        default: 'material-theme-lighter',
        dark: 'material-theme-darker'
      },
      langs: [
        'javascript', 'typescript', 'vue', 'vue-html', 'html', 'css', 'scss',
        'json', 'yaml', 'markdown', 'bash', 'shell', 'python', 'java',
        'csharp', 'cpp', 'c', 'sql', 'dockerfile', 'nginx', 'xml', 'diff',
        'dart', 'rust', 'go', 'mermaid'
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
      scan: true
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
        'vue', 'keen-slider', 'naive-ui', 'katex', '@vueuse/core', 'mermaid',
        'remark-math', 'rehype-katex'
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
            if (id.includes('node_modules/mermaid')) return 'vendor-markdown'
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
    exclude: ['/admin/**', '/api/**']
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
        { rel: 'preconnect', href: 'https://cfimg.wasd09090030.top', crossorigin: 'anonymous' }
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
    crossOriginPrefetch: true
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
      failOnError: false
    }
  },

  hooks: {
    // 构建时动态拉取所有文章路由
    async 'prerender:routes'(ctx) {
      try {
        const res = await globalThis.fetch(`${apiBase}/articles`)
        if (!res.ok) throw new Error(`API responded ${res.status}`)
        const articles: { id: number; slug?: string }[] = await res.json()
        for (const article of articles) {
          // 注册带 slug 的规范路由,避免预渲染时 301 重定向生成空页面
          const route = article.slug
            ? `/article/${article.id}-${article.slug}`
            : `/article/${article.id}`
          ctx.routes.add(route)
        }
        console.log(`✅ Prerender: registered ${articles.length} article routes`)
      } catch (e) {
        console.error('❌ Failed to fetch article routes for prerender:', e)
      }
    },
    'build:done': () => {
      console.log('✅ Static build completed')
    }
  }
})

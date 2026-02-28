const isProduction = process.env.NODE_ENV === 'production'
const enableSourceMap = process.env.NUXT_SOURCEMAP === 'true'
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://wasd09090030.top'
const apiBase = process.env.NUXT_PUBLIC_API_BASE_URL || 'https://backend.wasd09090030.top/api'

type ArticleRouteRecord = {
  id: number
  slug?: string | null
  updatedAt?: string | null
  createdAt?: string | null
}

type ArticleRoutePageResponse = {
  data?: unknown
  total?: number
  pageSize?: number
  totalPages?: number
}

const ARTICLE_ROUTE_PAGE_SIZE = 100

const buildArticleRoute = (article: Pick<ArticleRouteRecord, 'id' | 'slug'>): string => {
  return article.slug
    ? `/article/${article.id}-${article.slug}`
    : `/article/${article.id}`
}

const toArticleRouteRecord = (input: unknown): ArticleRouteRecord | null => {
  if (!input || typeof input !== 'object') return null

  const item = input as Record<string, unknown>
  const id = Number(item.id)
  if (!Number.isFinite(id) || id <= 0) return null

  const slug = typeof item.slug === 'string' && item.slug.trim().length > 0
    ? item.slug.trim()
    : null

  const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : null
  const createdAt = typeof item.createdAt === 'string' ? item.createdAt : null

  return {
    id,
    slug,
    updatedAt,
    createdAt
  }
}

const normalizeArticleRouteList = (payload: unknown): ArticleRouteRecord[] => {
  const list = Array.isArray(payload) ? payload : []
  return list
    .map(toArticleRouteRecord)
    .filter((item): item is ArticleRouteRecord => item !== null)
}

const fetchAllArticleRoutes = async (): Promise<ArticleRouteRecord[]> => {
  const dedup = new Map<number, ArticleRouteRecord>()

  let currentPage = 1
  let totalPages = 1
  let pagedApiSucceeded = false

  while (currentPage <= totalPages) {
    const url = `${apiBase}/articles?summary=true&page=${currentPage}&limit=${ARTICLE_ROUTE_PAGE_SIZE}`
    const res = await globalThis.fetch(url)
    if (!res.ok) {
      throw new Error(`API responded ${res.status} while fetching ${url}`)
    }

    const payload = await res.json()
    if (Array.isArray(payload)) {
      for (const article of normalizeArticleRouteList(payload)) {
        dedup.set(article.id, article)
      }
      pagedApiSucceeded = dedup.size > 0
      break
    }

    const pageData = payload as ArticleRoutePageResponse
    const pageItems = normalizeArticleRouteList(pageData.data)
    for (const article of pageItems) {
      dedup.set(article.id, article)
    }
    pagedApiSucceeded = true

    const candidateTotalPages = Number(pageData.totalPages)
    if (Number.isFinite(candidateTotalPages) && candidateTotalPages > 0) {
      totalPages = candidateTotalPages
    } else {
      const total = Number(pageData.total)
      const pageSize = Number(pageData.pageSize) || ARTICLE_ROUTE_PAGE_SIZE
      totalPages = total > 0 ? Math.ceil(total / pageSize) : currentPage
    }

    currentPage += 1
  }

  if (pagedApiSucceeded && dedup.size > 0) {
    return Array.from(dedup.values())
  }

  // 兼容后端未实现 summary/page/limit 的场景
  const fallbackRes = await globalThis.fetch(`${apiBase}/articles`)
  if (!fallbackRes.ok) {
    throw new Error(`API responded ${fallbackRes.status} while fetching fallback /articles`)
  }
  return normalizeArticleRouteList(await fallbackRes.json())
}

const toIsoLastmod = (value?: string | null): string | undefined => {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
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
      // 静态站不存在运行时 /api/_mdc/highlight，避免首访先 404 再回退。
      noApiRoute: true,
      theme: {
        default: 'tokyo-night',
        dark: 'one-dark-pro'
      },
      langs: [
        // 核心 Web 开发语言（高频使用）
        'javascript', 'typescript', 'vue', 'html', 'css',
        // 配置 / 数据格式
        'json', 'yaml', 'bash', 'shell',
        // 后端语言
        'python', 'java', 'csharp', 'sql',
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
    exclude: ['/admin/**', '/api/**'],
    urls: async () => {
      try {
        const articles = await fetchAllArticleRoutes()
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
    // 关闭动态 speculation rules patch，避免控制台持续告警。
    crossOriginPrefetch: false
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
        const articles = await fetchAllArticleRoutes()
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
    }
  }
})

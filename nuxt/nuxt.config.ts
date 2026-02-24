const isProduction = process.env.NODE_ENV === 'production'
const enableSourceMap = process.env.NUXT_SOURCEMAP === 'true'
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://wasd09090030.top'

const immutableAssetHeaders = {
  'cache-control': 'public, max-age=31536000, immutable',
  'cdn-cache-control': 'max-age=31536000'
}

const immutableAssetHeadersNoCdn = {
  'cache-control': 'public, max-age=31536000, immutable'
}

const createSwrHeaders = (maxAge: number, staleWhileRevalidate: number, withCdn = false) => {
  const cacheValue = `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  if (withCdn) {
    return {
      'cache-control': cacheValue,
      'cdn-cache-control': cacheValue
    }
  }

  return {
    'cache-control': cacheValue
  }
}

export default defineNuxtConfig({
  compatibilityDate: '2026-01-09',
  devtools: { enabled: true },
  // 通过 NUXT_SOURCEMAP=true 按需开启 sourcemap
  sourcemap: enableSourceMap,

  // TypeScript 迁移期配置（渐进 JS -> TS）
  // - 不强制全量 TS：允许 app/ 内仍存在 .js 文件
  // - 先关闭 strict，避免迁移初期被类型错误阻塞
  typescript: {
    strict: false,
    // 通过 nuxt.config 扩展 Nuxt 生成的 tsconfig（不建议直接改 tsconfig.json）
    tsConfig: {
      compilerOptions: {
        allowJs: true,
        checkJs: false
      }
    }
  },

  // CSS配置 - 使用 Tailwind Typography
  css: [
    '~/assets/css/theme-variables.css',
    '~/assets/css/tailwind.css', // Tailwind CSS 入口文件
    'katex/dist/katex.min.css', // KaTeX 数学公式样式
    'keen-slider/keen-slider.min.css',
    '~/assets/css/components/prose-custom.css', // 自定义 prose 样式
    '~/assets/css/layout.css', // 自定义布局工具类
    '~/assets/css/app.css',
  ],

  // 组件目录配置 - content/ 下的组件不添加路径前缀，以便 MDC 正确解析
  components: {
    dirs: [
      { path: '~/components/content', pathPrefix: false, global: true },
      '~/components'
    ]
  },

  // 模块配置
  modules: [
    '@pinia/nuxt',
    '@nuxt/icon', // Nuxt Icon 模块
    '@nuxt/fonts', // Nuxt Fonts 模块
    '@bg-dev/nuxt-naiveui', // Naive UI 模块
    '@nuxtjs/mdc', // MDC Markdown 渲染模块
    '@nuxtjs/seo', // Nuxt SEO 模块
    'nuxt-vitalizer' // Core Web Vitals LCP 优化
  ],

  // LCP/SI 优化 - Nuxt Vitalizer
  vitalizer: {
    // 默认只关闭动态导入的 prefetch；可选 true 关闭所有 prefetch
    disablePrefetchLinks: 'dynamicImports',
    // 移除构建资源的 preload，降低首屏请求数量
    disablePreloadLinks: true,
    // 保留 entry 样式，避免在部分路由出现样式缺失
    disableStylesheets: false
  },

  // 字体配置（本地化）
  fonts: {
    // 仅使用本地字体提供者，避免任何外部请求
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

  pinia: {
    // Nuxt 4 使用 app/ 目录，需要明确指定 store 目录
    storesDirs: ['./app/stores']
  },

  // MDC 模块配置
  mdc: {
    highlight: {
      theme: {
        default: 'material-theme-lighter',
        dark: 'material-theme-darker'
      },
      langs: [
        'javascript',
        'typescript',
        'vue',
        'vue-html',
        'html',
        'css',
        'scss',
        'json',
        'yaml',
        'markdown',
        'bash',
        'shell',
        'python',
        'java',
        'csharp',
        'cpp',
        'c',
        'sql',
        'dockerfile',
        'nginx',
        'xml',
        'diff',
        'dart',
        'rust',
        'go',
        'mermaid'
      ]
    },
    // 数学公式支持
    remarkPlugins: {
      'remark-math': {
        src: 'remark-math',
        options: {
          singleDollarTextMath: true
        }
      }
    },
    rehypePlugins: {
      'rehype-katex': {
        src: 'rehype-katex',
        options: {}
      }
    },
    // 标题锚点链接
    headings: {
      anchorLinks: {
        h1: false,
        h2: true,
        h3: true,
        h4: true,
        h5: false,
        h6: false
      }
    }
  },

  // PostCSS 配置
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
      // 生产环境CSS优化
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

  // Nuxt Icon 配置
  icon: {
    // 修改 API 前缀，避免与 /api/ 冲突
    serverBundle: {
      collections: ['heroicons', 'mdi']
    },
    // 自定义图标 API 路径前缀（不使用 /api/ 以避免与后端 API 冲突）
    provider: 'server',
    serverKnownCssClasses: ['nuxt-icon']
  },

  // Naive UI 配置
  naiveui: {
    colorModePreference: 'system',
    iconSize: 18,
    themeConfig: {}
  },

  // 依赖配置
  build: {
    // 优化构建分析
    analyze: true,
    // 提升构建性能
    transpile: ['@vueuse/core', 'naive-ui']
  },

  // Vite配置 - 深度优化
  vite: {
    // Web Worker 配置
    worker: {
      format: 'es'
    },
    optimizeDeps: {
      include: [
        'vue',
        'keen-slider',
        'naive-ui',
        'katex',
        '@vueuse/core',
        'mermaid',
        'remark-math',
        'rehype-katex'
      ],
      // 排除不需要预构建的依赖
      exclude: ['vue-demi']
    },
    define: {
      global: 'globalThis'
    },
    build: {
      // 改进 treeshaking 与模块预加载
      modulePreload: { polyfill: true },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true, // 生产环境移除 console.log
          drop_debugger: true, // 生产环境移除 debugger
          pure_funcs: ['console.log', 'console.info', 'console.debug'],
          passes: 2 // 多次压缩优化
        },
        mangle: {
          safari10: true // Safari 10 兼容
        },
        format: {
          comments: false // 移除注释
        }
      },
      // 代码分割优化 - 简化版避免循环依赖
      rollupOptions: {
        treeshake: {
          preset: 'recommended'
        },
        output: {
          manualChunks(id) {
            // 仅分割不会导致循环依赖的大型库
            if (id.includes('node_modules/mermaid')) {
              return 'vendor-markdown';
            }
            // Vue/Naive UI 让 Nuxt 自动处理，避免初始化顺序问题
          }
        }
      },
      // 设置警告阈值
      chunkSizeWarningLimit: 1500,
      // 启用CSS代码分割
      cssCodeSplit: true,
      // 通过 NUXT_SOURCEMAP=true 按需开启 sourcemap
      sourcemap: enableSourceMap,
      // 目标浏览器
      target: 'es2020'
    },
    // CSS处理优化
    css: {
      devSourcemap: false
    },
    // 服务器优化（开发环境）
    server: {
      warmup: {
        clientFiles: [
          './pages/index.vue',
          './components/SideBar.vue',
          './layouts/default.vue'
        ]
      }
    }
  },

  // 运行时配置
  runtimeConfig: {
    // 私有配置（服务器端）
    apiSecret: process.env.API_SECRET,
    // SSR 时的 API 地址：优先使用 NUXT_API_BASE_URL，否则与客户端保持一致
    apiBaseServer: process.env.NUXT_API_BASE_URL
      || process.env.NUXT_PUBLIC_API_BASE_URL
      || (isProduction ? 'http://127.0.0.1:5000/api' : 'http://127.0.0.1:5000/api'),

    // 公共配置（客户端+服务器端）
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL
        || (isProduction ? '/api' : 'http://localhost:5000/api'),
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL
        || (isProduction ? 'https://wasd09090030.top' : 'http://localhost:3000')
    }
  },

  // 站点信息（供 SEO 模块使用）
  site: {
    url: siteUrl,
    name: 'WyrmKk',
    description: '分享技术、生活与创作的个人博客',
    defaultLocale: 'zh-CN'
  },

  robots: {
    // 使用 public/robots.txt，避免第三方注入非标准指令导致校验报错
    robotsTxt: false,
    disallow: !isProduction
      ? ['/']
      : ['/admin/**', '/api/**']
  },

  sitemap: {
    exclude: ['/admin/**', '/api/**'],
    sources: ['/api/__sitemap__/urls']
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

  // 应用配置
  app: {
    // 混合架构：SSR 资源路径改为 /_ssr/，避免与 Cloudflare Pages 的 /_nuxt/ 冲突
    buildAssetsDir: '/_ssr/',
    // 页面过渡动画优化
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
        // 性能优化meta
        { 'http-equiv': 'x-dns-prefetch-control', content: 'on' }
      ],
            link: [
        { rel: 'icon', type: 'image/x-icon', href: '/icon/Myfavicon.ico' },
        // DNS 预解析 - 加速外部资源加载
        { rel: 'dns-prefetch', href: 'https://cfimg.wasd09090030.top' },
        { rel: 'dns-prefetch', href: 'https://s41.ax1x.com' },
        { rel: 'dns-prefetch', href: 'https://static.cloudflareinsights.com' },
        // 预连接关键 CDN
        { rel: 'preconnect', href: 'https://cfimg.wasd09090030.top', crossorigin: 'anonymous' }
      ]
    }
  },

  // 页面过渡配置（移到app内部）
  // pageTransition 和 layoutTransition 已移至 app.pageTransition 和 app.layoutTransition

  // 实验性功能
  experimental: {
    // SSR 动态站点不需要 payload 提取（避免 404 警告）
    payloadExtraction: false,
    renderJsonPayloads: false,
    viewTransition: true,
    // 启用内联路由规则
    inlineRouteRules: true,
    // 组件岛屿（可选）
    componentIslands: false,
    // 异步上下文
    asyncContext: true,
    // 头部优化
    headNext: true,
    // 跨域请求fetch
    crossOriginPrefetch: true,
    // 写早期提示
    writeEarlyHints: true
  },

  // 路由配置优化
  routeRules: {
    // 静态资源使用强缓存（1年）
    '/icon/**': { 
      headers: { 
        ...immutableAssetHeaders
      } 
    },
    '/Picture/**': { 
      headers: { 
        ...immutableAssetHeaders
      } 
    },
    '/flower/**': {
      headers: {
        ...immutableAssetHeadersNoCdn
      }
    },
    '/pointer/**': {
      headers: {
        ...immutableAssetHeadersNoCdn
      }
    },
    // API路由配置
    '/api/**': { 
      cors: true,
      headers: {
        'cache-control': 'no-cache, no-store, must-revalidate'
      }
    },
    // 首页 SWR 缓存（1分钟，后台可重验证 5 分钟）
    '/': {
      ssr: true,
      headers: createSwrHeaders(60, 300)
    },
    // 🔥 文章页面 SWR 缓存（5分钟，后台可重验证 1 小时）
    '/article/**': {
      ssr: true,
      headers: createSwrHeaders(300, 3600, true)
    },
    // 画廊页面 SWR 缓存（3分钟）
    '/gallery': {
      ssr: true,
      headers: createSwrHeaders(180, 600)
    },
    // 关于页面较长缓存（10分钟）
    '/about': {
      ssr: true,
      headers: createSwrHeaders(600, 1800)
    },
    // 教程页面 SWR 缓存
    '/tutorials': {
      ssr: true,
      headers: createSwrHeaders(300, 3600)
    }
  },

  // SSR配置
  nitro: {
    preset: 'node-server',
    esbuild: {
      options: {
        target: 'es2020',
        treeShaking: true 
      }
    },
    // 启用压缩
    compressPublicAssets: {
      gzip: true,
      brotli: true
    },
    // 优化服务器输出
    minify: true,
    // 仅预渲染首页，避免全站 crawl
    prerender: {
      crawlLinks: false,
      routes: [],
      // 忽略 payload.json 的 404 错误（SSR模式下正常）
      failOnError: false
    },
    // 服务端端存储缓存（增强版）
    storage: {
      cache: {
        driver: 'lruCache',
        max: 1000,          // 增加到 1000 个条目
        ttl: 300            // 5 分钟过期
      }
    },
    // 路由缓存
    routeRules: {
      '/_ssr/**': {
        headers: {
          'cache-control': 'public, max-age=31536000, immutable'
        }
      }
    },
    // 静态资源处理
    publicAssets: [
      {
        dir: 'public',
        maxAge: 60 * 60 * 24 * 365 // 1年
      }
    ]
  },

  // 优化Hooks
  hooks: {
    // 构建完成后优化
    'build:done': () => {
      console.log('✅ Build completed with optimizations')
    }
  }
})

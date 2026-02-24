# Nuxt SEO 改造记录

日期：2026-01-28

本文档记录本次在 `nuxt/` 前端集成 `@nuxtjs/seo` 的改造过程、修改的文件内容以及实现效果。

## 一、改造目标

- 接入 `@nuxtjs/seo`，统一并提升站点 SEO 能力。
- 新增动态 sitemap 源（文章 URL 自动生成）。
- 为文章页补充 Schema.org（Article + BreadcrumbList）。
- 提供可替换的 OG 占位图方案。

## 二、改造过程（概要）

1) 安装与接入 `@nuxtjs/seo` 模块，并配置站点基础信息。  
2) 全局 SEO 元数据迁移到 `useSeoMeta`，避免 `app.head` 与 `app.vue` 重复输出。  
3) 文章页增强 SEO：完善 OG/Twitter 图片处理，补充 Schema.org。  
4) 新增动态 sitemap 源接口：从后端文章列表生成 URL。  
5) 修复 `@nuxtjs/sitemap/runtime` 导出路径在 dev 环境的报错。  

## 三、修改的文件清单

- `nuxt/package.json`
- `nuxt/nuxt.config.ts`
- `nuxt/app/app.vue`
- `nuxt/app/pages/article/[id].vue`
- `nuxt/server/api/__sitemap__/urls.get.ts`（新增）
- `nuxt/public/og-default.svg`（新增）

## 四、关键修改内容（摘录）

### 1) `nuxt/package.json`

新增依赖：

```json
"@nuxtjs/seo": "^3.0.0"
```

### 2) `nuxt/nuxt.config.ts`

模块接入：

```ts
modules: [
  '@pinia/nuxt',
  'motion-v/nuxt',
  '@nuxt/icon',
  '@bg-dev/nuxt-naiveui',
  '@nuxtjs/mdc',
  '@nuxtjs/seo'
],
```

站点与 SEO 配置：

```ts
site: {
  url: process.env.NUXT_PUBLIC_SITE_URL || 'https://wasd09090030.top',
  name: 'WyrmKk',
  description: '分享技术、生活与创作的个人博客',
  defaultLocale: 'zh-CN'
},

seoUtils: {
  autoIcons: true,
  fallbackTitle: true,
  titleSeparator: '·'
},

robots: {
  disallow: process.env.NODE_ENV !== 'production'
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
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://wasd09090030.top',
    sameAs: [
      process.env.NUXT_PUBLIC_TWITTER_URL || 'https://x.com/wyrmwyrm1',
      process.env.NUXT_PUBLIC_GITHUB_URL || 'https://github.com/wasd09090030'
    ].filter(Boolean)
  },
  reactive: true
},
```

`app.head` 精简为基础项（避免与 `useSeoMeta` 重复）：

```ts
app: {
  head: {
    title: 'WyrmKk',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' },
      { name: 'theme-color', content: '#1a1a1a', media: '(prefers-color-scheme: dark)' },
      { 'http-equiv': 'x-dns-prefetch-control', content: 'on' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/icon/Myfavicon.ico' },
      { rel: 'dns-prefetch', href: 'https://fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: 'https://fonts.gstatic.com' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com', crossorigin: '' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
    ]
  }
}
```

### 3) `nuxt/app/app.vue`

全局 SEO 元数据集中在 `useSeoMeta`：

```vue
<script setup>
const defaultDescription = '分享技术、生活与创作的个人博客'

useSeoMeta({
  title: 'WyrmKk',
  titleTemplate: '%s · WyrmKk',
  description: defaultDescription,
  keywords: '博客,技术,前端,后端,Vue,JavaScript,Python,动漫资源',
  author: 'WASD09090030',
  ogType: 'website',
  ogSiteName: 'WyrmKk',
  ogTitle: 'WyrmKk - 个人网站',
  ogDescription: defaultDescription,
  ogImage: '/og-default.svg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'WyrmKk - 个人技术博客',
  twitterDescription: defaultDescription,
  twitterImage: '/og-default.svg'
})

useHead({
  htmlAttrs: { lang: 'zh-CN' },
  meta: [{ name: 'format-detection', content: 'telephone=no' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap' }
  ]
})
</script>
```

### 4) `nuxt/app/pages/article/[id].vue`

补充 Schema.org + 统一 URL 处理：

```vue
const baseSiteUrl = computed(() => (config.public.siteUrl || '').replace(/\/$/, ''))
const canonicalUrl = computed(() => {
  if (!canonicalPath.value) return ''
  return `${baseSiteUrl.value}${canonicalPath.value}`
})

const resolveUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (!baseSiteUrl.value) return value
  if (value.startsWith('/')) return `${baseSiteUrl.value}${value}`
  return `${baseSiteUrl.value}/${value}`
}

useSeoMeta({
  title: () => article.value?.title || '文章详情',
  description: () => article.value?.aiSummary || getDescription(article.value?.content),
  ogTitle: () => article.value?.title || '文章详情',
  ogDescription: () => article.value?.aiSummary || getDescription(article.value?.content),
  ogImage: () => {
    const image = article.value?.coverImage
    return image && image !== 'null' ? image : undefined
  },
  ogUrl: () => canonicalUrl.value || undefined,
  ogType: 'article',
  twitterImage: () => {
    const image = article.value?.coverImage
    return image && image !== 'null' ? image : undefined
  }
})

const schemaGraph = computed(() => {
  if (!article.value) return []
  const title = article.value?.title || '文章详情'
  const description = article.value?.aiSummary || getDescription(article.value?.content)
  const imageUrl = resolveUrl(article.value?.coverImage && article.value?.coverImage !== 'null'
    ? article.value.coverImage
    : '/og-default.svg')
  const articleUrl = canonicalUrl.value || resolveUrl(canonicalPath.value)
  const siteUrl = baseSiteUrl.value || resolveUrl('/')

  return [
    {
      '@type': 'Article',
      headline: title,
      description,
      image: imageUrl,
      author: {
        '@type': 'Person',
        name: 'WyrmKk',
        url: siteUrl
      },
      datePublished: article.value?.createdAt,
      dateModified: article.value?.updatedAt || article.value?.createdAt,
      mainEntityOfPage: articleUrl
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: title, item: articleUrl }
      ]
    }
  ]
})

useSchemaOrg(schemaGraph)
```

### 5) `nuxt/server/api/__sitemap__/urls.get.ts`

动态 sitemap 源（从后端文章列表生成 URL）：  

```ts
import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const apiBase = (config.public.apiBase || '').replace(/\/$/, '')
  if (!apiBase) return []

  try {
    const response = await $fetch<{ data?: ArticleSummary[] } | ArticleSummary[]>(
      `${apiBase}/articles`,
      { query: { summary: true } }
    )
    const articles = Array.isArray(response) ? response : response?.data || []

    return articles.map((article) => ({
      loc: `/article/${article.id}${article.slug ? `-${article.slug}` : ''}`,
      lastmod: article.updatedAt || article.createdAt,
      changefreq: 'weekly',
      priority: 0.8
    }))
  } catch (error) {
    console.warn('[sitemap] Failed to fetch article list', error)
    return []
  }
})
```

说明：使用 `defineEventHandler` 替代 `@nuxtjs/sitemap/runtime` 的导入，避免 dev 环境 `ERR_PACKAGE_PATH_NOT_EXPORTED` 报错。

### 6) `nuxt/public/og-default.svg`

新增默认 OG 占位图（可替换为正式设计稿）：  

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1020" cy="140" r="120" fill="#1f2937"/>
  <circle cx="1060" cy="100" r="60" fill="#2563eb"/>
  <text x="80" y="260" fill="#f8fafc" font-size="64" font-family="'Inter', 'Segoe UI', Arial, sans-serif" font-weight="700">WyrmKk</text>
  <text x="80" y="330" fill="#cbd5f5" font-size="32" font-family="'Inter', 'Segoe UI', Arial, sans-serif" font-weight="500">分享技术、生活与创作的个人博客</text>
  <text x="80" y="420" fill="#94a3b8" font-size="24" font-family="'Inter', 'Segoe UI', Arial, sans-serif">wasd09090030.top</text>
</svg>
```

## 五、实现效果

- 全局 SEO 元信息统一由 `useSeoMeta` 管理，避免重复与冲突。
- 自动生成 `robots.txt` / `sitemap.xml`，并接入动态文章 URL。
- 文章详情页输出 Article + BreadcrumbList 结构化数据。
- 无封面图页面使用默认 OG 占位图。

## 六、验证建议

- `http://localhost:3000/robots.txt`
- `http://localhost:3000/sitemap.xml`
- `http://localhost:3000/api/__sitemap__/urls`
- `http://localhost:3000/__sitemap__/debug.json`

若开发环境下 `sitemap.xml` 为 0 URLs，通常是后端未启动或 `NUXT_PUBLIC_API_BASE_URL` 无法访问。启动后端或修正环境变量即可。

## 七、环境变量参考

```bash
NUXT_PUBLIC_SITE_URL=https://wasd09090030.top
NUXT_PUBLIC_API_BASE_URL=https://blog.wasd09090030.top/api
NUXT_PUBLIC_TWITTER_URL=https://x.com/wyrmwyrm1
NUXT_PUBLIC_GITHUB_URL=https://github.com/wasd09090030
```

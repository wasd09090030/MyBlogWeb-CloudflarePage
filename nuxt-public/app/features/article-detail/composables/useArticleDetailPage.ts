import { consumePreloadedArticle } from '~/utils/articlePreloadCache'
import { createArticleDetailRepository } from '~/features/article-detail/services/articleDetail.repository'
import { logAppError, toNuxtErrorPayload } from '~/shared/errors'
import { buildArticleAsyncDataKey } from '~/shared/cache/keys'

/**
 * 文章详情页组合式逻辑：
 * 1) 数据加载与缓存复用；
 * 2) 规范 slug 重定向；
 * 3) SEO / Schema 生成；
 * 4) 目录 TOC 标准化。
 */
export const useArticleDetailPage = async () => {
  const repository = createArticleDetailRepository()
  const route = useRoute()
  const router = useRouter()
  const config = useRuntimeConfig()

  // 路由格式约定：/article/:id-:slug，其中 slug 可选。
  const rawIdParam = computed(() => String(route.params.id || ''))
  const articleId = computed(() => rawIdParam.value.split('-')[0])
  const routeSlug = computed(() => rawIdParam.value.split('-').slice(1).join('-'))

  const { data: article, pending, error } = await useAsyncData(
    buildArticleAsyncDataKey(String(route.params.id || '')),
    async () => {
      const id = articleId.value
      if (!id || !/^\d+$/.test(id)) {
        throw createError(toNuxtErrorPayload({ statusCode: 400, statusMessage: '未提供文章ID' }))
      }

      let response: Record<string, unknown> | null = null
      try {
        response = await repository.getArticleById(id)
      } catch (fetchError) {
        logAppError('article-detail', '加载文章详情', fetchError)
        throw createError(
          toNuxtErrorPayload(fetchError, {
            fallback: '文章加载失败',
            notFound: '文章不存在'
          })
        )
      }

      if (!response) {
        throw createError(toNuxtErrorPayload({ statusCode: 404, statusMessage: '文章不存在' }))
      }

      return response
    },
    {
      // id 变更时自动刷新详情。
      watch: [articleId],
      // 不阻塞路由切换，交由页面内 pending 状态处理。
      lazy: true,
      getCachedData: (key, nuxtApp, ctx) => {
        // 手动刷新应强制走网络，避免取到旧 payload。
        if (ctx?.cause === 'refresh:manual') return undefined

        if (import.meta.client) {
          // 优先消费预加载缓存（例如列表页 hover/预取）。
          const preloaded = consumePreloadedArticle(key)
          if (preloaded) {
            console.log('[ArticlePage] 命中预加载缓存，跳过 fetch + parseMarkdown')
            return preloaded
          }
        }

        // 回退到 Nuxt 内置 payload/static 缓存。
        return nuxtApp.payload?.data?.[key] ?? nuxtApp.static?.data?.[key]
      }
    }
  )

  const canonicalPath = computed(() => {
    if (!article.value) return ''
    if (!(article.value as { slug?: string }).slug) return `/article/${(article.value as { id?: string | number }).id}`
    const detail = article.value as { id?: string | number; slug?: string }
    return `/article/${detail.id}-${detail.slug}`
  })

  const baseSiteUrl = computed(() => (config.public.siteUrl || '').replace(/\/$/, ''))
  const canonicalUrl = computed(() => {
    if (!canonicalPath.value) return ''
    return `${baseSiteUrl.value}${canonicalPath.value}`
  })

  // 统一将相对地址转换为绝对地址，供 meta/schema 使用。
  const resolveUrl = (value: string | undefined | null): string => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value
    if (!baseSiteUrl.value) return value
    if (value.startsWith('/')) return `${baseSiteUrl.value}${value}`
    return `${baseSiteUrl.value}/${value}`
  }

  let isRedirectingToCanonical = false
  const ensureCanonicalSlug = async () => {
    const slug = (article.value as { slug?: string } | null)?.slug
    // 仅在“路由 slug 与后端 slug 不一致”时执行 301 规范化跳转。
    if (!slug || routeSlug.value === slug || isRedirectingToCanonical) return
    isRedirectingToCanonical = true
    try {
      await navigateTo({ path: canonicalPath.value, query: route.query }, { redirectCode: 301 })
    } finally {
      isRedirectingToCanonical = false
    }
  }

  await ensureCanonicalSlug()
  watch([articleId, () => (article.value as { slug?: string } | null)?.slug], () => {
    void ensureCanonicalSlug()
  })

  if (error.value) {
    throw createError(toNuxtErrorPayload(error.value, { fallback: '文章加载失败' }))
  }

  const normalizeTocToHeadings = (toc: unknown): Array<{ id: string; text: string; level: number }> => {
    if (!toc) return []

    // 兼容两种结构：数组或 { links } 容器。
    const tocLinks = Array.isArray(toc)
      ? toc
      : (toc as { links?: unknown[] })?.links || []

    const toHeadingLevel = (value: unknown, fallback: number): number => {
      const parsed = Number(value)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
    }

    const convertLinks = (links: unknown[], parentLevel = 1): Array<{ id: string; text: string; level: number }> => {
      const result: Array<{ id: string; text: string; level: number }> = []
      for (const link of links) {
        const item = link as { id?: string; text?: string; depth?: number; level?: number; children?: unknown[] }
        if (!item?.id || !item?.text) continue
        const currentLevel = toHeadingLevel(item.depth ?? item.level, parentLevel + 1)
        result.push({ id: item.id, text: item.text, level: currentLevel })
        if (item.children?.length) {
          result.push(...convertLinks(item.children, currentLevel))
        }
      }
      return result
    }

    return convertLinks(tocLinks)
  }

  const headings = ref<Array<{ id: string; text: string; level: number }>>([])

  watch(
    () => (article.value as { _mdcToc?: unknown } | null)?._mdcToc,
    (toc) => {
      if (!toc) return
      // 已从渲染器回调拿到目录时，不再覆盖，避免两路更新抖动。
      if (headings.value.length > 0) return
      const normalized = normalizeTocToHeadings(toc)
      if (normalized.length > 0) {
        headings.value = normalized
      }
    },
    { immediate: true }
  )

  const getDescription = (content: string | undefined | null, maxLength = 160): string => {
    if (!content) return '文章详情'
    const text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
  }

  useSeoMeta({
    title: () => (article.value as { title?: string } | null)?.title || '文章详情',
    description: () => (article.value as { aiSummary?: string; content?: string } | null)?.aiSummary || getDescription((article.value as { content?: string } | null)?.content),
    ogTitle: () => (article.value as { title?: string } | null)?.title || '文章详情',
    ogDescription: () => (article.value as { aiSummary?: string; content?: string } | null)?.aiSummary || getDescription((article.value as { content?: string } | null)?.content),
    ogImage: () => {
      const image = (article.value as { coverImage?: string } | null)?.coverImage
      return image && image !== 'null' ? image : undefined
    },
    ogUrl: () => canonicalUrl.value || undefined,
    ogType: 'article',
    twitterImage: () => {
      const image = (article.value as { coverImage?: string } | null)?.coverImage
      return image && image !== 'null' ? image : undefined
    }
  })

  useHead(() => ({
    link: canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : []
  }))

  const schemaGraph = computed(() => {
    if (!article.value) return []

    const detail = article.value as {
      title?: string
      aiSummary?: string
      content?: string
      coverImage?: string
      createdAt?: string
      updatedAt?: string
    }

    const title = detail.title || '文章详情'
    const description = detail.aiSummary || getDescription(detail.content)
    const imageUrl = resolveUrl(detail.coverImage && detail.coverImage !== 'null'
      ? detail.coverImage
      : '/og-default.svg')
    const articleUrl = canonicalUrl.value || resolveUrl(canonicalPath.value)
    const siteUrl = baseSiteUrl.value || resolveUrl('/')

    // 同时输出 Article 与 BreadcrumbList，提升搜索引擎理解度。
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
        datePublished: detail.createdAt,
        dateModified: detail.updatedAt || detail.createdAt,
        mainEntityOfPage: articleUrl
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '首页',
            item: siteUrl
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: articleUrl
          }
        ]
      }
    ]
  })

  useSchemaOrg(schemaGraph)

  const goBack = () => {
    // 优先复用浏览器历史，缺历史时回首页兜底。
    if (import.meta.client && window.history.length > 1) {
      router.back()
    } else {
      navigateTo('/')
    }
  }

  const onTocReady = (toc: unknown) => {
    const normalized = normalizeTocToHeadings(toc)
    if (normalized.length > 0) {
      headings.value = normalized
    }
  }

  return {
    article,
    pending,
    error,
    headings,
    goBack,
    onTocReady
  }
}

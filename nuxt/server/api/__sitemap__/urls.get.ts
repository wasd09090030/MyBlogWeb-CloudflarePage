import { defineEventHandler } from 'h3'

type ArticleSummary = {
  id: number
  slug?: string | null
  createdAt?: string
  updatedAt?: string
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const apiBaseServer = String(config.apiBaseServer || '').replace(/\/$/, '')
  const apiBase = String(config.public.apiBase || '').replace(/\/$/, '')
  const siteUrl = String(config.public.siteUrl || '').replace(/\/$/, '')

  if (!apiBaseServer && !apiBase) {
    return []
  }

  const resolvedApiBase = apiBaseServer
    || (/^https?:\/\//i.test(apiBase)
      ? apiBase
      : `${siteUrl}${apiBase.startsWith('/') ? apiBase : `/${apiBase}`}`)

  if (!resolvedApiBase || !/^https?:\/\//i.test(resolvedApiBase)) {
    console.warn('[sitemap] Invalid apiBase for sitemap source', { apiBase, siteUrl })
    return []
  }

  try {
    const response = await $fetch<{
      data?: ArticleSummary[]
    } | {
      data?: {
        data?: ArticleSummary[]
      }
    } | ArticleSummary[]>(`${resolvedApiBase}/articles`, {
      query: { summary: true }
    })

    const articles = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
        ? response.data
        : response?.data?.data || []

    return articles.map((article) => {
      const slugSuffix = article.slug ? `-${article.slug}` : ''
      return {
        loc: `/article/${article.id}${slugSuffix}`,
        lastmod: article.updatedAt || article.createdAt,
        changefreq: 'weekly',
        priority: 0.8
      }
    })
  } catch (error) {
    console.warn('[sitemap] Failed to fetch article list', {
      api: `${resolvedApiBase}/articles?summary=true`,
      error
    })
    return []
  }
})

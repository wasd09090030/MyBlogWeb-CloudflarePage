import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { defineEventHandler, getRouterParam, createError } from 'h3'

type ArticleDetailResponse = Record<string, unknown> & {
  contentMarkdown?: string | null
  _mdcAst?: unknown
  _mdcToc?: unknown
}

function normalizeArticleId(raw?: string): string {
  const [id = ''] = String(raw || '').split('-')
  return id
}

export default defineEventHandler(async (event) => {
  const rawParam = getRouterParam(event, 'id') || ''
  const articleId = normalizeArticleId(rawParam)

  if (!articleId || !/^\d+$/.test(articleId)) {
    throw createError({ statusCode: 400, statusMessage: '无效的文章 ID' })
  }

  const config = useRuntimeConfig()
  const apiBase = (config.public.apiBase || '').replace(/\/$/, '')

  if (!apiBase) {
    throw createError({ statusCode: 500, statusMessage: '未配置 API_BASE' })
  }

  let response: ArticleDetailResponse | null = null
  try {
    response = await $fetch<ArticleDetailResponse>(`${apiBase}/articles/${articleId}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({ statusCode: 502, statusMessage: `获取文章失败: ${message}` })
  }

  if (!response) {
    throw createError({ statusCode: 404, statusMessage: '文章不存在' })
  }

  if (typeof response.contentMarkdown === 'string' && response.contentMarkdown.trim().length > 0) {
    try {
      const ast = await parseMarkdown(response.contentMarkdown, {
        highlight: {
          theme: {
            default: 'material-theme-lighter',
            dark: 'material-theme-darker'
          }
        },
        toc: {
          depth: 4,
          searchDepth: 4
        }
      })

      response._mdcAst = ast
      response._mdcToc = ast?.toc
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[server/api/articles/[id]] Markdown 解析失败:', message)
    }
  }

  return response
})

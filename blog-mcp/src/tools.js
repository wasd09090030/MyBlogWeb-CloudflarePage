/**
 * 工具表：每个条目就是一条「MCP 工具 → blog-api 请求」的声明。
 *
 * 约定（Review Focus 已定）：
 * - `id` / `date` 只出现在路径里，绝不进 body；
 * - 16 个工具；其中 3 个是删除工具，必须带 `confirm` 回填目标值，其余只读或写入/覆盖；
 * - body / query 只带调用方真正传了的字段，`undefined` 一律不发送；
 * - `image_upload` 先本地校验再发请求，校验失败时一个字节都不会上传。
 */
import { z } from 'zod'
import { validateUploadPath } from './upload.js'

/**
 * @typedef {import('./api.js').ApiClient} ApiClient
 * @typedef {object} ToolDef
 * @property {string} name
 * @property {string} description
 * @property {Record<string, z.ZodTypeAny>} inputSchema
 * @property {(args: Record<string, any>, api: ApiClient) => Promise<unknown>} run
 */

const ARTICLE_CATEGORIES = ['study', 'game', 'work', 'resource', 'other']

/** 文章的可写字段。`id` 不在其中：它只通过路径传递。 */
const ARTICLE_BODY_KEYS = ['title', 'contentMarkdown', 'slug', 'category', 'tags', 'coverImage', 'aiSummary']
const GALLERY_CREATE_BODY_KEYS = ['imageUrl', 'tag', 'sortOrder', 'isActive']
const GALLERY_UPDATE_BODY_KEYS = ['imageUrl', 'tag', 'sortOrder', 'isActive', 'createdAt']
const DIARY_BODY_KEYS = ['contentMarkdown', 'mood', 'weather', 'location', 'tags', 'isPublic']

/**
 * 直通式工具：把 schema 里的字段挑出来拼成 query 或 body，再交给 api.request。
 * opts 始终存在（哪怕是 `{}`），这样调用方的记录形状稳定。
 *
 * @param {string} method
 * @param {(args: Record<string, any>) => string} pathFor
 * @param {{ queryKeys?: string[], bodyKeys?: string[] }} [options]
 */
function endpoint(method, pathFor, { queryKeys = [], bodyKeys = [] } = {}) {
  return async (args, api) => {
    const query = {}
    for (const key of queryKeys) if (args[key] !== undefined) query[key] = args[key]
    const body = {}
    for (const key of bodyKeys) if (args[key] !== undefined) body[key] = args[key]
    const opts = {}
    if (Object.keys(query).length) opts.query = query
    if (Object.keys(body).length) opts.body = body
    return await api.request(method, pathFor(args), opts)
  }
}

/** 可选的字符串字段；空串按未填写处理，避免把 `""` 写进线上数据。 */
const optionalText = () => z.string().min(1).optional()
/** 可清空的文本字段：传 null 表示清空；省略表示不修改。 */
const clearableText = () => z.string().min(1).nullable().optional()

/** 危险操作护栏：confirm 必须原样回填目标值，否则在发请求之前就拒绝。 */
function requireDeleteConfirm(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`危险操作已拒绝：confirm 必须等于${label} ${JSON.stringify(expected)}，收到 ${JSON.stringify(actual)}。请先向用户确认再调用。`)
  }
}
/** 可分页列表的通用入参。 */
const PAGE_QUERY_KEYS = ['page', 'pageSize']

/** @type {ToolDef[]} */
export const tools = [
  {
    name: 'article_list',
    description: '分页列出博客文章的元信息（标题、slug、分类、标签、发布时间、字数），不含正文。只读，不修改任何数据。',
    inputSchema: {
      page: z.number().int().positive().optional().describe('页码，默认 1'),
      pageSize: z.number().int().positive().max(50).optional().describe('每页条数，默认 20，最大 50')
    },
    run: endpoint('GET', () => '/api/mcp/articles', { queryKeys: PAGE_QUERY_KEYS })
  },
  {
    name: 'article_get',
    description: '按 id 读取单篇文章全文（含 Markdown 正文、摘要、封面与时间戳）。只读。',
    inputSchema: {
      id: z.number().int().positive().describe('文章 id')
    },
    run: endpoint('GET', args => `/api/mcp/articles/${args.id}`)
  },
  {
    name: 'article_create',
    description: '新建博客文章。这会直接修改线上数据，创建后公开站需重建才会出现。slug 会自动去重。',
    inputSchema: {
      title: z.string().min(1).describe('文章标题'),
      contentMarkdown: z.string().min(1).describe('文章 Markdown 正文'),
      slug: optionalText().describe('URL 短名，省略时由标题生成'),
      category: z.enum(ARTICLE_CATEGORIES).optional().describe('分类'),
      tags: z.array(z.string()).optional().describe('标签列表'),
      coverImage: clearableText().describe('封面图 URL 或图床文件名；传 null 表示不设置/清空'),
      aiSummary: clearableText().describe('AI 摘要；传 null 表示清空')
    },
    run: endpoint('POST', () => '/api/mcp/articles', { bodyKeys: ARTICLE_BODY_KEYS })
  },
  {
    name: 'article_update',
    description: '按 id 增量更新文章，只提交实际传入的字段。这会直接修改线上数据，内容变更后公开站需重建才生效。',
    inputSchema: {
      id: z.number().int().positive().describe('文章 id，只用于定位，不写入正文'),
      title: optionalText().describe('新标题'),
      contentMarkdown: optionalText().describe('新 Markdown 正文'),
      slug: optionalText().describe('新 slug'),
      category: z.enum(ARTICLE_CATEGORIES).optional().describe('新分类'),
      tags: z.array(z.string()).optional().describe('新标签列表（整体替换）'),
      coverImage: clearableText().describe('新封面图 URL 或图床文件名；传 null 清空'),
      aiSummary: clearableText().describe('新摘要；传 null 清空')
    },
    run: endpoint('PUT', args => `/api/mcp/articles/${args.id}`, { bodyKeys: ARTICLE_BODY_KEYS })
  },
  {
    name: 'article_delete',
    description: '⚠️ 危险且不可恢复：永久删除一篇文章及其数据库记录，会直接修改线上数据。图床里的图片文件不会被删除；公开站需重建后才会消失。必须传 confirm 且等于 id 才会执行。',
    inputSchema: {
      id: z.number().int().positive().describe('文章 id'),
      confirm: z.number().int().positive().describe('二次确认：必须与 id 完全相同，否则本地直接拒绝')
    },
    run: async (args, api) => {
      requireDeleteConfirm(args.confirm, args.id, '文章 id')
      return await api.request('DELETE', `/api/mcp/articles/${args.id}`)
    }
  },
  {
    name: 'article_summarize',
    description: '调用服务端 AI 生成文章摘要与建议 slug，不会写入数据库。返回结果后若需保存，请再调用 article_create / article_update。',
    inputSchema: {
      title: z.string().min(1).describe('文章标题'),
      content: z.string().min(1).max(80000).describe('用于生成摘要的文章正文，最长 80k 字符')
    },
    run: endpoint('POST', () => '/api/mcp/ai/summary', { bodyKeys: ['title', 'content'] })
  },
  {
    name: 'image_list',
    description: '列出图床里的图片文件（名称、大小、类型、公开 URL），支持按目录、关键词过滤。不会修改文章或画廊内容，但服务端会把列出的文件登记进图片资源表。',
    inputSchema: {
      dir: optionalText().describe('目录前缀'),
      search: z.string().min(1).max(200).optional().describe('关键词，最长 200 字'),
      start: z.number().int().nonnegative().optional().describe('起始偏移，默认 0'),
      count: z.number().int().positive().max(100).optional().describe('返回条数，默认 50，最大 100'),
      recursive: z.boolean().optional().describe('是否递归子目录')
    },
    run: endpoint('GET', () => '/api/mcp/images', { queryKeys: ['dir', 'search', 'start', 'count', 'recursive'] })
  },
  {
    name: 'image_upload',
    description: '把本机的一张图片上传到图床。上传后该文件会公开可访问，任何人拿到 URL 都能查看。只允许上传用户明确指定的图片文件（绝对路径，扩展名 .jpg/.jpeg/.png/.webp/.gif/.avif，单文件不超过 50 MB）。',
    inputSchema: {
      filePath: z.string().min(1).describe('本机图片的绝对路径')
    },
    // 先校验、后上传：坏路径必须在这里被拒绝，绝不能让 openAsBlob 先失败
    // （那个 TypeError 会被 formatApiError 误判成网络问题）。
    run: async (args, api) => await api.upload(validateUploadPath(args.filePath))
  },
  {
    name: 'gallery_list',
    description: '分页列出画廊条目（图片 URL、标签、排序值、是否启用）。只读。',
    inputSchema: {
      page: z.number().int().positive().optional().describe('页码，默认 1'),
      pageSize: z.number().int().positive().max(200).optional().describe('每页条数，默认 100，最大 200')
    },
    run: endpoint('GET', () => '/api/mcp/gallery', { queryKeys: PAGE_QUERY_KEYS })
  },
  {
    name: 'gallery_create',
    description: '新增一条画廊条目。这会直接修改线上数据，公开站需重建后才显示。',
    inputSchema: {
      imageUrl: z.string().min(1).describe('图片 URL 或图床文件名'),
      tag: optionalText().describe('分组标签'),
      sortOrder: z.number().int().nonnegative().optional().describe('排序值，越小越靠前（升序排列），默认追加到末尾'),
      isActive: z.boolean().optional().describe('是否启用，默认启用')
    },
    run: endpoint('POST', () => '/api/mcp/gallery', { bodyKeys: GALLERY_CREATE_BODY_KEYS })
  },
  {
    name: 'gallery_update',
    description: '按 id 更新画廊条目，只提交实际传入的字段。这会直接修改线上数据，公开站需重建后才生效。',
    inputSchema: {
      id: z.number().int().positive().describe('画廊条目 id，只用于定位，不写入条目'),
      imageUrl: optionalText().describe('新图片 URL 或图床文件名'),
      tag: optionalText().describe('新分组标签'),
      sortOrder: z.number().int().nonnegative().optional().describe('新排序值，越小越靠前（升序排列）'),
      isActive: z.boolean().optional().describe('新的启用状态'),
      createdAt: optionalText().describe('创建时间（ISO 8601），仅更新时生效')
    },
    run: endpoint('PATCH', args => `/api/mcp/gallery/${args.id}`, { bodyKeys: GALLERY_UPDATE_BODY_KEYS })
  },
  {
    name: 'gallery_delete',
    description: '⚠️ 危险且不可恢复：永久删除一条画廊条目，并删除图床里的原文件，会直接修改线上数据。文件仍被其他画廊项、文章封面或 Hero 引用时服务端会拒绝（409），记录保留。公开站需重建后才会更新。必须传 confirm 且等于 id 才会执行。',
    inputSchema: {
      id: z.number().int().positive().describe('画廊条目 id'),
      confirm: z.number().int().positive().describe('二次确认：必须与 id 完全相同，否则本地直接拒绝')
    },
    run: async (args, api) => {
      requireDeleteConfirm(args.confirm, args.id, '画廊 id')
      return await api.request('DELETE', `/api/mcp/gallery/${args.id}`)
    }
  },
  {
    name: 'diary_list',
    description: '分页列出日记元信息（日期、心情、天气、地点、是否公开），包含未公开的条目。只读。',
    inputSchema: {
      page: z.number().int().positive().optional().describe('页码，默认 1'),
      pageSize: z.number().int().positive().max(100).optional().describe('每页条数，默认 50，最大 100')
    },
    run: endpoint('GET', () => '/api/mcp/diary', { queryKeys: PAGE_QUERY_KEYS })
  },
  {
    name: 'diary_upsert',
    description: '按日期写入或覆盖某一天的日记，一天只有一条。这会直接修改线上数据。注意：不传 isPublic 时默认不公开；只有显式传 isPublic: true 才会发布到公开站（公开站需重建后可见）。',
    inputSchema: {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('日期，格式 YYYY-MM-DD'),
      contentMarkdown: z.string().min(1).describe('日记 Markdown 正文'),
      mood: optionalText().describe('心情'),
      weather: optionalText().describe('天气'),
      location: optionalText().describe('地点'),
      tags: z.array(z.string()).optional().describe('标签列表'),
      isPublic: z.boolean().optional().describe('是否公开，省略时为 false（不公开）')
    },
    run: endpoint('PUT', args => `/api/mcp/diary/${args.date}`, { bodyKeys: DIARY_BODY_KEYS })
  },
  {
    name: 'diary_delete',
    description: '⚠️ 危险且不可恢复：永久删除某一天的日记，会直接修改线上数据。公开站需重建后才会消失。必须传 confirm 且等于 date 才会执行。',
    inputSchema: {
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('日期，格式 YYYY-MM-DD'),
      confirm: z.string().min(1).describe('二次确认：必须与 date 完全相同，否则本地直接拒绝')
    },
    run: async (args, api) => {
      requireDeleteConfirm(args.confirm, args.date, '日期')
      return await api.request('DELETE', `/api/mcp/diary/${args.date}`)
    }
  },
  {
    name: 'rebuild_public_site',
    description: '触发公开站（nuxt-public）重新构建并发布。文章、画廊、日记等内容的变更要重建后才会出现在公开站；构建通常需要几分钟，期间公开站仍是旧内容。会修改线上数据。',
    inputSchema: {},
    run: endpoint('POST', () => '/api/mcp/ops/pages/deploy')
  }
]
